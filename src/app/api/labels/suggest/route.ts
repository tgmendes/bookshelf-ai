import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/db';
import { books } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { checkAiLimit } from '@/lib/auth/rateLimit';
import { openrouter } from '@/lib/openrouter';
import { getCached, setCached, libraryFingerprint, withDedup } from '@/lib/aiCache';

export const maxDuration = 30;

const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

const LABEL_COLORS = [
  '#CF5F55', '#E57373', '#BA68C8', '#9C6C9E',
  '#5987AC', '#7986CB', '#4DB6AC', '#8BA668',
  '#81C784', '#B58957', '#FFB74D', '#F06292',
];

const suggestSchema = z.object({
  labels: z.array(
    z.object({
      name: z.string(),
      colorIndex: z.number(),
      // Indices into the book list (1-based) rather than full UUIDs
      bookIndices: z.array(z.number()),
    })
  ),
});

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
  }

  try {
    const allBooks = await db
      .select()
      .from(books)
      .where(eq(books.userId, auth.userId));

    if (allBooks.length === 0) {
      return NextResponse.json({ labels: [] });
    }

    const fingerprint = libraryFingerprint(allBooks);
    const cacheKey = `labels:suggest:${fingerprint}`;

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
      // Use 1-based numeric indices instead of UUIDs to minimize prompt tokens
      const bookList = allBooks
        .map((b, i) => {
          const parts = [`${i + 1}`, `"${b.title}" by ${b.author}`, b.shelf];
          if (b.myRating && b.myRating > 0) parts.push(`★${b.myRating}`);
          return parts.join(' | ');
        })
        .join('\n');

      const { object } = await generateObject({
        model: openrouter('anthropic/claude-3.5-haiku'),
        system: `You are a librarian organising a personal book collection into categories.

Suggest 5-7 label categories that best organise this collection. Each label should:
- Have a clear, concise name (1-3 words, e.g. "Literary Fiction", "Sci-Fi", "Memoir", "Fantasy", "Historical")
- List the 1-based row numbers of all books that belong to that category (bookIndices)
- Use a different colorIndex (0-${LABEL_COLORS.length - 1}) for each label
- A book can appear in multiple labels
- Only create a label if at least 3 books match

IMPORTANT: You must respond with a valid JSON object only — no prose, no explanation, no markdown.`,
        prompt: `Organise these ${allBooks.length} books into labels:\n\n${bookList}`,
        schema: suggestSchema,
        abortSignal: req.signal,
        experimental_repairText: async ({ text }) => {
          const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
          const match = stripped.match(/\{[\s\S]*\}/);
          return match ? match[0] : null;
        },
      });

      // Map indices back to real book IDs
      const labels = object.labels.map((l) => {
        const bookIds = l.bookIndices
          .map((idx) => allBooks[idx - 1]?.id)
          .filter((id): id is string => !!id);
        return {
          name: l.name,
          color: LABEL_COLORS[l.colorIndex % LABEL_COLORS.length],
          bookIds,
          count: bookIds.length,
        };
      });

      const payload = { labels };
      setCached(auth.userId, cacheKey, payload, TTL_MS).catch(console.error);
      return payload;
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Label suggest error:', err);
    return NextResponse.json({ error: 'Failed to suggest labels' }, { status: 500 });
  }
}
