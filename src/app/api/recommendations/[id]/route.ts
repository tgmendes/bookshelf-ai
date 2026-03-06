import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recommendations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireApiUser } from '@/lib/auth/requireApiUser';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await db
      .delete(recommendations)
      .where(and(eq(recommendations.id, id), eq(recommendations.userId, auth.userId)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/recommendations/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete recommendation' }, { status: 500 });
  }
}
