import { NextResponse } from 'next/server';
import { requireApiUser } from './requireApiUser';

export async function requireApiAdmin(): Promise<
  { userId: string; email: string; role: string; error?: never } | { error: NextResponse; userId?: never; email?: never; role?: never }
> {
  const result = await requireApiUser();
  if (result.error) return result;
  if (result.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}
