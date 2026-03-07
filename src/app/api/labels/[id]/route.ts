import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { labels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireApiUser } from '@/lib/auth/requireApiUser';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id } = await params;

  const { name, color } = await req.json();
  if (!name?.trim() && !color?.trim()) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (name?.trim()) updates.name = name.trim();
  if (color?.trim()) updates.color = color.trim();

  const [row] = await db
    .update(labels)
    .set(updates)
    .where(and(eq(labels.id, id), eq(labels.userId, auth.userId)))
    .returning({ id: labels.id, name: labels.name, color: labels.color });

  if (!row) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id } = await params;

  const [row] = await db
    .delete(labels)
    .where(and(eq(labels.id, id), eq(labels.userId, auth.userId)))
    .returning({ id: labels.id });

  if (!row) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
