import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from '@/lib/db';
import { books, bookLabels, labels } from '@/lib/db/schema';
import { buildSystemPrompt } from '@/lib/buildSystemPrompt';
import { desc, eq } from 'drizzle-orm';
import type { Book } from '@/lib/types';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { checkAiLimit } from '@/lib/auth/rateLimit';

export const maxDuration = 30;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

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

    // Build system prompt from user's library
    const libraryRows = await db
      .select()
      .from(books)
      .where(eq(books.userId, auth.userId))
      .orderBy(desc(books.dateAdded));
    const library = libraryRows.map((r) => ({
      ...r,
      myRating: r.myRating ?? 0,
      pages: r.pages ?? 0,
    })) as Book[];

    // Fetch labels for user's books
    const labelRows = await db
      .select({ bookId: bookLabels.bookId, labelName: labels.name })
      .from(bookLabels)
      .innerJoin(labels, eq(bookLabels.labelId, labels.id))
      .where(eq(labels.userId, auth.userId));

    const labelsByBookId: Record<string, string[]> = {};
    for (const row of labelRows) {
      if (!labelsByBookId[row.bookId]) labelsByBookId[row.bookId] = [];
      labelsByBookId[row.bookId].push(row.labelName);
    }

    const systemPrompt = buildSystemPrompt(library, labelsByBookId);

    const { object } = await generateObject({
      model: openrouter('anthropic/claude-3.5-haiku'),
      mode: 'json',
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
