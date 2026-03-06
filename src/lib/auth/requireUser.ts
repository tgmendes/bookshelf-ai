import { redirect } from 'next/navigation';
import { getSession } from './session';

export async function requireUser(): Promise<{ userId: string; email: string }> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
