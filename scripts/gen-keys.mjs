// Prints fresh secrets to paste into .env.local and your Vercel environment variables.
//   npm run keys
import { randomBytes } from 'node:crypto';
import webpush from 'web-push';

const vapid = webpush.generateVAPIDKeys();
console.log(`
SESSION_SECRET=${randomBytes(32).toString('hex')}
CRON_SECRET=${randomBytes(24).toString('hex')}
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapid.publicKey}
VAPID_PRIVATE_KEY=${vapid.privateKey}

(APP_PASSWORD is yours to choose. Keep these values private.)
`);
