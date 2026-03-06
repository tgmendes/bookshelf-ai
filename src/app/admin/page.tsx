import { db } from '@/lib/db';
import { users, aiUsage, siteConfig } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { AdminDashboard } from './AdminDashboard';

export default async function AdminPage() {
  await requireAdmin();

  const today = new Date().toISOString().slice(0, 10);

  const userRows = await db
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

  const configRows = await db.select().from(siteConfig);
  const config: Record<string, string> = {};
  for (const row of configRows) {
    config[row.key] = row.value;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-display text-3xl mb-6">Admin Dashboard</h1>
      <AdminDashboard
        initialUsers={userRows.map((u) => ({
          ...u,
          createdAt: u.createdAt?.toISOString() ?? null,
        }))}
        initialConfig={config}
      />
    </div>
  );
}
