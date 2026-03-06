import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { siteConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireApiAdmin } from '@/lib/auth/requireApiAdmin';

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const rows = await db.select().from(siteConfig);
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }

  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  const { key, value } = await request.json();

  if (typeof key !== 'string' || typeof value !== 'string') {
    return NextResponse.json({ error: 'key and value are required strings' }, { status: 400 });
  }

  await db
    .insert(siteConfig)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteConfig.key,
      set: { value, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
