import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireApiAdmin } from '@/lib/auth/requireApiAdmin';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  await db.delete(sessions).where(eq(sessions.userId, id));

  return NextResponse.json({ ok: true });
}
