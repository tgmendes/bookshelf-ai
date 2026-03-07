import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books, bookLabels, labels } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireApiUser } from '@/lib/auth/requireApiUser';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id: labelId } = await params;

  // Verify the label belongs to this user
  const [label] = await db
    .select({ id: labels.id })
    .from(labels)
    .where(and(eq(labels.id, labelId), eq(labels.userId, auth.userId)))
    .limit(1);

  if (!label) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  const { bookIds }: { bookIds: string[] } = await req.json();
  if (!Array.isArray(bookIds) || bookIds.length === 0) {
    return NextResponse.json({ error: 'bookIds must be a non-empty array' }, { status: 400 });
  }

  // Verify all books belong to this user
  const userBooks = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.userId, auth.userId), inArray(books.id, bookIds)));
  const validBookIds = new Set(userBooks.map((b) => b.id));

  const toInsert = bookIds
    .filter((id) => validBookIds.has(id))
    .map((bookId) => ({ bookId, labelId }));

  if (toInsert.length > 0) {
    await db
      .insert(bookLabels)
      .values(toInsert)
      .onConflictDoNothing();
  }

  return NextResponse.json({ assigned: toInsert.length });
}
