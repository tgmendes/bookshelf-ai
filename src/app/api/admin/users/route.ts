import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireApiAdmin } from '@/lib/auth/requireApiAdmin';

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return NextResponse.json(rows);
}
