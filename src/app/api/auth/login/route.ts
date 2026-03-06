import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { magicLinks } from '@/lib/db/schema';
import { isEmailAllowed } from '@/lib/auth/allowlist';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    if (!isEmailAllowed(normalized)) {
      return NextResponse.json({ error: 'This email is not allowed' }, { status: 403 });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(magicLinks).values({
      email: normalized,
      token,
      expiresAt,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const link = `${appUrl}/api/auth/verify?token=${token}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Bookshelf <onboarding@resend.dev>',
      to: normalized,
      subject: 'Sign in to Bookshelf',
      html: `
        <h2>Sign in to Bookshelf</h2>
        <p>Click the link below to sign in. This link expires in 15 minutes.</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#0d9488;color:#fff;text-decoration:none;border-radius:8px;">
          Sign in to Bookshelf
        </a>
        <p style="margin-top:16px;color:#666;">If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 });
  }
}
