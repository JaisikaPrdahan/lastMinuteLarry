import type { AppState, HabitKind } from './types';
import { MEALS } from './types';
import { addDays, eachDay, startOfWeek } from './dates';

export type Series = 'study' | 'gym' | 'dsa' | 'mess';
type Src = Pick<AppState, 'sessions' | 'habits'>;

export function activeDates(st: Src, s: Series): Set<string> {
  if (s === 'study') return new Set(st.sessions.map((x) => x.session_date));
  if (s === 'mess') return new Set(st.habits.filter((h) => MEALS.includes(h.kind)).map((h) => h.log_date));
  return new Set(st.habits.filter((h) => h.kind === s).map((h) => h.log_date));
}

export function habitMap(st: Src, kind: HabitKind): Map<string, number> {
  return new Map(st.habits.filter((h) => h.kind === kind).map((h) => [h.log_date, h.count]));
}

export function minutesByDate(st: Src): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of st.sessions) m.set(x.session_date, (m.get(x.session_date) ?? 0) + x.minutes);
  return m;
}

export function countIn(dates: Set<string>, from: string, to: string): number {
  let n = 0;
  for (const d of dates) if (d >= from && d <= to) n++;
  return n;
}

export interface WeekCount {
  start: string;
  count: number;
  days: number; // days of this week that fall inside the range
}

export function weeklyCounts(dates: Set<string>, from: string, to: string, weekStart: 0 | 1): WeekCount[] {
  const out: WeekCount[] = [];
  for (let w = startOfWeek(from, weekStart); w <= to; w = addDays(w, 7)) {
    const lo = w < from ? from : w;
    const hiRaw = addDays(w, 6);
    const hi = hiRaw > to ? to : hiRaw;
    out.push({ start: w, count: countIn(dates, lo, hi), days: eachDay(lo, hi).length });
  }
  return out;
}

export function streaks(dates: Set<string>, today: string): { current: number; best: number } {
  let current = 0;
  let d = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(d)) {
    current++;
    d = addDays(d, -1);
  }
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const x of [...dates].sort()) {
    run = prev && addDays(prev, 1) === x ? run + 1 : 1;
    best = Math.max(best, run);
    prev = x;
  }
  return { current, best };
}

export function minutesBySubject(st: Src, from: string, to: string): Map<number | null, number> {
  const m = new Map<number | null, number>();
  for (const x of st.sessions) {
    if (x.session_date < from || x.session_date > to) continue;
    m.set(x.subject_id, (m.get(x.subject_id) ?? 0) + x.minutes);
  }
  return m;
}

export const fmtMinutes = (min: number): string => {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};
