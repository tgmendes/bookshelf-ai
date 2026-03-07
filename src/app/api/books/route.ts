import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { requireApiUser } from '@/lib/auth/requireApiUser';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const rows = await db
      .select()
      .from(books)
      .where(eq(books.userId, auth.userId))
      .orderBy(desc(books.dateAdded));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/books error:', err);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { title, author, shelf, coverUrl, synopsis, avgRating, yearPublished, pages, isbn13 } = body;

    if (!title || !author) {
      return NextResponse.json({ error: 'Title and author are required' }, { status: 400 });
    }

    const [row] = await db
      .insert(books)
      .values({
        userId: auth.userId,
        title,
        author,
        shelf: shelf ?? 'to-read',
        coverUrl: coverUrl ?? null,
        synopsis: synopsis ?? null,
        avgRating: avgRating ?? null,
        yearPublished: yearPublished ?? null,
        pages: pages ?? 0,
        isbn13: isbn13 ?? null,
        dateAdded: new Date().toISOString().split('T')[0],
      })
      .returning({ id: books.id });

    return NextResponse.json({ id: row.id });
  } catch (err) {
    console.error('POST /api/books error:', err);
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}
