// All dates in the app are plain 'YYYY-MM-DD' strings in the configured timezone.
export const TZ = process.env.APP_TZ || 'Asia/Kolkata';

const pad = (n: number) => String(n).padStart(2, '0');
const toUTC = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, dd);
};

/** Today's date in the given timezone, as YYYY-MM-DD. */
export function todayIn(tz: string = TZ, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Minutes since local midnight in the given timezone. */
export function minutesNow(tz: string = TZ, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

export function addDays(d: string, n: number): string {
  const t = new Date(toUTC(d) + n * 86400000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** b - a in whole days. */
export const diffDays = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / 86400000);

/** 0 = Sunday … 6 = Saturday */
export const dow = (d: string) => new Date(toUTC(d)).getUTCDay();

export function startOfWeek(d: string, weekStart: 0 | 1 = 1): string {
  const back = (dow(d) - weekStart + 7) % 7;
  return addDays(d, -back);
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export const monthStart = (d: string) => d.slice(0, 7) + '-01';

export function addMonths(d: string, n: number): string {
  const [y, m] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-01`;
}

export function daysInMonth(d: string): number {
  const [y, m] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export const fmt = (d: string, o: Intl.DateTimeFormatOptions) =>
  new Date(toUTC(d)).toLocaleDateString('en-IN', { ...o, timeZone: 'UTC' });

export const isDate = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toUTC(s));

export function relDay(d: string, today: string): string {
  const n = diffDays(today, d);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return fmt(d, { weekday: 'short', day: 'numeric', month: 'short' });
}
