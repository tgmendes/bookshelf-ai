import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { buildSystemPrompt } from '@/lib/buildSystemPrompt';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { checkAiLimit } from '@/lib/auth/rateLimit';
import { openrouter } from '@/lib/openrouter';
import { fetchUserLibraryWithLabels } from '@/lib/fetchUserLibrary';

export const maxDuration = 30;

const recommendationSchema = z.object({
  books: z.array(
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

  const { allowed } = await checkAiLimit(auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily AI limit reached. Try again tomorrow.' },
      { status: 429 }
    );
  }

  try {
    const { prompt }: { prompt: string } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
    }

    const { library, labelsByBookId } = await fetchUserLibraryWithLabels(auth.userId);
    const systemPrompt = buildSystemPrompt(library, labelsByBookId);

    const { object } = await generateObject({
      model: openrouter('anthropic/claude-3.5-haiku'),
      system: `${systemPrompt}

## Task
You are generating structured book recommendations. Return exactly 5 books that match the user's request. Each book must include:
- title: the book's full title
- author: the author's full name
- reason: 1-2 sentences explaining why this book fits the request and the user's taste (keep it warm and personal)
- pages: approximate page count (if you know it)
- rating: the book's general rating out of 5 (e.g. 4.2) if you know it

IMPORTANT: Never recommend books the user has already read, is currently reading, or has on their want-to-read list.`,
      prompt,
      schema: recommendationSchema,
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error('Discover route error:', err);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
