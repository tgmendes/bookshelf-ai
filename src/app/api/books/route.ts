import { NextResponse } from 'next/server';
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
