import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, verifyToken } from '@/lib/session';

// Everything except the login page, the cron endpoint (own secret), the blob upload
// handshake (checks the cookie itself) and PWA assets requires the login cookie.
export async function proxy(req: NextRequest) {
  if (await verifyToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!login|api/login|api/cron|api/blob/upload|_next/|icons/|manifest.webmanifest|sw.js|favicon.ico).*)',
  ],
};
