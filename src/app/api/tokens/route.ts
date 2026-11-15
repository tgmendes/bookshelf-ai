import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiTokens } from '@/lib/db/schema';
import { requireApiUser } from '@/lib/auth/requireApiUser';
import { generateToken } from '@/lib/auth/apiToken';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const rows = await db.select({ id: apiTokens.id, name: apiTokens.name, prefix: apiTokens.prefix, createdAt: apiTokens.createdAt })
    .from(apiTokens).where(eq(apiTokens.userId, auth.userId)).orderBy(desc(apiTokens.createdAt));
  return Response.json(rows, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const parsed = z.object({ name: z.string().trim().min(1).max(100) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Supply a token name (1–100 characters).' }, { status: 400 });
  const { token, tokenHash, prefix } = generateToken();
  const [row] = await db.insert(apiTokens).values({ userId: auth.userId, name: parsed.data.name, tokenHash, prefix })
    .returning({ id: apiTokens.id, name: apiTokens.name, prefix: apiTokens.prefix, createdAt: apiTokens.createdAt });
  return Response.json({ ...row, token }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
