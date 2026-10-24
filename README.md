# Last Minute Larry

A personal, password-protected study / gym / DSA / mess tracker you host yourself. It installs on your phone like an app (PWA), syncs between phone and laptop through your own database, and sends push notifications from the app itself (no Google Calendar needed).

**What it does**

- **Today**: one-tap check-ins (gym, DSA, breakfast, lunch, dinner), weekly progress rings, streaks, and today's study plan.
- **Study**: log sessions (subject, units, minutes), weekly bars, activity heatmap.
- **Subjects**: subjects as glass folders, with chapters and multiple PPT/PDF uploads per chapter. Tick units off as you finish them.
- **Exams**: theory and practical dates, plus a priority ranking based on exam date, remaining units and the time you have left.
- **Stats**: any date range, active-vs-missed grid, weekly goals, calendar.
- **Settings**: study hours, minutes per unit, weekly goals, reminder times, theme, push on/off.

Built with Next.js (App Router), TypeScript, Neon Postgres, Vercel Blob and Web Push. The UI is plain CSS, with no Tailwind or UI library.

---

## 1. Try it in 2 minutes (no accounts needed)

You only need [Node.js](https://nodejs.org) 20.9 or newer.

```bash
git clone https://github.com/<your-username>/<this-repo>.git
cd <this-repo>
npm install
npm run dev:local
```

Open http://localhost:3000 and sign in with the password **`local`**.

This mode uses an in-memory database, so **everything is wiped when you stop it**. File uploads and push notifications are off. It's for looking around.

---

## 2. Set it up for real (free tiers are enough)

You'll need accounts on [GitHub](https://github.com), [Vercel](https://vercel.com) and (through Vercel) [Neon](https://neon.tech). About 15 minutes.

### Step 1: Get the code into your own GitHub repo

Fork this repo, or clone it and push it to a new repo of your own.

### Step 2: Import it into Vercel

Vercel → **Add New → Project** → pick your repo → **Deploy**. The first deploy will fail or show a broken app. That's fine; the next steps add what it needs.

### Step 3: Add the database and file storage

In your Vercel project → **Storage**:

1. **Neon (Postgres)**: create or connect one. This adds `DATABASE_URL` automatically.
2. **Blob**: create a store and choose **Private**. Tick the read-write token option so `BLOB_READ_WRITE_TOKEN` is added. If Vercel only lets you make a public store, add `NEXT_PUBLIC_BLOB_ACCESS=public` as an environment variable (files then get unguessable but public URLs).

### Step 4: Generate your secrets

On your computer, in the project folder:

```bash
npm install
npm run keys
```

This prints `SESSION_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

### Step 5: Add environment variables in Vercel

Vercel → **Settings → Environment Variables**. Add these for **Production** and **Preview**:

| Name | Value |
| --- | --- |
| `APP_PASSWORD` | A long passphrase **only you** know. This is the app's only login. |
| `SESSION_SECRET` | From `npm run keys` (must be 32+ characters) |
| `CRON_SECRET` | From `npm run keys` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | From `npm run keys` |
| `VAPID_PRIVATE_KEY` | From `npm run keys` |
| `VAPID_SUBJECT` | `mailto:you@example.com` (any contact address) |
| `APP_TZ` | *(optional)* your timezone, default `Asia/Kolkata`, e.g. `America/New_York` |

`DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` should already be there from Step 3. See `.env.example` for the full list.

### Step 6: Create the database tables (once)

Create a file called `.env.local` in the project folder containing your Neon connection string (copy it from Vercel → Settings → Environment Variables → `DATABASE_URL`):

```
DATABASE_URL=postgresql://...
```

Then run:

```bash
npm run db:init
```

You should see the tables being created. **Without this step sign-in fails**, because the login check reads from the database.

### Step 7: Redeploy

Vercel → **Deployments** → latest → **⋯ → Redeploy**. Environment variables only apply to new deployments.

### Step 8: Use it

1. Open your Vercel URL and sign in with `APP_PASSWORD`.
2. **Subjects → Add subject**, then add chapters and upload your PPTs/PDFs. (If the list is empty there's a one-tap starter button; you can delete or rename everything.)
3. **Exams**: add exam dates (theory and practical).
4. **Settings**: set your real study hours, minutes per unit and weekly goals. The defaults (3 h weekdays, 5 h weekends, 45 min per PPT, 20 min per program) are placeholders.

### Step 9: Install it on your phone

- **Android (Chrome)**: menu → **Install app** / **Add to Home Screen**.
- **iPhone (Safari)**: Share → **Add to Home Screen**, then open it from the home-screen icon. Push on iPhone only works from the installed app (iOS 16.4+).

Then in the app: **Settings → Enable on this device** to turn on push notifications.

---

## Notifications

- Reminder times and on/off switches live in **Settings**. A reminder only fires if you haven't logged that item yet, and each fires at most once a day.
- Vercel's free (Hobby) plan allows **one cron run per day**, so `vercel.json` runs once each morning (exam countdown alerts). For reminders at your chosen times (study, gym, DSA, meals) pick one of:
  - **Free pinger**: create a job on [cron-job.org](https://cron-job.org) that runs every 15 minutes: `GET https://YOUR-APP.vercel.app/api/cron/reminders` with the header `Authorization: Bearer <your CRON_SECRET>`.
  - **Vercel Pro**: change the schedule in `vercel.json` to `*/15 * * * *`.

## How exam priority works

Each exam needs time for its unfinished units (minutes per PPT/program set in Settings, overridable per unit). Available time is your weekday/weekend hours from today until the day before the exam, minus what you've already studied today. Exams are ranked by how much of the available time is needed for everything due on or before them. Units shared by a theory and a practical exam are counted once. Status is **on track** up to 70% load, **tight** up to 100%, **behind** above that.

## Running locally against your real database

After Step 6 you can run the app against your real Neon database and Blob store:

```bash
# put every variable from Step 5 (plus DATABASE_URL and BLOB_READ_WRITE_TOKEN) in .env.local
npm run dev
```

## Security notes

- The whole app sits behind one password (`APP_PASSWORD`). Logins are throttled (8 wrong tries in 10 minutes pauses sign-in).
- Never commit `.env.local` (it's already in `.gitignore`). Keep `APP_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET` and `VAPID_PRIVATE_KEY` secret. If any leaks, change it in Vercel and redeploy.
- Uploaded files are served through a login-protected route when your Blob store is private.
- It's a single-user app: one password, one set of data.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Could not sign in" | The tables don't exist yet (run `npm run db:init`), or a variable is missing/not redeployed. Check Vercel → Logs. |
| "Server is not configured" | `APP_PASSWORD` is missing or `SESSION_SECRET` is shorter than 32 characters. |
| "Wrong password" | It must match `APP_PASSWORD` exactly. |
| `npm run db:init` says `DATABASE_URL` is missing | Create `.env.local` in the project root (Step 6). |
| Uploads fail | Check `BLOB_READ_WRITE_TOKEN` exists. If your store is public, set `NEXT_PUBLIC_BLOB_ACCESS=public`. |
| No push notifications | Install the app to the home screen first, then Settings → Enable on this device. Reminders at exact times need the pinger above. |
| Old icon after an update | Remove the app from your phone and add it again. |

## Developing

```bash
npm run dev:local   # in-memory database, password "local"
npm test            # planner / date / stats logic checks
npm run typecheck
```

Project layout: pages in `src/app`, UI in `src/components`, logic and database code in `src/lib` (the exam planner is `planner.ts`), schema in `schema.sql`, helper scripts in `scripts/`.

## Credits

- Glass folder cards and the liquid-sculpture login hero are third-party React components. Check their licenses and credit lines (the hero shows a link to its author) before reusing them elsewhere. The hero's sculpture images load from the component's default CDN.
- Fonts: Geist and Instrument Serif (both under the SIL Open Font License) via Google Fonts.

## License

No license has been chosen yet. Add a `LICENSE` file (for example MIT) if you want others to be able to reuse the code.
