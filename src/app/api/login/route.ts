import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { checkPassword } from '@/lib/auth';
import { COOKIE, SESSION_DAYS, createSessionToken, sessionConfigured } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sessionConfigured()) {
    return NextResponse.json(
      { error: 'Server is not configured: set APP_PASSWORD and a 32+ character SESSION_SECRET.' },
      { status: 500 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };

  // Throttle guessing: 8 wrong attempts in 10 minutes pauses logins for the rest of that window.
  const recent = await q<{ n: number }>(
    `select count(*)::int as n from login_failures where ts > now() - interval '10 minutes'`,
  );
  if (recent[0].n >= 8) {
    return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
  }

  if (typeof body.password === 'string' && checkPassword(body.password)) {
    await q('delete from login_failures');
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, await createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * SESSION_DAYS,
    });
    return res;
  }

  await q('insert into login_failures default values');
  await new Promise((r) => setTimeout(r, 700));
  return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
}
