import { NextResponse } from 'next/server';
import { getSession } from './session';

export async function requireApiUser(): Promise<
  { userId: string; email: string; role: string; error?: never } | { error: NextResponse; userId?: never; email?: never; role?: never }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return session;
}
