import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatMessages } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { requireApiUser } from '@/lib/auth/requireApiUser';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  try {
    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, auth.userId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(100);

    const messages = rows.map((r) => ({
      id: r.id,
      role: r.role as 'user' | 'assistant',
      parts: [{ type: 'text' as const, text: r.content }],
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    return NextResponse.json(messages);
  } catch (err) {
    console.error('GET /api/chat/history error:', err);
    return NextResponse.json([], { status: 500 });
  }
}
