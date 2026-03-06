import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { magicLinks, users } from '@/lib/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { createSession, sessionCookieOptions } from '@/lib/auth/session';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${appUrl}/login?error=missing_token`);
  }

  try {
    // Find valid, unused magic link
    const rows = await db
      .select()
      .from(magicLinks)
      .where(
        and(
          eq(magicLinks.token, token),
          gt(magicLinks.expiresAt, new Date()),
          isNull(magicLinks.usedAt)
        )
      )
      .limit(1);

    const link = rows[0];
    if (!link) {
      return NextResponse.redirect(`${appUrl}/login?error=invalid_token`);
    }

    // Mark as used
    await db
      .update(magicLinks)
      .set({ usedAt: new Date() })
      .where(eq(magicLinks.id, link.id));

    // Find or create user
    let userRows = await db
      .select()
      .from(users)
      .where(eq(users.email, link.email))
      .limit(1);

    if (!userRows[0]) {
      userRows = await db
        .insert(users)
        .values({ email: link.email })
        .returning();
    }

    const user = userRows[0];

    // Create session and set cookie
    const sessionId = await createSession(user.id);
    const cookieStore = await cookies();
    const opts = sessionCookieOptions();
    cookieStore.set(opts.name, sessionId, opts);

    return NextResponse.redirect(`${appUrl}/library`);
  } catch (err) {
    console.error('GET /api/auth/verify error:', err);
    return NextResponse.redirect(`${appUrl}/login?error=server_error`);
  }
}
