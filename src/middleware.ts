import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'bookshelf_session';

export function middleware(req: NextRequest) {
  const session = req.cookies.get(COOKIE_NAME)?.value;

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Cookie exists — real validation happens in requireUser/requireApiUser
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/library/:path*',
    '/stats/:path*',
    '/chat/:path*',
    '/settings/:path*',
    '/next-read/:path*',
    '/api/books/:path*',
    '/api/chat/:path*',
    '/api/recommendations/:path*',
  ],
};
