import { db } from '@/lib/db';
import { siteConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function isEmailAllowed(email: string): Promise<boolean> {
  // Check DB first
  const row = await db
    .select({ value: siteConfig.value })
    .from(siteConfig)
    .where(eq(siteConfig.key, 'allowed_emails'))
    .limit(1);

  const allowed = row[0]?.value ?? process.env.ALLOWED_EMAILS ?? '';
  if (!allowed) return false;

  const list = allowed.split(',').map((e) => e.trim().toLowerCase());
  return list.includes(email.toLowerCase());
}
