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
  const { id: bookId } = await params;

  // Verify the book belongs to this user
  const [book] = await db
    .select({ id: books.id })
    .from(books)
    .where(and(eq(books.id, bookId), eq(books.userId, auth.userId)))
    .limit(1);

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const { labelIds }: { labelIds: string[] } = await req.json();
  if (!Array.isArray(labelIds)) {
    return NextResponse.json({ error: 'labelIds must be an array' }, { status: 400 });
  }

  // Get current assignments
  const current = await db
    .select({ labelId: bookLabels.labelId })
    .from(bookLabels)
    .where(eq(bookLabels.bookId, bookId));
  const currentIds = new Set(current.map((r) => r.labelId));
  const desiredIds = new Set(labelIds);

  // Delete removed
  const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));
  if (toRemove.length > 0) {
    await db
      .delete(bookLabels)
      .where(and(eq(bookLabels.bookId, bookId), inArray(bookLabels.labelId, toRemove)));
  }

  // Insert added
  const toAdd = [...desiredIds].filter((id) => !currentIds.has(id));
  if (toAdd.length > 0) {
    await db.insert(bookLabels).values(
      toAdd.map((labelId) => ({ bookId, labelId }))
    );
  }

  // Return updated labels
  const updated = await db
    .select({ id: labels.id, name: labels.name, color: labels.color })
    .from(bookLabels)
    .innerJoin(labels, eq(bookLabels.labelId, labels.id))
    .where(eq(bookLabels.bookId, bookId));

  return NextResponse.json(updated);
}
