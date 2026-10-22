// Quick checks for the date, planner and stats logic.   npm test
import assert from 'node:assert/strict';
import { addDays, diffDays, dow, startOfWeek, eachDay, todayIn, minutesNow, addMonths } from '../src/lib/dates';
import { buildPlan, capacityUntil } from '../src/lib/planner';
import { activeDates, streaks, weeklyCounts } from '../src/lib/stats';
import { DEFAULT_SETTINGS, mergeSettings } from '../src/lib/types';
import type { Chapter, Exam, Material, Subject } from '../src/lib/types';

let passed = 0;
const t = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log('ok  -', name);
};

// ---- dates
t('addDays crosses month/year', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});
t('diffDays / dow / startOfWeek', () => {
  assert.equal(diffDays('2026-10-22', '2026-10-30'), 8);
  assert.equal(dow('2026-10-22'), 4); // Thursday
  assert.equal(startOfWeek('2026-10-22', 1), '2026-10-19');
  assert.equal(startOfWeek('2026-10-22', 0), '2026-10-18');
  assert.equal(startOfWeek('2026-10-25', 1), '2026-10-19'); // Sunday belongs to the Monday-start week
});
t('timezone-aware today (IST is ahead of UTC)', () => {
  const lateUtc = new Date('2026-10-21T20:00:00Z'); // 01:30 on the 22nd in IST
  assert.equal(todayIn('Asia/Kolkata', lateUtc), '2026-10-22');
  assert.equal(todayIn('UTC', lateUtc), '2026-10-21');
  assert.equal(minutesNow('Asia/Kolkata', lateUtc), 90);
});
t('addMonths / eachDay', () => {
  assert.equal(addMonths('2026-12-01', 1), '2027-01-01');
  assert.equal(addMonths('2026-01-01', -1), '2025-12-01');
  assert.equal(eachDay('2026-10-30', '2026-11-02').length, 4);
});
t('mergeSettings fills defaults and keeps overrides', () => {
  const s = mergeSettings({ weekdayHours: 2, reminders: { gym: { on: false } } });
  assert.equal(s.weekdayHours, 2);
  assert.equal(s.weekendHours, DEFAULT_SETTINGS.weekendHours);
  assert.equal(s.reminders.gym.on, false);
  assert.equal(s.reminders.gym.time, DEFAULT_SETTINGS.reminders.gym.time);
});

// ---- planner fixtures
const subjects: Subject[] = [
  { id: 1, name: 'A', color: '#111111', position: 1 },
  { id: 2, name: 'B', color: '#222222', position: 2 },
];
const chapters: Chapter[] = [
  { id: 10, subject_id: 1, title: 'c1', position: 1 },
  { id: 20, subject_id: 2, title: 'c2', position: 1 },
];
let nextId = 1;
const mat = (chapter: Chapter, kind: Material['kind'], done = false): Material => ({
  id: nextId++,
  chapter_id: chapter.id,
  subject_id: chapter.subject_id,
  title: `m${nextId}`,
  kind,
  file_url: null,
  file_name: null,
  file_size: null,
  est_minutes: null,
  done,
  position: nextId,
});
const many = (n: number, ch: Chapter, kind: Material['kind']) => Array.from({ length: n }, () => mat(ch, kind));
const exam = (id: number, subject_id: number, exam_date: string, scope: Exam['scope'] = 'all', kind: Exam['kind'] = 'theory'): Exam => ({
  id,
  subject_id,
  kind,
  exam_date,
  exam_time: null,
  scope,
  notes: null,
});
const base = { today: '2026-10-22', subjects, chapters, sessions: [], settings: DEFAULT_SETTINGS };

t('capacity uses weekday vs weekend hours', () => {
  // Thu 180 + Fri 180 + Sat 300 + Sun 300 = 960 before Monday 26th
  assert.equal(capacityUntil('2026-10-22', '2026-10-26', DEFAULT_SETTINGS, 0), 960);
  assert.equal(capacityUntil('2026-10-22', '2026-10-26', DEFAULT_SETTINGS, 100), 860);
  // exam today: only what is left of today
  assert.equal(capacityUntil('2026-10-22', '2026-10-22', DEFAULT_SETTINGS, 60), 120);
});

t('on-track vs behind and priority order', () => {
  const materials = [...many(4, chapters[0], 'ppt'), ...many(40, chapters[1], 'program')];
  const plan = buildPlan({ ...base, materials, exams: [exam(1, 1, '2026-10-26'), exam(2, 2, '2026-10-30')] });
  assert.equal(plan.byDate[0].ownMinutes, 180); // 4 x 45
  assert.equal(plan.byDate[1].ownMinutes, 800); // 40 x 20
  assert.equal(plan.byDate[1].cumulativeMinutes, 980); // plus the earlier exam's work
  assert.equal(plan.byDate[0].status, 'on-track'); // 180 / 960
  assert.equal(plan.byDate[1].status, 'on-track'); // 980 / 1680 = 0.58
  // B carries the heavier cumulative load, so it ranks first even though A's exam is sooner
  assert.equal(plan.exams[0].exam.id, 2);

  const squeezed = buildPlan({
    ...base,
    materials: [...many(4, chapters[0], 'ppt'), ...many(40, chapters[1], 'program')],
    exams: [exam(1, 1, '2026-10-26'), exam(2, 2, '2026-10-26')],
  });
  assert.equal(squeezed.byDate[1].status, 'behind'); // 980 / 960 > 1
});

t('overloaded exam is flagged behind', () => {
  const plan = buildPlan({
    ...base,
    materials: many(100, chapters[0], 'ppt'),
    exams: [exam(1, 1, '2026-10-24')],
  });
  assert.equal(plan.exams[0].status, 'behind');
  assert.ok(plan.exams[0].load > 1);
});

t('done units shrink the need; fully done exam sorts last', () => {
  const doneAll = Array.from({ length: 4 }, () => mat(chapters[0], 'ppt', true));
  const plan = buildPlan({
    ...base,
    materials: [...doneAll, ...many(10, chapters[1], 'ppt')],
    exams: [exam(1, 1, '2026-10-24'), exam(2, 2, '2026-10-30')],
  });
  const a = plan.byDate.find((p) => p.exam.id === 1)!;
  assert.equal(a.status, 'done');
  assert.equal(a.remainingUnits, 0);
  assert.equal(a.doneUnits, 4);
  assert.equal(plan.exams[plan.exams.length - 1].exam.id, 1);
});

t('units shared by a theory and a practical exam are counted once', () => {
  const materials = [...many(2, chapters[0], 'ppt'), ...many(3, chapters[0], 'program')];
  const plan = buildPlan({
    ...base,
    materials,
    exams: [exam(1, 1, '2026-10-30', 'ppt', 'theory'), exam(2, 1, '2026-11-05', 'all', 'practical')],
  });
  assert.equal(plan.byDate[0].cumulativeMinutes, 2 * 45);
  assert.equal(plan.byDate[1].cumulativeMinutes, 2 * 45 + 3 * 20); // PPTs not double counted
  assert.equal(plan.byDate[1].ownMinutes, 2 * 45 + 3 * 20); // but shown in full for this exam
});

t('past exams are ignored; exam today still plannable', () => {
  const plan = buildPlan({
    ...base,
    materials: many(2, chapters[0], 'ppt'),
    exams: [exam(1, 1, '2026-10-20'), exam(2, 1, '2026-10-22')],
  });
  assert.equal(plan.byDate.length, 1);
  assert.equal(plan.byDate[0].daysLeft, 0);
  assert.equal(plan.byDate[0].studyDays, 1);
});

t("today's plan respects the budget (within one unit) and orders by exam date", () => {
  const plan = buildPlan({
    ...base,
    materials: [...many(20, chapters[0], 'ppt'), ...many(20, chapters[1], 'ppt')],
    exams: [exam(1, 1, '2026-10-24'), exam(2, 2, '2026-10-28')],
  });
  assert.equal(plan.todayBudget, 180);
  const total = plan.today.reduce((a, i) => a + i.minutes, 0);
  assert.ok(total <= 180 + 45, `planned ${total}`);
  assert.equal(plan.today[0].exam.id, 1);
  const ids = plan.today.flatMap((i) => i.materials.map((m) => m.id));
  assert.equal(new Set(ids).size, ids.length); // no unit assigned twice
});

t('time already studied today reduces the budget', () => {
  const plan = buildPlan({
    ...base,
    materials: many(10, chapters[0], 'ppt'),
    exams: [exam(1, 1, '2026-10-30')],
    sessions: [{ id: 1, session_date: '2026-10-22', subject_id: 1, minutes: 200, material_ids: [], notes: null }],
  });
  assert.equal(plan.todayBudget, 0);
  assert.equal(plan.today.length, 0);
});

t('per-unit override beats the default minutes', () => {
  const m = mat(chapters[0], 'ppt');
  m.est_minutes = 100;
  const plan = buildPlan({ ...base, materials: [m], exams: [exam(1, 1, '2026-10-30')] });
  assert.equal(plan.byDate[0].ownMinutes, 100);
});

// ---- stats
const st = (sessionDates: string[], habits: [string, 'gym' | 'dsa' | 'lunch'][] = []) => ({
  sessions: sessionDates.map((d, i) => ({ id: i, session_date: d, subject_id: 1, minutes: 30, material_ids: [], notes: null })),
  habits: habits.map(([d, k]) => ({ log_date: d, kind: k, count: 1, note: null })),
});

t('streaks: today missing does not break yesterday’s streak', () => {
  const dates = new Set(['2026-10-19', '2026-10-20', '2026-10-21']);
  assert.deepEqual(streaks(dates, '2026-10-22'), { current: 3, best: 3 });
  assert.deepEqual(streaks(new Set(['2026-10-10', '2026-10-11', '2026-10-21']), '2026-10-22'), { current: 1, best: 2 });
  assert.deepEqual(streaks(new Set(['2026-10-10']), '2026-10-22'), { current: 0, best: 1 });
});

t('weekly counts split a range into Monday-start weeks', () => {
  const dates = activeDates(st(['2026-10-19', '2026-10-20', '2026-10-24', '2026-10-26']), 'study');
  const w = weeklyCounts(dates, '2026-10-19', '2026-10-27', 1);
  assert.equal(w.length, 2);
  assert.deepEqual(w.map((x) => x.count), [3, 1]);
  assert.deepEqual(w.map((x) => x.days), [7, 2]); // partial last week
});

t('activeDates separates series and groups meals as mess', () => {
  const s = st(['2026-10-20'], [['2026-10-21', 'gym'], ['2026-10-21', 'lunch'], ['2026-10-22', 'dsa']]);
  assert.deepEqual([...activeDates(s, 'gym')], ['2026-10-21']);
  assert.deepEqual([...activeDates(s, 'mess')], ['2026-10-21']);
  assert.deepEqual([...activeDates(s, 'dsa')], ['2026-10-22']);
  assert.deepEqual([...activeDates(s, 'study')], ['2026-10-20']);
});

console.log(`\n${passed} checks passed`);
