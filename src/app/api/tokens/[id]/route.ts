import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiTokens } from '@/lib/db/schema';
import { requireApiUser } from '@/lib/auth/requireApiUser';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: 'Invalid token id' }, { status: 400 });
  const rows = await db.delete(apiTokens).where(and(eq(apiTokens.id, id), eq(apiTokens.userId, auth.userId))).returning({ id: apiTokens.id });
  return Response.json({ revoked: rows.length > 0 });
}
