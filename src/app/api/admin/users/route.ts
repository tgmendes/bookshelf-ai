import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, aiUsage } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireApiAdmin } from '@/lib/auth/requireApiAdmin';

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      aiUnlimited: users.aiUnlimited,
      createdAt: users.createdAt,
      aiUsageToday: sql<number>`coalesce((select ${aiUsage.count} from ${aiUsage} where ${aiUsage.userId} = ${users.id} and ${aiUsage.date} = ${today}), 0)`,
    })
    .from(users)
    .orderBy(users.createdAt);

  return NextResponse.json(rows);
}
