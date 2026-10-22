import { q } from './db';
import { getState } from './data';
import { TZ, minutesNow, todayIn } from './dates';
import { buildPlan } from './planner';
import { pushConfigured, sendPushToAll, type PushPayload } from './push';
import { HABIT_LABEL, MEALS } from './types';
import type { HabitKind, ReminderKey } from './types';
import { fmtMinutes } from './stats';

const WINDOW_MIN = 180; // a reminder still fires up to 3h after its set time (cron timing is not exact)

/**
 * Called by /api/cron/reminders. Safe to call as often as you like (every 15 min is ideal):
 * each reminder is sent at most once per day thanks to the sent_reminders table.
 */
export async function runReminders(now: Date = new Date()) {
  if (!pushConfigured()) return { fired: [] as string[], note: 'VAPID keys are not set' };
  const subs = await q<{ n: number }>('select count(*)::int as n from push_subscriptions');
  if (!subs[0].n) return { fired: [] as string[], note: 'No device has enabled notifications yet' };

  const state = await getState();
  const { settings, habits, sessions } = state;
  const today = todayIn(TZ, now);
  const nowMin = minutesNow(TZ, now);
  const plan = buildPlan({ ...state, today });
  const fired: string[] = [];

  const due = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const t = h * 60 + m;
    return nowMin >= t && nowMin <= t + WINDOW_MIN;
  };
  const fire = async (key: string, payload: PushPayload) => {
    const ins = await q('insert into sent_reminders (key) values ($1) on conflict do nothing returning key', [
      `${today}:${key}`,
    ]);
    if (!ins.length) return; // already sent today
    await sendPushToAll({ ...payload, tag: key });
    fired.push(key);
  };
  const hasHabit = (k: HabitKind) => habits.some((h) => h.log_date === today && h.kind === k);

  // Study
  if (settings.reminders.study.on && due(settings.reminders.study.time) && !sessions.some((s) => s.session_date === today)) {
    const first = plan.today[0];
    await fire('study', {
      title: 'Time to study',
      body: first
        ? `${first.subject?.name ?? 'Next up'}: about ${fmtMinutes(first.minutes)} planned for today.`
        : 'You have not logged any study today yet.',
      url: '/study',
    });
  }

  // Gym + DSA
  const simple: { key: ReminderKey & HabitKind; title: string; body: string; url: string }[] = [
    { key: 'gym', title: 'Gym check-in', body: 'No gym check-in today yet.', url: '/' },
    { key: 'dsa', title: 'DSA practice', body: 'No DSA practice logged today yet.', url: '/' },
  ];
  for (const r of simple) {
    if (settings.reminders[r.key].on && due(settings.reminders[r.key].time) && !hasHabit(r.key)) {
      await fire(r.key, { title: r.title, body: r.body, url: r.url });
    }
  }

  // Meals
  for (const m of MEALS) {
    const key = m as ReminderKey;
    if (settings.reminders[key].on && due(settings.reminders[key].time) && !hasHabit(m)) {
      await fire(m, { title: `${HABIT_LABEL[m]} check-in`, body: `Log ${m} at the mess.`, url: '/' });
    }
  }

  // Exam countdown alerts: 7, 3, 1 days before and on the day
  if (settings.reminders.exams.on && due(settings.reminders.exams.time)) {
    for (const p of plan.byDate) {
      if (![7, 3, 1, 0].includes(p.daysLeft)) continue;
      const when = p.daysLeft === 0 ? 'is today' : p.daysLeft === 1 ? 'is tomorrow' : `is in ${p.daysLeft} days`;
      await fire(`exam:${p.exam.id}:${p.daysLeft}`, {
        title: `${p.subject?.name ?? 'Exam'} ${p.exam.kind} exam ${when}`,
        body:
          p.remainingUnits > 0
            ? `${p.remainingUnits} of ${p.totalUnits} units still to cover (~${fmtMinutes(p.ownMinutes)}).`
            : 'All units covered. Revise and rest well.',
        url: '/exams',
      });
    }
  }

  await q(`delete from sent_reminders where sent_at < now() - interval '14 days'`);
  return { fired, note: 'ok' };
}
