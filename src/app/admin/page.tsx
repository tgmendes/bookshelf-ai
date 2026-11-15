import { db } from '@/lib/db';
import { users, siteConfig } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { AdminDashboard } from './AdminDashboard';

export default async function AdminPage() {
  await requireAdmin();

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  const configRows = await db.select().from(siteConfig);
  const config: Record<string, string> = {};
  for (const row of configRows) {
    config[row.key] = row.value;
  }

  return (
    <div className="room-wrap py-14">
      <h1 className="font-display text-[44px] font-light mb-6">Admin Dashboard</h1>
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
