import webpush from 'web-push';
import { q } from './db';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export function pushConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
}

let ready = false;
function init() {
  if (ready) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  ready = true;
}

interface SubRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Send a notification to every device that has enabled push. Dead subscriptions are removed. */
export async function sendPushToAll(payload: PushPayload) {
  if (!pushConfigured()) return { sent: 0, removed: 0, failed: 0, reason: 'VAPID keys are not set' };
  init();
  const subs = await q<SubRow>('select id, endpoint, p256dh, auth from push_subscriptions');
  let sent = 0;
  let removed = 0;
  let failed = 0;
  const body = JSON.stringify({ url: '/', ...payload });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 60 * 60 * 12,
        });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await q('delete from push_subscriptions where id = $1', [s.id]);
          removed++;
        } else {
          failed++;
          console.error('push failed', code, (e as Error).message);
        }
      }
    }),
  );
  return { sent, removed, failed };
}
