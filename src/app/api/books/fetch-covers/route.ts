import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books } from '@/lib/db/schema';
import { isNull, eq, count, and } from 'drizzle-orm';
import { fetchBookData } from '@/lib/fetchBookData';
import { requireApiUser } from '@/lib/auth/requireApiUser';

async function getRemainingCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(books)
    .where(and(eq(books.userId, userId), isNull(books.coverUrl)));
  return row?.count ?? 0;
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const remaining = await getRemainingCount(auth.userId);
    return NextResponse.json({ remaining });
  } catch (err) {
    console.error('GET /api/books/fetch-covers error:', err);
    return NextResponse.json({ error: 'Failed to get count' }, { status: 500 });
  }
}

export async function POST() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const booksWithoutCovers = await db
      .select({ id: books.id, title: books.title, author: books.author })
      .from(books)
      .where(and(eq(books.userId, auth.userId), isNull(books.coverUrl)))
      .limit(10);

    let fetched = 0;

    for (const book of booksWithoutCovers) {
      const { coverUrl, synopsis } = await fetchBookData(book.title, book.author);
      if (coverUrl || synopsis) {
        await db
          .update(books)
          .set({ coverUrl, synopsis })
          .where(eq(books.id, book.id));
        fetched++;
      }
    }

    const remaining = await getRemainingCount(auth.userId);
    return NextResponse.json({ fetched, remaining });
  } catch (err) {
    console.error('POST /api/books/fetch-covers error:', err);
    return NextResponse.json({ error: 'Failed to fetch covers' }, { status: 500 });
  }
}
