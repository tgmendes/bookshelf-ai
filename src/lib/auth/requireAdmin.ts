import { redirect } from 'next/navigation';
import { requireUser } from './requireUser';

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'admin') redirect('/library');
  return user;
}
