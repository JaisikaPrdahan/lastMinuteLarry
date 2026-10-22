import type { AppState, Chapter, Exam, Material, Scope, Settings, Subject } from './types';
import { addDays, diffDays, dow } from './dates';

export const matMinutes = (m: Material, s: Settings): number =>
  m.est_minutes ?? (m.kind === 'ppt' ? s.minPerPpt : m.kind === 'program' ? s.minPerProgram : s.minPerOther);

export const inScope = (m: Material, scope: Scope): boolean =>
  scope === 'all' || m.kind === scope || (scope === 'ppt' && m.kind === 'other');

/** Minutes the user plans to study on a given date (weekday vs weekend hours). */
export function dayMinutes(date: string, s: Settings): number {
  const d = dow(date);
  return Math.round((d === 0 || d === 6 ? s.weekendHours : s.weekdayHours) * 60);
}

/** Study minutes available from today up to (not including) the exam day. */
export function capacityUntil(today: string, examDate: string, s: Settings, studiedToday: number): number {
  const end = examDate > today ? examDate : addDays(today, 1);
  let total = 0;
  for (let d = today; d < end; d = addDays(d, 1)) total += dayMinutes(d, s);
  return Math.max(0, total - studiedToday);
}

export type PlanStatus = 'done' | 'on-track' | 'tight' | 'behind';

export interface ExamPlan {
  exam: Exam;
  subject: Subject | undefined;
  daysLeft: number;
  studyDays: number;
  totalUnits: number;
  doneUnits: number;
  remainingUnits: number;
  ownMinutes: number; // time needed for this exam's remaining units
  cumulativeMinutes: number; // incl. earlier exams' work that competes for the same hours
  capacityMinutes: number;
  load: number; // cumulativeMinutes / capacityMinutes
  neededPerDay: number;
  availablePerDay: number;
  status: PlanStatus;
}

export interface TodayItem {
  exam: Exam;
  subject: Subject | undefined;
  minutes: number;
  materials: Material[];
}

export interface Plan {
  exams: ExamPlan[]; // priority order, most pressing first
  byDate: ExamPlan[]; // chronological
  today: TodayItem[];
  todayBudget: number;
  todayStudied: number;
}

type PlanInput = Pick<AppState, 'today' | 'exams' | 'subjects' | 'chapters' | 'materials' | 'sessions' | 'settings'>;

function orderedMaterials(materials: Material[], chapters: Chapter[]): Material[] {
  const chRank = new Map(chapters.map((c) => [c.id, c.position * 1e6 + c.id]));
  return [...materials].sort(
    (a, b) =>
      (chRank.get(a.chapter_id) ?? 0) - (chRank.get(b.chapter_id) ?? 0) || a.position - b.position || a.id - b.id,
  );
}

/** The next few not-yet-done units (in chapter order) that count towards an exam. */
export function nextUnits(st: Pick<AppState, 'materials' | 'chapters'>, exam: Exam, n = 3): Material[] {
  return orderedMaterials(st.materials, st.chapters)
    .filter((m) => !m.done && m.subject_id === exam.subject_id && inScope(m, exam.scope))
    .slice(0, n);
}

/**
 * Earliest-deadline-first plan.
 *  - Each upcoming exam needs time for its not-yet-done units (in scope).
 *  - Units shared by two exams (e.g. a theory + a practical covering "all") are only counted once,
 *    against the earlier exam.
 *  - Load = (work due on or before this exam) / (study minutes available before it).
 *  - "Today" splits today's remaining budget across exams by even pacing, earliest exam first.
 */
export function buildPlan(st: PlanInput): Plan {
  const { today, settings: s } = st;
  const subjects = new Map(st.subjects.map((x) => [x.id, x]));
  const todayStudied = st.sessions.filter((x) => x.session_date === today).reduce((a, x) => a + x.minutes, 0);
  const mats = orderedMaterials(st.materials, st.chapters);

  const upcoming = st.exams
    .filter((e) => e.exam_date >= today)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date) || a.id - b.id);

  const counted = new Set<number>();
  let cumulative = 0;
  const plans: ExamPlan[] = [];

  for (const exam of upcoming) {
    const scoped = mats.filter((m) => m.subject_id === exam.subject_id && inScope(m, exam.scope));
    const remaining = scoped.filter((m) => !m.done);
    const fresh = remaining.filter((m) => !counted.has(m.id));
    fresh.forEach((m) => counted.add(m.id));
    const own = remaining.reduce((a, m) => a + matMinutes(m, s), 0);
    cumulative += fresh.reduce((a, m) => a + matMinutes(m, s), 0);

    const daysLeft = diffDays(today, exam.exam_date);
    const studyDays = Math.max(1, daysLeft);
    const capacity = capacityUntil(today, exam.exam_date, s, todayStudied);
    const load = capacity > 0 ? cumulative / capacity : cumulative > 0 ? Infinity : 0;
    const status: PlanStatus =
      remaining.length === 0 ? 'done' : load > 1 ? 'behind' : load > 0.7 ? 'tight' : 'on-track';

    plans.push({
      exam,
      subject: subjects.get(exam.subject_id),
      daysLeft,
      studyDays,
      totalUnits: scoped.length,
      doneUnits: scoped.length - remaining.length,
      remainingUnits: remaining.length,
      ownMinutes: own,
      cumulativeMinutes: cumulative,
      capacityMinutes: capacity,
      load,
      neededPerDay: Math.ceil(own / studyDays),
      availablePerDay: Math.round(capacity / studyDays),
      status,
    });
  }

  const byDate = plans;
  const exams = [...plans].sort((a, b) => {
    if ((a.status === 'done') !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
    return b.load - a.load || a.exam.exam_date.localeCompare(b.exam.exam_date);
  });

  // Today's allocation
  const todayBudget = Math.max(0, dayMinutes(today, s) - todayStudied);
  let left = todayBudget;
  const assigned = new Set<number>();
  const items: TodayItem[] = [];
  for (const p of byDate) {
    if (left <= 0 || p.remainingUnits === 0) continue;
    const share = Math.min(left, Math.ceil(p.ownMinutes / p.studyDays));
    const picks: Material[] = [];
    let used = 0;
    for (const m of mats) {
      if (m.done || assigned.has(m.id) || m.subject_id !== p.exam.subject_id || !inScope(m, p.exam.scope)) continue;
      if (used >= share) break;
      picks.push(m);
      assigned.add(m.id);
      used += matMinutes(m, s);
    }
    if (picks.length) {
      items.push({ exam: p.exam, subject: p.subject, minutes: used, materials: picks });
      left = Math.max(0, left - used);
    }
  }

  return { exams, byDate, today: items, todayBudget, todayStudied };
}
