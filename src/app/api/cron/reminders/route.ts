import { NextResponse } from 'next/server';
import { runReminders } from '@/lib/reminders';

export const dynamic = 'force-dynamic';

// Hit by Vercel Cron (it sends `Authorization: Bearer $CRON_SECRET`) or by any external pinger.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await runReminders());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
