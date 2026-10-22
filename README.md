# Tracker

Your personal study / gym / DSA / mess tracker. Installable on your phone (PWA), password-protected, synced through Neon, with push notifications.

Screens: **Today** (check-ins, weekly rings, exam focus) · **Study** (log sessions, weekly bars, heatmap) · **Subjects** (chapters, multi-file PPT/PDF upload, tick off units) · **Exams** (theory + practical dates, priority ranking) · **Stats** (date ranges, active vs missed grid, weekly goals, calendar) · **Settings**.

## Deploy (about 15 minutes)

1. Put this folder in a GitHub repo and import it into Vercel.
2. In Vercel → **Storage**: create/connect **Neon** (adds `DATABASE_URL`) and **Blob** (adds `BLOB_READ_WRITE_TOKEN`). Create the Blob store as **Private**. If Vercel only lets you create a public one, add `NEXT_PUBLIC_BLOB_ACCESS=public`.
3. Locally run `npm install` then `npm run keys`. Copy the printed values into Vercel → Settings → Environment Variables, and add your own `APP_PASSWORD` (long passphrase) and `VAPID_SUBJECT` (e.g. `mailto:you@example.com`). See `.env.example` for the full list.
4. Create the tables once: put `DATABASE_URL` in a local `.env.local`, then `npm run db:init`.
5. Redeploy. Open the site, sign in, go to **Subjects → Add FACD, WSMA, SE, PCAP** (or add your own).
6. Phone: open the site, **Add to Home Screen** (iPhone: Share → Add to Home Screen, then open from the icon). Then **Settings → Enable on this device**.

## Notifications

- Reminder times and on/off switches are in Settings. A reminder only fires if you haven't logged that item yet; each fires once a day.
- Vercel's free (Hobby) plan allows one cron run per day, so `vercel.json` runs once each morning (exam countdown alerts). For study/gym/DSA/meal reminders at your chosen times, either use Vercel Pro and change the schedule to `*/15 * * * *`, or use a free pinger such as cron-job.org every 15 minutes: `GET https://YOUR-APP/api/cron/reminders` with header `Authorization: Bearer <CRON_SECRET>`.

## How the exam priority works

Each exam needs time for its unfinished units (minutes per PPT/program in Settings, overridable per unit). Available time = your weekday/weekend hours from today until the day before the exam, minus what you already studied today. Exams are ranked by how much of the available time is needed for everything due on or before them; units shared by a theory and a practical exam count once. The defaults (3 h weekday, 5 h weekend, 45 min/PPT, 20 min/program, goals 6/4/5 days) are placeholders: set your real values in Settings.

## Try it without any accounts

`npm run dev:local` runs the app with an in-memory database (password `local`). Data disappears when you stop it. Uploads and push need the real Vercel keys.

## Checks

`npm test` (planner/date/stats logic) and `npm run typecheck`.
