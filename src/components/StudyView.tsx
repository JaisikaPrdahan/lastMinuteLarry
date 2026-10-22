'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { AppState } from '@/lib/types';
import { KIND_LABEL } from '@/lib/types';
import { deleteSession, logSession } from '@/lib/actions';
import { activeDates, countIn, fmtMinutes, minutesByDate, streaks, weeklyCounts } from '@/lib/stats';
import { addDays, fmt, relDay, startOfWeek } from '@/lib/dates';
import { BarChart, Heatmap } from './charts';
import { Check, Empty, Err, Icon, useRun } from './ui';

const QUICK = [25, 45, 60, 90, 120];

export default function StudyView({ state }: { state: AppState }) {
  const { today, settings, subjects, chapters, materials, sessions } = state;
  const { pending, error, run } = useRun();

  const [date, setDate] = useState(today);
  const [subjectId, setSubjectId] = useState<string>(subjects[0] ? String(subjects[0].id) : '');
  const [picked, setPicked] = useState<number[]>([]);
  const [minutes, setMinutes] = useState('45');
  const [notes, setNotes] = useState('');
  const [markDone, setMarkDone] = useState(true);
  const [formError, setFormError] = useState('');

  const sid = Number(subjectId) || null;
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const matTitle = useMemo(() => new Map(materials.map((m) => [m.id, m.title])), [materials]);
  const open = useMemo(
    () =>
      chapters
        .filter((c) => c.subject_id === sid)
        .map((c) => ({ chapter: c, items: materials.filter((m) => m.chapter_id === c.id && !m.done) }))
        .filter((g) => g.items.length),
    [chapters, materials, sid],
  );

  const set = useMemo(() => activeDates(state, 'study'), [state]);
  const ws = startOfWeek(today, settings.weekStart);
  const totalMin = sessions.reduce((a, s) => a + s.minutes, 0);
  const streak = streaks(set, today);
  const minMap = useMemo(() => minutesByDate(state), [state]);

  const weeks = weeklyCounts(set, addDays(ws, -11 * 7), today, settings.weekStart).map((w) => ({
    label: fmt(w.start, { day: 'numeric', month: 'short' }),
    value: w.count,
    hint: `Week of ${fmt(w.start, { day: 'numeric', month: 'short' })}: ${w.count} day${w.count === 1 ? '' : 's'}`,
  }));

  const level = (d: string) => {
    const m = minMap.get(d) ?? 0;
    return m === 0 ? 0 : m < 30 ? 1 : m < 60 ? 2 : m < 120 ? 3 : 4;
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const mins = Math.round(Number(minutes));
    if (!(mins >= 1 && mins <= 1440)) return setFormError('Enter the time studied in minutes.');
    setFormError('');
    run(
      () => logSession({ date, subjectId: sid, minutes: mins, materialIds: picked, notes, markDone }),
      () => {
        setPicked([]);
        setNotes('');
      },
    );
  }

  const grouped = useMemo(() => {
    const out: { date: string; items: typeof sessions }[] = [];
    for (const s of sessions.slice(0, 40)) {
      const last = out[out.length - 1];
      if (last && last.date === s.session_date) last.items.push(s);
      else out.push({ date: s.session_date, items: [s] });
    }
    return out;
  }, [sessions]);

  return (
    <div className="stack">
      <h1 style={{ marginBottom: 14 }}>Study</h1>

      <div className="grid tiles" style={{ marginBottom: 12 }}>
        <div className="card stat">
          <div className="big">{set.size}</div>
          <div className="lbl">Days studied</div>
        </div>
        <div className="card stat">
          <div className="big">
            {countIn(set, ws, addDays(ws, 6))}
            <span className="muted small"> / {settings.studyTarget}</span>
          </div>
          <div className="lbl">This week</div>
        </div>
        <div className="card stat">
          <div className="big">{fmtMinutes(totalMin)}</div>
          <div className="lbl">Total time</div>
        </div>
        <div className="card stat">
          <div className="big">{streak.current}d</div>
          <div className="lbl">Streak · best {streak.best}d</div>
        </div>
      </div>

      <section className="card">
        <h2 style={{ marginBottom: 12 }}>Log a session</h2>
        {!subjects.length ? (
          <Empty>
            Add a subject first.
            <br />
            <Link href="/subjects" className="btn primary">
              Go to Subjects
            </Link>
          </Empty>
        ) : (
          <form onSubmit={submit} className="col gap-l">
            <div className="grid two">
              <label className="field">
                Date
                <input className="input" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} required />
              </label>
              <label className="field">
                Subject
                <select
                  className="input"
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    setPicked([]);
                  }}
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="col gap-s">
              <span className="small strong muted">Units covered (optional)</span>
              {open.length === 0 ? (
                <p className="small muted">
                  No open units in this subject. Add chapters and PPTs/programs in{' '}
                  <Link href={sid ? `/subjects/${sid}` : '/subjects'} style={{ color: 'var(--accent)' }}>
                    Subjects
                  </Link>
                  .
                </p>
              ) : (
                <div className="scroll">
                  {open.map((g) => (
                    <div key={g.chapter.id} style={{ padding: '6px 0' }}>
                      <p className="tiny strong muted" style={{ textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
                        {g.chapter.title}
                      </p>
                      {g.items.map((m) => (
                        <div className="mat" key={m.id}>
                          <Check
                            on={picked.includes(m.id)}
                            label={`Covered ${m.title}`}
                            onChange={(v) => setPicked((p) => (v ? [...p, m.id] : p.filter((x) => x !== m.id)))}
                          />
                          <span className="title">{m.title}</span>
                          <span className="badge">{KIND_LABEL[m.kind]}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {picked.length > 0 && (
                <label className="row small" style={{ gap: 8 }}>
                  <Check on={markDone} onChange={setMarkDone} label="Mark selected units as completed" />
                  Mark {picked.length} selected unit{picked.length === 1 ? '' : 's'} as completed
                </label>
              )}
            </div>

            <div className="col gap-s">
              <label className="field">
                Time spent (minutes)
                <input className="input" type="number" inputMode="numeric" min={1} max={1440} value={minutes} onChange={(e) => setMinutes(e.target.value)} required />
              </label>
              <div className="chips">
                {QUICK.map((q) => (
                  <button type="button" key={q} className={`chip ${minutes === String(q) ? 'on' : ''}`} onClick={() => setMinutes(String(q))}>
                    {fmtMinutes(q)}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              Notes (optional)
              <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            </label>

            <Err>{formError || error}</Err>
            <button className="btn primary" disabled={pending}>
              {pending ? 'Saving…' : 'Save session'}
            </button>
          </form>
        )}
      </section>

      <div className="section-title">
        <h2>Days studied per week</h2>
        <span className="small muted">last 12 weeks</span>
      </div>
      <section className="card">
        <BarChart data={weeks} color="var(--c-study)" target={settings.studyTarget} targetLabel={`goal ${settings.studyTarget}`} labelEvery={2} />
      </section>

      <div className="section-title">
        <h2>Study calendar</h2>
        <span className="small muted">last 26 weeks</span>
      </div>
      <section className="card">
        <Heatmap
          from={addDays(ws, -25 * 7)}
          to={today}
          today={today}
          weekStart={settings.weekStart}
          color="var(--c-study)"
          level={level}
          title={(d) => `${fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}: ${minMap.get(d) ? fmtMinutes(minMap.get(d)!) : 'no study'}`}
        />
      </section>

      <div className="section-title">
        <h2>Recent sessions</h2>
      </div>
      {grouped.length === 0 ? (
        <section className="card">
          <Empty>No sessions yet. Log your first one above.</Empty>
        </section>
      ) : (
        grouped.map((g) => (
          <section className="card" key={g.date}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <strong>{relDay(g.date, today)}</strong>
              <span className="small muted">{fmtMinutes(g.items.reduce((a, s) => a + s.minutes, 0))}</span>
            </div>
            <div className="list">
              {g.items.map((s) => {
                const sub = s.subject_id ? subjectById.get(s.subject_id) : undefined;
                return (
                  <div key={s.id} className="row top">
                    <span className="dot" style={{ background: sub?.color ?? 'var(--muted)', marginTop: 6 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p>
                        <strong>{sub?.name ?? 'General'}</strong> · {fmtMinutes(s.minutes)}
                      </p>
                      {s.material_ids.length > 0 && (
                        <p className="small muted">{s.material_ids.map((id) => matTitle.get(id) ?? 'removed unit').join(', ')}</p>
                      )}
                      {s.notes && <p className="small muted">{s.notes}</p>}
                    </div>
                    <button
                      className="btn ghost icon danger"
                      aria-label="Delete session"
                      onClick={() => window.confirm('Delete this session? (Completed units stay completed.)') && run(() => deleteSession(s.id))}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
