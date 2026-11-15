import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { apiTokens } from '@/lib/db/schema';

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken() {
  const token = `os_${randomBytes(32).toString('hex')}`;
  return { token, tokenHash: hashToken(token), prefix: token.slice(0, 11) };
}

export async function authenticateToken(request: Request) {
  const match = /^Bearer (os_[a-f0-9]{64})$/i.exec(request.headers.get('authorization') ?? '');
  if (!match) return null;
  const [row] = await db.select({ userId: apiTokens.userId }).from(apiTokens)
    .where(eq(apiTokens.tokenHash, hashToken(match[1]))).limit(1);
  return row?.userId ?? null;
}
