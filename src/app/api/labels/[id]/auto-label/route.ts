import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books, labels, bookLabels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { checkAiLimit } from '@/lib/auth/rateLimit';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { allowed } = await checkAiLimit(auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily AI limit reached. Try again tomorrow.' },
      { status: 429 }
    );
  }

  const { id: labelId } = await params;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
  }

  // Get the label
  const [label] = await db
    .select()
    .from(labels)
    .where(and(eq(labels.id, labelId), eq(labels.userId, auth.userId)))
    .limit(1);

  if (!label) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  // Get all user books
  const allBooks = await db
    .select()
    .from(books)
    .where(eq(books.userId, auth.userId));

  // Get existing assignments for this label
  const existing = await db
    .select({ bookId: bookLabels.bookId })
    .from(bookLabels)
    .where(eq(bookLabels.labelId, labelId));
  const existingIds = new Set(existing.map((r) => r.bookId));

  // Build book list for prompt
  const bookList = allBooks
    .map((b) => {
      const parts = [
        `id:${b.id}`,
        `"${b.title}" by ${b.author}`,
        `shelf:${b.shelf}`,
      ];
      if (b.myRating && b.myRating > 0) parts.push(`rating:${b.myRating}/5`);
      if (b.bookshelves?.length) parts.push(`shelves:${b.bookshelves.join(',')}`);
      if (b.synopsis) parts.push(`synopsis:${b.synopsis.slice(0, 150)}`);
      if (existingIds.has(b.id)) parts.push('(already labeled)');
      return parts.join(' | ');
    })
    .join('\n');

  const prompt = `You are a book librarian. The user has a label called "${label.name}".

Analyze these books and return a JSON array of book IDs that should have this label. Only include books that clearly match the label. Do NOT include books marked "(already labeled)".

Books:
${bookList}

Respond ONLY with a JSON array of ID strings, no markdown, no explanation. Example:
["uuid-1","uuid-2"]

If no books match, respond with an empty array: []`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bookshelf-ai.vercel.app',
        'X-Title': 'BookShelf AI',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error('OpenRouter error:', await res.text());
      return NextResponse.json({ error: 'AI request failed' }, { status: 502 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '[]';
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const bookIds: string[] = JSON.parse(jsonStr);

    // Validate against actual user book IDs
    const validBookIds = new Set(allBooks.map((b) => b.id));
    const filtered = bookIds.filter((id) => validBookIds.has(id) && !existingIds.has(id));

    // Batch insert
    if (filtered.length > 0) {
      await db
        .insert(bookLabels)
        .values(filtered.map((bookId) => ({ bookId, labelId })))
        .onConflictDoNothing();
    }

    return NextResponse.json({ assigned: filtered.length, bookIds: filtered });
  } catch (err) {
    console.error('Auto-label error:', err);
    return NextResponse.json({ error: 'Failed to auto-label' }, { status: 500 });
  }
}
