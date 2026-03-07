import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { labels } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireApiUser } from '@/lib/auth/requireApiUser';

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const rows = await db
    .select({ id: labels.id, name: labels.name, color: labels.color })
    .from(labels)
    .where(eq(labels.userId, auth.userId))
    .orderBy(asc(labels.name));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { name, color } = await req.json();
  if (!name?.trim() || !color?.trim()) {
    return NextResponse.json({ error: 'Name and color are required' }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(labels)
      .values({ userId: auth.userId, name: name.trim(), color: color.trim() })
      .returning({ id: labels.id, name: labels.name, color: labels.color });

    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('unique')) {
      return NextResponse.json({ error: 'Label name already exists' }, { status: 409 });
    }
    throw err;
  }
}
