import { q } from './db';
import { TZ, todayIn } from './dates';
import { mergeSettings } from './types';
import type { AppState, Chapter, Exam, Habit, Material, Session, Subject } from './types';

export async function getState(): Promise<AppState> {
  const [subjects, chapters, materials, exams, sessions, habits, settingsRows] = await Promise.all([
    q<Subject>('select id, name, color, position from subjects order by position, id'),
    q<Chapter>('select id, subject_id, title, position from chapters order by position, id'),
    q<Material>(
      `select m.id, m.chapter_id, c.subject_id, m.title, m.kind, m.file_url, m.file_name,
              m.file_size::int as file_size, m.est_minutes, m.done, m.position
         from materials m join chapters c on c.id = m.chapter_id
        order by m.position, m.id`,
    ),
    q<Exam>(
      `select id, subject_id, kind, exam_date::text as exam_date, exam_time, scope, notes
         from exams order by exam_date, id`,
    ),
    q<Session>(
      `select id, session_date::text as session_date, subject_id, minutes, material_ids, notes
         from study_sessions order by session_date desc, id desc limit 5000`,
    ),
    q<Habit>(`select log_date::text as log_date, kind, count, note from habit_logs order by log_date desc`),
    q<{ value: unknown }>(`select value from settings where key = 'app'`),
  ]);

  return {
    today: todayIn(TZ),
    tz: TZ,
    subjects,
    chapters,
    materials,
    exams,
    sessions: sessions.map((s) => ({ ...s, material_ids: Array.from(s.material_ids ?? [], Number) })),
    habits,
    settings: mergeSettings(settingsRows[0]?.value),
  };
}
