import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books } from '@/lib/db/schema';
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

  const { id } = await params;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
  }

  const rows = await db
    .select()
    .from(books)
    .where(and(eq(books.id, id), eq(books.userId, auth.userId)))
    .limit(1);
  const book = rows[0];
  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  // Get all titles in the user's library to exclude
  const allBooks = await db
    .select({ title: books.title, author: books.author })
    .from(books)
    .where(eq(books.userId, auth.userId));
  const excludeList = allBooks.map((b) => `"${b.title}" by ${b.author}`).join('\n');

  const prompt = `Given the book "${book.title}" by ${book.author}, recommend exactly 5 similar books that a fan would enjoy. For each book, provide:
- title (string)
- author (string)
- reason (one sentence why it's similar)

IMPORTANT: Do NOT recommend any of these books, as the user already has them:
${excludeList}

Respond ONLY with a JSON array, no markdown, no explanation. Example:
[{"title":"Book Name","author":"Author Name","reason":"Short reason"}]`;

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
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      console.error('OpenRouter error:', await res.text());
      return NextResponse.json({ error: 'AI request failed' }, { status: 502 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '[]';

    // Parse the JSON from the response (handle possible markdown wrapping)
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const recommendations = JSON.parse(jsonStr);

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error('Similar books error:', err);
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
}
