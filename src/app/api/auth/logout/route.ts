import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession, COOKIE_NAME } from '@/lib/auth/session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(COOKIE_NAME)?.value;

    if (sessionId) {
      await deleteSession(sessionId);
    }

    cookieStore.delete(COOKIE_NAME);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/logout error:', err);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
