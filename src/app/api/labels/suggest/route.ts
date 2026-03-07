import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from '@/lib/db';
import { books } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { checkAiLimit } from '@/lib/auth/rateLimit';

export const maxDuration = 30;

const LABEL_COLORS = [
  '#CF5F55', '#E57373', '#BA68C8', '#9C6C9E',
  '#5987AC', '#7986CB', '#4DB6AC', '#8BA668',
  '#81C784', '#B58957', '#FFB74D', '#F06292',
];

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const suggestSchema = z.object({
  labels: z.array(
    z.object({
      name: z.string(),
      colorIndex: z.number(),
      bookIds: z.array(z.string()),
    })
  ),
});

export async function POST() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { allowed } = await checkAiLimit(auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily AI limit reached. Try again tomorrow.' },
      { status: 429 }
    );
  }

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

    const bookList = allBooks
      .map((b) => {
        const parts = [`id:${b.id}`, `"${b.title}" by ${b.author}`, `shelf:${b.shelf}`];
        if (b.myRating && b.myRating > 0) parts.push(`rating:${b.myRating}/5`);
        if (b.bookshelves?.length) parts.push(`shelves:${b.bookshelves.join(',')}`);
        if (b.synopsis) parts.push(`synopsis:${b.synopsis.slice(0, 100)}`);
        return parts.join(' | ');
      })
      .join('\n');

    const { object } = await generateObject({
      model: openrouter('anthropic/claude-3.5-haiku'),
      system: `You are a librarian organising a personal book collection into categories.

Analyse the book list and suggest 5-7 label categories that best organise this collection. Each label should:
- Have a clear, concise name (1-3 words, e.g. "Literary Fiction", "Sci-Fi", "Memoir", "Fantasy", "Historical")
- Include the IDs of all books that belong to that category
- Use a different colorIndex (0-${LABEL_COLORS.length - 1}) for each label — pick indices that feel thematically appropriate
- A book can belong to multiple labels
- Focus on genre/theme categories that are actually represented in the collection
- Don't create a label if fewer than 3 books would match it`,
      prompt: `Organise these ${allBooks.length} books into labels:\n\n${bookList}`,
      schema: suggestSchema,
    });

    // Map colorIndex to actual hex colors and add count
    const result = object.labels.map((l) => {
      const validBookIds = l.bookIds.filter((id) =>
        allBooks.some((b) => b.id === id)
      );
      return {
        name: l.name,
        color: LABEL_COLORS[l.colorIndex % LABEL_COLORS.length],
        bookIds: validBookIds,
        count: validBookIds.length,
      };
    });

    return NextResponse.json({ labels: result });
  } catch (err) {
    console.error('Label suggest error:', err);
    return NextResponse.json({ error: 'Failed to suggest labels' }, { status: 500 });
  }
}
