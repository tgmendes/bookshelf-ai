import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { books } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireApiUser } from '@/lib/auth/requireApiUser';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await req.json();
  const { shelf, myRating } = body as { shelf?: string; myRating?: number | null };

  const updates: Record<string, unknown> = {};
  if (shelf !== undefined) updates.shelf = shelf;
  if (myRating !== undefined) updates.myRating = myRating;
  if (shelf === 'read' && !('dateRead' in body)) {
    updates.dateRead = new Date().toISOString().split('T')[0];
  }
  if ('dateRead' in body) updates.dateRead = body.dateRead;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    await db
      .update(books)
      .set(updates)
      .where(and(eq(books.id, id), eq(books.userId, auth.userId)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/books/[id] error:', err);
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}
