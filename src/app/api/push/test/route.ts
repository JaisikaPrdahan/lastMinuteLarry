import { NextResponse } from 'next/server';
import { pushConfigured, sendPushToAll } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!pushConfigured()) {
    return NextResponse.json(
      { error: 'Push is not configured on the server (set the VAPID keys and redeploy).' },
      { status: 500 },
    );
  }
  const r = await sendPushToAll({ title: 'Tracker', body: 'Notifications are working on this device.', tag: 'test' });
  return NextResponse.json({ ok: r.sent > 0, ...r });
}
