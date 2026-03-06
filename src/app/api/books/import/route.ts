import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import type { BookImportRow } from '@/lib/types';
import { requireApiUser } from '@/lib/auth/requireApiUser';

export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const body: BookImportRow[] = await req.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: 'No books provided' }, { status: 400 });
    }

    for (const book of body) {
      await db
        .insert(books)
        .values({
          userId: auth.userId,
          goodreadsBookId: book.goodreadsBookId || null,
          isbn13: book.isbn13 || null,
          title: book.title,
          author: book.author,
          myRating: book.myRating,
          avgRating: book.avgRating,
          dateRead: book.dateRead,
          dateAdded: book.dateAdded,
          shelf: book.shelf,
          pages: book.pages,
          yearPublished: book.yearPublished,
          bookshelves: book.bookshelves,
        })
        .onConflictDoUpdate({
          target: [books.goodreadsBookId, books.userId],
          set: {
            title: book.title,
            author: book.author,
            isbn13: book.isbn13 || null,
            myRating: book.myRating,
            avgRating: book.avgRating,
            dateRead: book.dateRead,
            shelf: book.shelf,
            pages: book.pages,
            yearPublished: book.yearPublished,
            bookshelves: book.bookshelves,
            updatedAt: sql`now()`,
          },
        });
    }

    return NextResponse.json({ imported: body.length });
  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
