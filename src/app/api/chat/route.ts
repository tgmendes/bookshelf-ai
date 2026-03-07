import { NextResponse } from 'next/server';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from '@/lib/db';
import { books, chatMessages, bookLabels, labels } from '@/lib/db/schema';
import { buildSystemPrompt } from '@/lib/buildSystemPrompt';
import { desc, eq } from 'drizzle-orm';
import type { Book } from '@/lib/types';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { checkAiLimit } from '@/lib/auth/rateLimit';

export const maxDuration = 30;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
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
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (!messages?.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
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

    // Save user message
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg.role === 'user') {
      const textContent = lastUserMsg.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? '';
      if (textContent) {
        await db.insert(chatMessages).values({
          userId: auth.userId,
          role: 'user',
          content: textContent,
        });
      }
    }

    const result = streamText({
      model: openrouter('anthropic/claude-3.5-haiku'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      onFinish: async ({ text }) => {
        if (text) {
          await db.insert(chatMessages).values({
            userId: auth.userId,
            role: 'assistant',
            content: text,
          }).catch(console.error);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error('Chat route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
