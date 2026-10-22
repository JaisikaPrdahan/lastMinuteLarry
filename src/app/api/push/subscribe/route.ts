import { NextResponse } from 'next/server';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface SubBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as SubBody;
  if (!b.endpoint || !b.keys?.p256dh || !b.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }
  await q(
    `insert into push_subscriptions (endpoint, p256dh, auth) values ($1, $2, $3)
     on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth`,
    [b.endpoint, b.keys.p256dh, b.keys.auth],
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const b = (await req.json().catch(() => ({}))) as SubBody;
  if (b.endpoint) await q('delete from push_subscriptions where endpoint = $1', [b.endpoint]);
  return NextResponse.json({ ok: true });
}
