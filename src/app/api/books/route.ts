import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db.select().from(books).orderBy(desc(books.dateAdded));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/books error:', err);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}
