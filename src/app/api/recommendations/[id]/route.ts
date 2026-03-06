import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recommendations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(recommendations).where(eq(recommendations.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/recommendations/[id] error:', err);
    return NextResponse.json({ error: 'Failed to delete recommendation' }, { status: 500 });
  }
}
