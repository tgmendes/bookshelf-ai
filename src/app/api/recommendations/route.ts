import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recommendations } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(recommendations)
      .orderBy(desc(recommendations.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    console.error('GET /api/recommendations error:', err);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, author, reason, coverUrl, synopsis } = body;

    if (!title || !author) {
      return NextResponse.json({ error: 'title and author are required' }, { status: 400 });
    }

    const [inserted] = await db
      .insert(recommendations)
      .values({
        title,
        author,
        reason: reason ?? '',
        coverUrl: coverUrl ?? null,
        synopsis: synopsis ?? null,
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    console.error('POST /api/recommendations error:', err);
    return NextResponse.json({ error: 'Failed to save recommendation' }, { status: 500 });
  }
}
