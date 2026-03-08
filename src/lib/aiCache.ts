import { db } from '@/lib/db';
import { aiCache } from '@/lib/db/schema';
import { and, eq, gt } from 'drizzle-orm';

// --- Library fingerprint ---
// Changes whenever a book is added, removed, re-rated, or moved shelf.

export function libraryFingerprint(
  books: Array<{ id: string; myRating: number | null; shelf: string }>
): string {
  const sorted = [...books].sort((a, b) => a.id.localeCompare(b.id));
  const str = sorted.map((b) => `${b.id}:${b.myRating ?? 0}:${b.shelf}`).join(',');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// --- DB result cache ---

export async function getCached(userId: string, cacheKey: string): Promise<unknown | null> {
  const rows = await db
    .select({ result: aiCache.result })
    .from(aiCache)
    .where(
      and(
        eq(aiCache.userId, userId),
        eq(aiCache.cacheKey, cacheKey),
        gt(aiCache.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!rows[0]) return null;
  try {
    return JSON.parse(rows[0].result);
  } catch {
    return null;
  }
}

export async function setCached(
  userId: string,
  cacheKey: string,
  result: unknown,
  ttlMs: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  await db
    .insert(aiCache)
    .values({ userId, cacheKey, result: JSON.stringify(result), expiresAt })
    .onConflictDoUpdate({
      target: [aiCache.userId, aiCache.cacheKey],
      set: { result: JSON.stringify(result), expiresAt },
    });
}

// --- In-flight deduplication ---
// Within the same warm serverless instance, prevents two identical concurrent
// requests from both firing an AI call.

const inFlight = new Map<string, Promise<unknown>>();

export function withDedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
