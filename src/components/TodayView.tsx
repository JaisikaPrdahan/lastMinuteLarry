'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { AppState, Habit, HabitKind } from '@/lib/types';
import { HABIT_LABEL, KIND_LABEL } from '@/lib/types';
import { setHabit, toggleMaterial } from '@/lib/actions';
import { buildPlan } from '@/lib/planner';
import { activeDates, countIn, fmtMinutes, streaks } from '@/lib/stats';
import { addDays, fmt, relDay, startOfWeek } from '@/lib/dates';
import { Check, Err, Icon, Ring, statusBadge, useRun } from './ui';

const TILES: { kind: HabitKind; emoji: string; color: string }[] = [
  { kind: 'gym', emoji: '🏋️', color: 'var(--c-gym)' },
  { kind: 'dsa', emoji: '🧩', color: 'var(--c-dsa)' },
  { kind: 'breakfast', emoji: '🍳', color: 'var(--c-mess)' },
  { kind: 'lunch', emoji: '🍛', color: 'var(--c-mess)' },
  { kind: 'dinner', emoji: '🍽️', color: 'var(--c-mess)' },
];

export default function TodayView({ state }: { state: AppState }) {
  const { today, settings } = state;
  const [date, setDate] = useState(today);
  const [habits, setHabits] = useState<Habit[]>(state.habits);
  const { pending, error, run } = useRun();

  useEffect(() => setHabits(state.habits), [state.habits]);
  useEffect(() => setDate((d) => (d > state.today ? state.today : d)), [state.today]);

  const live = { ...state, habits };
  const plan = useMemo(() => buildPlan(state), [state]);
  const find = (k: HabitKind) => habits.find((h) => h.log_date === date && h.kind === k);

  function toggle(kind: HabitKind) {
    const on = !find(kind);
    setHabits((prev) => [
      ...prev.filter((h) => !(h.log_date === date && h.kind === kind)),
      ...(on ? [{ log_date: date, kind, count: 1, note: null }] : []),
    ]);
    run(() => setHabit(date, kind, on, 1));
  }
  function setDsaCount(n: number) {
    const count = Math.max(1, Math.min(500, n));
    setHabits((prev) => prev.map((h) => (h.log_date === date && h.kind === 'dsa' ? { ...h, count } : h)));
    run(() => setHabit(date, 'dsa', true, count));
  }

  // week progress
  const ws = startOfWeek(date, settings.weekStart);
  const we = addDays(ws, 6);
  const weekRings = [
    { key: 'study' as const, label: 'Study days', target: settings.studyTarget, color: 'var(--c-study)' },
    { key: 'gym' as const, label: 'Gym days', target: settings.gymTarget, color: 'var(--c-gym)' },
    { key: 'dsa' as const, label: 'DSA days', target: settings.dsaTarget, color: 'var(--c-dsa)' },
  ].map((r) => {
    const set = activeDates(live, r.key);
    return { ...r, n: countIn(set, ws, we), streak: streaks(set, state.today).current };
  });

  const studiedMin = state.sessions.filter((s) => s.session_date === date).reduce((a, s) => a + s.minutes, 0);
  const dsa = find('dsa');
  const top = plan.exams[0];
  const nextExam = plan.byDate[0];

  return (
    <div className="stack">
      <div className="row between" style={{ marginBottom: 14 }}>
        <div>
          <h1>{relDay(date, today)}</h1>
          <p className="muted small">{fmt(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="row gap-s">
          <button className="btn icon" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
            <Icon name="left" />
          </button>
          <button className="btn icon" aria-label="Next day" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>
            <Icon name="right" />
          </button>
        </div>
      </div>

      <section className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2>Check-ins</h2>
          {pending && <span className="tiny muted">Saving…</span>}
        </div>
        <div className="tiles5">
          {TILES.map((t) => {
            const on = !!find(t.kind);
            return (
              <button
                key={t.kind}
                className={`tile ${on ? 'on' : ''}`}
                style={{ ['--tint' as string]: `color-mix(in srgb, ${t.color} 20%, var(--card))` }}
                aria-pressed={on}
                onClick={() => toggle(t.kind)}
              >
                <span className="emo">{t.emoji}</span>
                <span>{t.kind === 'breakfast' || t.kind === 'lunch' || t.kind === 'dinner' ? HABIT_LABEL[t.kind] : HABIT_LABEL[t.kind]}</span>
                <span className="state">{on ? 'Done' : t.kind === 'gym' || t.kind === 'dsa' ? 'Tap to check in' : 'At the mess'}</span>
              </button>
            );
          })}
        </div>
        {dsa && (
          <div className="row" style={{ marginTop: 12 }}>
            <span className="small muted">DSA problems solved</span>
            <div className="row gap-s right">
              <button className="btn small icon" onClick={() => setDsaCount(dsa.count - 1)} aria-label="Fewer problems">
                −
              </button>
              <strong style={{ minWidth: 24, textAlign: 'center' }}>{dsa.count}</strong>
              <button className="btn small icon" onClick={() => setDsaCount(dsa.count + 1)} aria-label="More problems">
                +
              </button>
            </div>
          </div>
        )}
        <Err>{error}</Err>
      </section>

      <section className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <h2>This week</h2>
          <span className="small muted">
            {fmt(ws, { day: 'numeric', month: 'short' })} – {fmt(we, { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="row" style={{ justifyContent: 'space-around' }}>
          {weekRings.map((r) => (
            <Ring
              key={r.key}
              value={r.n}
              max={r.target || 7}
              color={r.color}
              label={r.label}
              center={
                <>
                  <span className="big">{r.n}</span>
                  <br />
                  <span className="tiny muted">of {r.target}</span>
                </>
              }
            />
          ))}
        </div>
        <p className="small muted center" style={{ marginTop: 12 }}>
          Streaks: study {weekRings[0].streak}d · gym {weekRings[1].streak}d · DSA {weekRings[2].streak}d
        </p>
      </section>

      <section className="card">
        <div className="row between">
          <div>
            <h2>Study {date === today ? 'today' : 'that day'}</h2>
            <p className="muted small">{studiedMin ? `${fmtMinutes(studiedMin)} logged` : 'Nothing logged yet'}</p>
          </div>
          <Link href="/study" className="btn primary">
            <Icon name="plus" /> Log session
          </Link>
        </div>
      </section>

      <section className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2>Exam focus</h2>
          <Link href="/exams" className="small strong" style={{ color: 'var(--accent)' }}>
            All exams
          </Link>
        </div>
        {!state.subjects.length ? (
          <p className="muted">
            Start by adding your subjects on the <Link href="/subjects" style={{ color: 'var(--accent)' }}>Subjects</Link> tab.
          </p>
        ) : !top ? (
          <p className="muted">
            No upcoming exams. Add exam dates on the <Link href="/exams" style={{ color: 'var(--accent)' }}>Exams</Link> tab to get a daily plan.
          </p>
        ) : (
          <div className="col gap-l">
            <div className="row top">
              <span className="dot" style={{ background: top.subject?.color, marginTop: 6 }} />
              <div style={{ flex: 1 }}>
                <p className="strong">
                  Prioritise {top.subject?.name} <span className="muted">({top.exam.kind})</span>
                </p>
                <p className="small muted">
                  {top.daysLeft === 0 ? 'Exam is today' : `${top.daysLeft} day${top.daysLeft === 1 ? '' : 's'} left`} · {top.remainingUnits} unit
                  {top.remainingUnits === 1 ? '' : 's'} to go · needs ~{fmtMinutes(top.neededPerDay)}/day
                </p>
              </div>
              {statusBadge(top.status)}
            </div>
            {nextExam && nextExam.exam.id !== top.exam.id && (
              <p className="small muted">
                Next exam: {nextExam.subject?.name} {nextExam.exam.kind} on {relDay(nextExam.exam.exam_date, today)}.
              </p>
            )}
            {plan.today.length > 0 ? (
              <div>
                <h3 style={{ marginBottom: 8 }}>
                  Today’s plan <span className="muted small">· ~{fmtMinutes(plan.today.reduce((a, i) => a + i.minutes, 0))}</span>
                </h3>
                <div className="list">
                  {plan.today.map((item) => (
                    <div key={item.exam.id}>
                      <div className="row" style={{ marginBottom: 4 }}>
                        <span className="dot" style={{ background: item.subject?.color }} />
                        <strong>{item.subject?.name}</strong>
                        <span className="small muted right">~{fmtMinutes(item.minutes)}</span>
                      </div>
                      {item.materials.map((m) => (
                        <div key={m.id} className="mat">
                          <Check on={false} label={`Mark ${m.title} done`} onChange={() => run(() => toggleMaterial(m.id, true))} />
                          <span className="title">{m.title}</span>
                          <span className="badge">{KIND_LABEL[m.kind]}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="small muted">
                {plan.todayBudget === 0 ? 'You have used today’s planned study time. Nice work.' : 'Everything for your upcoming exams is covered.'}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
