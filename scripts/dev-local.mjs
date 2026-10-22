// Try the app on your own machine with NO database account:  npm run dev:local
// Uses an in-memory Postgres (PGlite). Data is wiped when you stop it.
// Sign in with the password "local" (uploads and push need real Vercel/VAPID keys and stay off).
import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  DB_DRIVER: 'pglite',
  APP_PASSWORD: process.env.APP_PASSWORD || 'local',
  SESSION_SECRET: process.env.SESSION_SECRET || 'local-dev-secret-local-dev-secret-0123456789',
  CRON_SECRET: process.env.CRON_SECRET || 'local-cron',
};
const child = spawn('npx', ['next', 'dev'], { stdio: 'inherit', env, shell: process.platform === 'win32' });
child.on('exit', (c) => process.exit(c ?? 0));
