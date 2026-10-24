// Plain data-changing functions. No auth here: src/lib/actions.ts wraps each one with the login check.
import { q } from './db';
import { deleteBlobs } from './blob';
import { isDate } from './dates';
import { mergeSettings } from './types';
import type { ExamKind, HabitKind, Kind, ReminderKey, Scope, Settings } from './types';

const bad = (m: string): never => {
  throw new Error(m);
};
const text = (v: unknown, label: string, max = 120): string => {
  const s = String(v ?? '').trim();
  if (!s) bad(`${label} is required`);
  return s.slice(0, max);
};
const optText = (v: unknown, max = 500): string | null => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};
const int = (v: unknown, label: string, min: number, max: number): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) bad(`${label} must be between ${min} and ${max}`);
  return n;
};
const idOf = (v: unknown, label = 'id') => int(v, label, 1, 2_147_483_647);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], label: string): T =>
  (opts as readonly string[]).includes(String(v)) ? (v as T) : bad(`Invalid ${label}`);
const colorOf = (v: unknown) => (/^#[0-9a-fA-F]{6}$/.test(String(v)) ? String(v) : '#5a5ae6');
const timeOf = (v: unknown): string | null => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : bad('Time must look like 14:30');
};
const dateOf = (v: unknown, label = 'Date'): string => (isDate(v) ? v : bad(`${label} is invalid`));
const arrLit = (ids: number[]) => `{${ids.join(',')}}`;

const CODE_EXT = new Set(
  'py java c cpp cc h js ts jsx tsx ipynb sql r cs go rs php rb sh m html css kt swift'.split(' '),
);
export function inferKind(fileName: string): Kind {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return CODE_EXT.has(ext) ? 'program' : 'ppt';
}
const stripExt = (n: string) => n.replace(/\.[^./\\]+$/, '') || n;

// ---------- subjects / chapters ----------
export async function addSubject(name: string, color: string): Promise<number> {
  const rows = await q<{ id: number }>(
    `insert into subjects (name, color, position)
     values ($1, $2, (select coalesce(max(position), 0) + 1 from subjects)) returning id`,
    [text(name, 'Subject name', 60), colorOf(color)],
  );
  return rows[0].id;
}

export async function updateSubject(id: number, name: string, color: string): Promise<void> {
  await q('update subjects set name = $2, color = $3 where id = $1', [
    idOf(id),
    text(name, 'Subject name', 60),
    colorOf(color),
  ]);
}

export async function deleteSubject(id: number): Promise<void> {
  const sid = idOf(id);
  const files = await q<{ file_url: string }>(
    `select m.file_url from materials m join chapters c on c.id = m.chapter_id
      where c.subject_id = $1 and m.file_url is not null`,
    [sid],
  );
  await q('delete from subjects where id = $1', [sid]);
  await deleteBlobs(files.map((f) => f.file_url));
}

export async function addChapter(subjectId: number, title: string): Promise<number> {
  const sid = idOf(subjectId, 'subject');
  const rows = await q<{ id: number }>(
    `insert into chapters (subject_id, title, position)
     values ($1, $2, (select coalesce(max(position), 0) + 1 from chapters where subject_id = $1)) returning id`,
    [sid, text(title, 'Chapter name', 100)],
  );
  return rows[0].id;
}

export async function renameChapter(id: number, title: string): Promise<void> {
  await q('update chapters set title = $2 where id = $1', [idOf(id), text(title, 'Chapter name', 100)]);
}

export async function deleteChapter(id: number): Promise<void> {
  const cid = idOf(id);
  const files = await q<{ file_url: string }>(
    'select file_url from materials where chapter_id = $1 and file_url is not null',
    [cid],
  );
  await q('delete from chapters where id = $1', [cid]);
  await deleteBlobs(files.map((f) => f.file_url));
}

// ---------- materials (PPTs, PDFs, programs) ----------
export async function addUnits(chapterId: number, kind: Kind, count: number, label?: string): Promise<void> {
  const cid = idOf(chapterId, 'chapter');
  const k = oneOf(kind, ['ppt', 'program', 'other'] as const, 'kind');
  const n = int(count, 'Count', 1, 100);
  const base = (
    await q<{ n: number }>(
      `select count(*)::int as n from materials m join chapters c on c.id = m.chapter_id
        where m.kind = $2 and c.subject_id = (select subject_id from chapters where id = $1)`,
      [cid, k],
    )
  )[0].n;
  const pos = (
    await q<{ p: number }>('select coalesce(max(position), 0)::int as p from materials where chapter_id = $1', [cid])
  )[0].p;
  const name = optText(label, 40) ?? (k === 'ppt' ? 'PPT' : k === 'program' ? 'Program' : 'Item');
  await q(
    `insert into materials (chapter_id, title, kind, position)
     select $1, $2::text || ' ' || (g + $3::int)::text, $4, g + $5::int from generate_series(1, $6::int) g`,
    [cid, name, base, k, pos, n],
  );
}

export interface FileInfo {
  url: string;
  name: string;
  size: number;
}
const fileInfo = (f: FileInfo) => ({
  url: text(f.url, 'File URL', 2000),
  name: text(f.name, 'File name', 200),
  size: int(f.size, 'File size', 0, 2_000_000_000),
});

export async function addFile(chapterId: number, file: FileInfo): Promise<number> {
  const cid = idOf(chapterId, 'chapter');
  const f = fileInfo(file);
  const pos = (
    await q<{ p: number }>('select coalesce(max(position), 0)::int + 1 as p from materials where chapter_id = $1', [cid])
  )[0].p;
  const rows = await q<{ id: number }>(
    `insert into materials (chapter_id, title, kind, file_url, file_name, file_size, position)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [cid, stripExt(f.name).slice(0, 120), inferKind(f.name), f.url, f.name, f.size, pos],
  );
  return rows[0].id;
}

export async function attachFile(materialId: number, file: FileInfo): Promise<void> {
  const mid = idOf(materialId, 'unit');
  const f = fileInfo(file);
  const old = await q<{ file_url: string | null }>('select file_url from materials where id = $1', [mid]);
  await q('update materials set file_url = $2, file_name = $3, file_size = $4 where id = $1', [
    mid,
    f.url,
    f.name,
    f.size,
  ]);
  if (old[0]?.file_url && old[0].file_url !== f.url) await deleteBlobs([old[0].file_url]);
}

export async function removeFile(materialId: number): Promise<void> {
  const mid = idOf(materialId, 'unit');
  const old = await q<{ file_url: string | null }>('select file_url from materials where id = $1', [mid]);
  await q('update materials set file_url = null, file_name = null, file_size = null where id = $1', [mid]);
  await deleteBlobs([old[0]?.file_url]);
}

export async function updateMaterial(
  id: number,
  v: { title: string; kind: Kind; chapterId: number; estMinutes: number | null },
): Promise<void> {
  const est = v.estMinutes === null || v.estMinutes === undefined ? null : int(v.estMinutes, 'Minutes', 1, 1000);
  await q('update materials set title = $2, kind = $3, chapter_id = $4, est_minutes = $5 where id = $1', [
    idOf(id),
    text(v.title, 'Title', 160),
    oneOf(v.kind, ['ppt', 'program', 'other'] as const, 'kind'),
    idOf(v.chapterId, 'chapter'),
    est,
  ]);
}

export async function toggleMaterial(id: number, done: boolean): Promise<void> {
  await q('update materials set done = $2, done_at = case when $2 then now() else null end where id = $1', [
    idOf(id),
    !!done,
  ]);
}

export async function deleteMaterial(id: number): Promise<void> {
  const mid = idOf(id);
  const old = await q<{ file_url: string | null }>('select file_url from materials where id = $1', [mid]);
  await q('delete from materials where id = $1', [mid]);
  await deleteBlobs([old[0]?.file_url]);
}

// ---------- exams ----------
export interface ExamInput {
  id?: number;
  subjectId: number;
  kind: ExamKind;
  date: string;
  time?: string | null;
  scope: Scope;
  notes?: string | null;
}
export async function saveExam(e: ExamInput): Promise<void> {
  const args = [
    idOf(e.subjectId, 'subject'),
    oneOf(e.kind, ['theory', 'practical'] as const, 'exam type'),
    dateOf(e.date, 'Exam date'),
    timeOf(e.time),
    oneOf(e.scope, ['all', 'ppt', 'program'] as const, 'scope'),
    optText(e.notes),
  ];
  if (e.id) {
    await q(
      'update exams set subject_id = $2, kind = $3, exam_date = $4, exam_time = $5, scope = $6, notes = $7 where id = $1',
      [idOf(e.id), ...args],
    );
  } else {
    await q(
      'insert into exams (subject_id, kind, exam_date, exam_time, scope, notes) values ($1, $2, $3, $4, $5, $6)',
      args,
    );
  }
}

export async function deleteExam(id: number): Promise<void> {
  await q('delete from exams where id = $1', [idOf(id)]);
}

// ---------- study sessions ----------
export interface SessionInput {
  date: string;
  subjectId: number | null;
  minutes: number;
  materialIds: number[];
  notes?: string | null;
  markDone: boolean;
}
export async function logSession(s: SessionInput): Promise<void> {
  const ids = Array.from(new Set((s.materialIds ?? []).map((x) => idOf(x, 'unit'))));
  await q(
    `insert into study_sessions (session_date, subject_id, minutes, material_ids, notes)
     values ($1, $2, $3, $4::int[], $5)`,
    [
      dateOf(s.date),
      s.subjectId ? idOf(s.subjectId, 'subject') : null,
      int(s.minutes, 'Minutes', 1, 1440),
      arrLit(ids),
      optText(s.notes),
    ],
  );
  if (s.markDone && ids.length) {
    await q('update materials set done = true, done_at = coalesce(done_at, now()) where id = any($1::int[])', [
      arrLit(ids),
    ]);
  }
}

export async function deleteSession(id: number): Promise<void> {
  await q('delete from study_sessions where id = $1', [idOf(id)]);
}

// ---------- daily check-ins ----------
export async function setHabit(date: string, kind: HabitKind, on: boolean, count = 1): Promise<void> {
  const d = dateOf(date);
  const k = oneOf(kind, ['gym', 'dsa', 'breakfast', 'lunch', 'dinner', 'junk'] as const, 'check-in');
  if (!on) {
    await q('delete from habit_logs where log_date = $1 and kind = $2', [d, k]);
    return;
  }
  await q(
    `insert into habit_logs (log_date, kind, count) values ($1, $2, $3)
     on conflict (log_date, kind) do update set count = excluded.count`,
    [d, k, int(count, 'Count', 1, 500)],
  );
}

// ---------- settings ----------
export async function saveSettings(input: Partial<Settings>): Promise<void> {
  const rows = await q<{ value: unknown }>(`select value from settings where key = 'app'`);
  const next = mergeSettings(rows[0]?.value);
  const hours = (v: unknown, label: string) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 18) bad(`${label} must be between 0 and 18`);
    return Math.round(n * 4) / 4;
  };
  if (input.weekdayHours !== undefined) next.weekdayHours = hours(input.weekdayHours, 'Weekday hours');
  if (input.weekendHours !== undefined) next.weekendHours = hours(input.weekendHours, 'Weekend hours');
  if (input.minPerPpt !== undefined) next.minPerPpt = int(input.minPerPpt, 'Minutes per PPT', 1, 600);
  if (input.minPerProgram !== undefined) next.minPerProgram = int(input.minPerProgram, 'Minutes per program', 1, 600);
  if (input.minPerOther !== undefined) next.minPerOther = int(input.minPerOther, 'Minutes per item', 1, 600);
  if (input.weekStart !== undefined) next.weekStart = input.weekStart === 0 ? 0 : 1;
  if (input.studyTarget !== undefined) next.studyTarget = int(input.studyTarget, 'Study target', 0, 7);
  if (input.gymTarget !== undefined) next.gymTarget = int(input.gymTarget, 'Gym target', 0, 7);
  if (input.dsaTarget !== undefined) next.dsaTarget = int(input.dsaTarget, 'DSA target', 0, 7);
  if (input.reminders) {
    for (const k of Object.keys(next.reminders) as ReminderKey[]) {
      const r = input.reminders[k];
      if (r) next.reminders[k] = { on: !!r.on, time: timeOf(r.time) ?? next.reminders[k].time };
    }
  }
  await q(
    `insert into settings (key, value) values ('app', $1::jsonb)
     on conflict (key) do update set value = excluded.value`,
    [JSON.stringify(next)],
  );
}

// ---------- starter data (from the counts given when this app was requested) ----------
const STARTER: { name: string; color: string; ppt: number; program: number }[] = [
  { name: 'FACD', color: '#5a5ae6', ppt: 20, program: 0 },
  { name: 'WSMA', color: '#0f9d8a', ppt: 4, program: 16 },
  { name: 'SE', color: '#e8590c', ppt: 8, program: 0 },
  { name: 'PCAP', color: '#c2255c', ppt: 6, program: 40 },
];
export async function seedStarter(): Promise<number> {
  let added = 0;
  for (const s of STARTER) {
    const exists = await q('select 1 from subjects where lower(name) = lower($1)', [s.name]);
    if (exists.length) continue;
    const sid = await addSubject(s.name, s.color);
    const cid = await addChapter(sid, 'Unsorted');
    if (s.ppt) await addUnits(cid, 'ppt', s.ppt);
    if (s.program) await addUnits(cid, 'program', s.program);
    added++;
  }
  return added;
}
