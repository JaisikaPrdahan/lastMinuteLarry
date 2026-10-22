export type Kind = 'ppt' | 'program' | 'other';
export type Scope = 'all' | 'ppt' | 'program';
export type ExamKind = 'theory' | 'practical';
export type HabitKind = 'gym' | 'dsa' | 'breakfast' | 'lunch' | 'dinner';

export interface Subject {
  id: number;
  name: string;
  color: string;
  position: number;
}
export interface Chapter {
  id: number;
  subject_id: number;
  title: string;
  position: number;
}
export interface Material {
  id: number;
  chapter_id: number;
  subject_id: number;
  title: string;
  kind: Kind;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  est_minutes: number | null;
  done: boolean;
  position: number;
}
export interface Exam {
  id: number;
  subject_id: number;
  kind: ExamKind;
  exam_date: string;
  exam_time: string | null;
  scope: Scope;
  notes: string | null;
}
export interface Session {
  id: number;
  session_date: string;
  subject_id: number | null;
  minutes: number;
  material_ids: number[];
  notes: string | null;
}
export interface Habit {
  log_date: string;
  kind: HabitKind;
  count: number;
  note: string | null;
}

export interface ReminderCfg {
  on: boolean;
  time: string; // HH:MM, in APP_TZ
}
export type ReminderKey = 'study' | 'gym' | 'dsa' | 'breakfast' | 'lunch' | 'dinner' | 'exams';

export interface Settings {
  weekdayHours: number;
  weekendHours: number;
  minPerPpt: number;
  minPerProgram: number;
  minPerOther: number;
  weekStart: 0 | 1;
  studyTarget: number;
  gymTarget: number;
  dsaTarget: number;
  reminders: Record<ReminderKey, ReminderCfg>;
}

// Placeholder defaults. Every one of these is editable in Settings.
export const DEFAULT_SETTINGS: Settings = {
  weekdayHours: 3,
  weekendHours: 5,
  minPerPpt: 45,
  minPerProgram: 20,
  minPerOther: 30,
  weekStart: 1,
  studyTarget: 6,
  gymTarget: 4,
  dsaTarget: 5,
  reminders: {
    study: { on: true, time: '19:00' },
    gym: { on: true, time: '17:30' },
    dsa: { on: true, time: '21:00' },
    breakfast: { on: false, time: '09:30' },
    lunch: { on: false, time: '14:00' },
    dinner: { on: false, time: '21:00' },
    exams: { on: true, time: '08:00' },
  },
};

export function mergeSettings(stored: unknown): Settings {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<Settings>;
  const reminders = { ...DEFAULT_SETTINGS.reminders };
  for (const k of Object.keys(reminders) as ReminderKey[]) {
    reminders[k] = { ...reminders[k], ...(s.reminders?.[k] ?? {}) };
  }
  return { ...DEFAULT_SETTINGS, ...s, reminders };
}

export interface AppState {
  today: string;
  tz: string;
  subjects: Subject[];
  chapters: Chapter[];
  materials: Material[];
  exams: Exam[];
  sessions: Session[];
  habits: Habit[];
  settings: Settings;
}

export const KIND_LABEL: Record<Kind, string> = { ppt: 'PPT', program: 'Program', other: 'Other' };
export const HABIT_LABEL: Record<HabitKind, string> = {
  gym: 'Gym',
  dsa: 'DSA',
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};
export const MEALS: HabitKind[] = ['breakfast', 'lunch', 'dinner'];
