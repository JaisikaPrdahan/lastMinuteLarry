'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { AppState, Exam, ExamKind, Scope } from '@/lib/types';
import { deleteExam, saveExam } from '@/lib/actions';
import { buildPlan, inScope, nextUnits, type ExamPlan } from '@/lib/planner';
import { fmtMinutes } from '@/lib/stats';
import { fmt, relDay } from '@/lib/dates';
import { Empty, Err, Icon, Progress, Seg, Sheet, statusBadge, useRun } from './ui';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'ppt', label: 'PPTs / notes only' },
  { value: 'program', label: 'Programs only' },
  { value: 'all', label: 'Everything in the subject' },
];
const SCOPE_SHORT: Record<Scope, string> = { ppt: 'PPTs', program: 'Programs', all: 'All units' };

export default function ExamsView({ state }: { state: AppState }) {
  const { today, subjects, exams, settings } = state;
  const plan = useMemo(() => buildPlan(state), [state]);
  const [editing, setEditing] = useState<Exam | 'new' | null>(null);
  const { error, run } = useRun();

  const upcoming = plan.byDate;
  const past = exams.filter((e) => e.exam_date < today).sort((a, b) => b.exam_date.localeCompare(a.exam_date));
  const subjectName = (id: number) => subjects.find((s) => s.id === id);

  return (
    <div className="stack">
      <div className="row between" style={{ marginBottom: 14 }}>
        <h1>Exams</h1>
        <button className="btn primary" onClick={() => setEditing('new')} disabled={!subjects.length}>
          <Icon name="plus" /> Add exam
        </button>
      </div>

      {!subjects.length && (
        <section className="card">
          <Empty>
            Add your subjects first, then come back to schedule exams.
            <br />
            <Link href="/subjects" className="btn primary">
              Go to Subjects
            </Link>
          </Empty>
        </section>
      )}

      {subjects.length > 0 && exams.length === 0 && (
        <section className="card">
          <Empty>
            No exams added yet.
            <br />
            Add theory and practical exam dates to get a priority plan.
          </Empty>
        </section>
      )}

      {upcoming.length > 0 && (
        <>
          <div className="section-title">
            <h2>What to focus on</h2>
            <span className="small muted">
              {fmtMinutes(Math.round(settings.weekdayHours * 60))}/weekday · {fmtMinutes(Math.round(settings.weekendHours * 60))}/weekend
            </span>
          </div>
          <div className="stack">
            {plan.exams.map((p, i) => (
              <PriorityCard key={p.exam.id} p={p} rank={i + 1} state={state} />
            ))}
          </div>
          <p className="tiny muted" style={{ margin: '8px 2px 0' }}>
            Ranked by how much of your available study time is needed to finish everything due on or before that exam. Change your hours and minutes-per-unit in{' '}
            <Link href="/settings" style={{ color: 'var(--accent)' }}>
              Settings
            </Link>
            .
          </p>

          <div className="section-title">
            <h2>Upcoming exams</h2>
          </div>
          <div className="grid two">
            {upcoming.map((p) => (
              <ExamCard key={p.exam.id} p={p} today={today} onEdit={() => setEditing(p.exam)} />
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <details style={{ marginTop: 18 }}>
          <summary className="small strong muted" style={{ cursor: 'pointer', padding: '6px 2px' }}>
            Past exams ({past.length})
          </summary>
          <div className="stack" style={{ marginTop: 8 }}>
            {past.map((e) => {
              const s = subjectName(e.subject_id);
              return (
                <div key={e.id} className="card row">
                  <span className="dot" style={{ background: s?.color }} />
                  <div style={{ flex: 1 }}>
                    <p className="strong">
                      {s?.name} <span className="muted">({e.kind})</span>
                    </p>
                    <p className="small muted">{fmt(e.exam_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <button className="btn ghost icon danger" aria-label="Delete exam" onClick={() => window.confirm('Delete this exam?') && run(() => deleteExam(e.id))}>
                    <Icon name="trash" />
                  </button>
                </div>
              );
            })}
          </div>
        </details>
      )}
      <Err>{error}</Err>

      {editing && <ExamSheet state={state} exam={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function PriorityCard({ p, rank, state }: { p: ExamPlan; rank: number; state: AppState }) {
  const next = nextUnits(state, p.exam, 3);
  const load = p.load === Infinity ? null : Math.round(p.load * 100);
  return (
    <section className="card">
      <div className="priority">
        <span className="rank">{rank}</span>
        <div style={{ minWidth: 0 }}>
          <p className="strong">
            <span className="dot" style={{ background: p.subject?.color, display: 'inline-block', marginRight: 8 }} />
            {p.subject?.name} <span className="muted">{p.exam.kind}</span>
          </p>
          <p className="small muted">
            {relDay(p.exam.exam_date, state.today)}
            {p.daysLeft > 1 ? ` · ${p.daysLeft} days` : ''} · {p.remainingUnits} of {p.totalUnits} units left (~{fmtMinutes(p.ownMinutes)})
          </p>
        </div>
        {statusBadge(p.status)}
      </div>
      {p.status !== 'done' && (
        <div className="col" style={{ marginTop: 10, gap: 6 }}>
          <p className="small">
            Needs <strong>~{fmtMinutes(p.neededPerDay)}/day</strong> for {p.studyDays} day{p.studyDays === 1 ? '' : 's'}; you’ve planned ~{fmtMinutes(p.availablePerDay)}/day.
            {p.cumulativeMinutes > p.ownMinutes && ' Earlier exams share the same hours.'}
          </p>
          <Progress value={Math.min(p.load === Infinity ? 1 : p.load, 1)} max={1} color={p.status === 'behind' ? 'var(--bad)' : p.status === 'tight' ? 'var(--warn)' : 'var(--good)'} />
          <p className="tiny muted">{load === null ? 'No study time left before this exam.' : `${load}% of your available time before this exam is needed.`}</p>
          {next.length > 0 && (
            <p className="small">
              <span className="muted">Start with: </span>
              {next.map((m) => m.title).join(', ')}
              {p.remainingUnits > next.length ? '…' : ''}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function ExamCard({ p, today, onEdit }: { p: ExamPlan; today: string; onEdit: () => void }) {
  const e = p.exam;
  return (
    <section className="card col" style={{ gap: 10 }}>
      <div className="row top">
        <span className="dot" style={{ background: p.subject?.color, marginTop: 6 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="strong">
            {p.subject?.name} <span className="badge">{e.kind === 'theory' ? 'Theory' : 'Practical'}</span>
          </p>
          <p className="small muted">
            {fmt(e.exam_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            {e.exam_time ? ` · ${e.exam_time}` : ''}
          </p>
        </div>
        <span className={`badge ${p.daysLeft <= 3 ? 'bad' : p.daysLeft <= 10 ? 'warn' : 'accent'}`}>{relDay(e.exam_date, today) === 'Today' ? 'Today' : `${p.daysLeft}d`}</span>
      </div>
      <Progress value={p.doneUnits} max={p.totalUnits} color={p.subject?.color} />
      <div className="row between">
        <span className="small muted">
          {p.doneUnits}/{p.totalUnits} units · {SCOPE_SHORT[e.scope]}
        </span>
        <button className="btn small" onClick={onEdit}>
          <Icon name="edit" /> Edit
        </button>
      </div>
      {p.totalUnits === 0 && <p className="tiny" style={{ color: 'var(--warn)' }}>No units match this exam’s scope yet. Add units in Subjects or change the scope.</p>}
      {e.notes && <p className="small muted">{e.notes}</p>}
    </section>
  );
}

function ExamSheet({ state, exam, onClose }: { state: AppState; exam: Exam | null; onClose: () => void }) {
  const { subjects, materials, today } = state;
  const { pending, error, run } = useRun();
  const [subjectId, setSubjectId] = useState(String(exam?.subject_id ?? subjects[0]?.id ?? ''));
  const [kind, setKind] = useState<ExamKind>(exam?.kind ?? 'theory');
  const [date, setDate] = useState(exam?.exam_date ?? '');
  const [time, setTime] = useState(exam?.exam_time ?? '');
  const [scope, setScope] = useState<Scope>(exam?.scope ?? 'ppt');
  const [notes, setNotes] = useState(exam?.notes ?? '');

  const inScopeCount = materials.filter((m) => m.subject_id === Number(subjectId) && inScope(m, scope)).length;

  function changeKind(k: ExamKind) {
    setKind(k);
    if (!exam) setScope(k === 'practical' ? 'program' : 'ppt'); // sensible default, still editable
  }

  return (
    <Sheet title={exam ? 'Edit exam' : 'Add exam'} onClose={onClose}>
      <form
        className="col gap-l"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveExam({ id: exam?.id, subjectId: Number(subjectId), kind, date, time: time || null, scope, notes }), onClose);
        }}
      >
        <label className="field">
          Subject
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <Seg
          value={kind}
          onChange={changeKind}
          options={[
            { value: 'theory', label: 'Theory exam' },
            { value: 'practical', label: 'Practical exam' },
          ]}
        />
        <div className="grid two">
          <label className="field">
            Date
            <input className="input" type="date" value={date} min={exam ? undefined : today} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="field">
            Time (optional)
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <label className="field">
          Covers
          <select className="input" value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
            {SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="hint tiny" style={{ color: inScopeCount ? undefined : 'var(--warn)' }}>
            {inScopeCount ? `${inScopeCount} unit${inScopeCount === 1 ? '' : 's'} currently in this scope` : 'No units in this scope yet. You can add them later.'}
          </span>
        </label>
        <label className="field">
          Notes (optional)
          <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Room, syllabus notes…" />
        </label>
        <Err>{error}</Err>
        <div className="row">
          {exam && (
            <button type="button" className="btn danger" onClick={() => window.confirm('Delete this exam?') && run(() => deleteExam(exam.id), onClose)}>
              <Icon name="trash" /> Delete
            </button>
          )}
          <button className="btn primary right" disabled={pending || !date || !subjectId}>
            {pending ? 'Saving…' : exam ? 'Save' : 'Add exam'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
