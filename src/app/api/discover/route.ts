import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { buildDiscoverSystemPrompt } from '@/lib/buildSystemPrompt';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { checkAiLimit } from '@/lib/auth/rateLimit';
import { openrouter } from '@/lib/openrouter';
import { fetchUserLibraryWithLabels } from '@/lib/fetchUserLibrary';
import { getCached, setCached, libraryFingerprint, withDedup } from '@/lib/aiCache';

export const maxDuration = 30;

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const recommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string(),
      author: z.string(),
      reason: z.string(),
      pages: z.number().optional(),
      rating: z.number().optional(),
    })
  ),
});

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const { prompt }: { prompt: string } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
    }

    const { library } = await fetchUserLibraryWithLabels(auth.userId);
    const fingerprint = libraryFingerprint(library);
    const cacheKey = `discover:${fingerprint}:${prompt.trim().toLowerCase().slice(0, 100)}`;

    // Serve from cache — does NOT consume rate limit
    const cached = await getCached(auth.userId, cacheKey);
    if (cached) return NextResponse.json(cached);

    // Only check rate limit when we're actually going to call AI
    const { allowed } = await checkAiLimit(auth.userId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Daily AI limit reached. Try again tomorrow.' },
        { status: 429 }
      );
    }

    const result = await withDedup(`${auth.userId}:${cacheKey}`, async () => {
      const systemPrompt = buildDiscoverSystemPrompt(library);

      const { object } = await generateObject({
        model: openrouter('anthropic/claude-3.5-haiku'),
        system: `${systemPrompt}

## Task
Return exactly 5 book recommendations. Each must include title, author, and a warm 1-2 sentence reason explaining why it fits the reader's taste.
IMPORTANT: You must respond with a valid JSON object only — no prose, no explanation, no markdown.`,
        prompt,
        schema: recommendationSchema,
        abortSignal: req.signal,
        experimental_repairText: async ({ text }) => {
          const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
          const match = stripped.match(/\{[\s\S]*\}/);
          return match ? match[0] : null;
        },
      });

      // Cache result — fire-and-forget, don't block the response
      setCached(auth.userId, cacheKey, object, TTL_MS).catch(console.error);

      return object;
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Discover route error:', err);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
