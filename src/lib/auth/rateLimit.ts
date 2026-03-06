import { db } from '@/lib/db';
import { aiUsage, users, siteConfig } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const DEFAULT_DAILY_LIMIT = 20;

export async function checkAiLimit(
  userId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  // Check if user has unlimited access via DB column
  const [user] = await db
    .select({ aiUnlimited: users.aiUnlimited })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.aiUnlimited) {
    return { allowed: true, remaining: Infinity };
  }

  // Read daily limit from siteConfig, fall back to env var
  const [configRow] = await db
    .select({ value: siteConfig.value })
    .from(siteConfig)
    .where(eq(siteConfig.key, 'ai_daily_limit'))
    .limit(1);

  const limit = parseInt(configRow?.value ?? process.env.AI_DAILY_LIMIT ?? '', 10) || DEFAULT_DAILY_LIMIT;
  const today = new Date().toISOString().slice(0, 10);

  const [row] = await db
    .insert(aiUsage)
    .values({ userId, date: today, count: 1 })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.date],
      set: { count: sql`${aiUsage.count} + 1` },
    })
    .returning({ count: aiUsage.count });

  const currentCount = row.count;
  if (currentCount > limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit - currentCount };
}
