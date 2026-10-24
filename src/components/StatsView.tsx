'use client';
import { useMemo, useState } from 'react';
import type { AppState, HabitKind } from '@/lib/types';
import { HABIT_LABEL, MEALS } from '@/lib/types';
import { activeDates, countIn, fmtMinutes, minutesBySubject, streaks, weeklyCounts, type Series } from '@/lib/stats';
import { addDays, addMonths, diffDays, eachDay, fmt, monthStart, relDay } from '@/lib/dates';
import { BarChart, Matrix, MonthCalendar } from './charts';
import { Icon, Progress, Seg } from './ui';

type Preset = '7' | '30' | '90' | 'custom';

const SERIES: { key: Series; label: string; color: string; target?: 'studyTarget' | 'gymTarget' | 'dsaTarget' }[] = [
  { key: 'study', label: 'Study', color: 'var(--c-study)', target: 'studyTarget' },
  { key: 'gym', label: 'Gym', color: 'var(--c-gym)', target: 'gymTarget' },
  { key: 'dsa', label: 'DSA', color: 'var(--c-dsa)', target: 'dsaTarget' },
  { key: 'mess', label: 'Mess', color: 'var(--c-mess)' },
];

export default function StatsView({ state }: { state: AppState }) {
  const { today, settings, habits, sessions, subjects } = state;
  const [preset, setPreset] = useState<Preset>('30');
  const [cFrom, setCFrom] = useState(addDays(today, -29));
  const [cTo, setCTo] = useState(today);
  const [month, setMonth] = useState(monthStart(today));
  const [selected, setSelected] = useState<string | null>(today);

  let to = today;
  let from = addDays(today, -(Number(preset) - 1));
  if (preset === 'custom') {
    to = cTo > today ? today : cTo;
    from = cFrom > to ? to : cFrom;
    if (diffDays(from, to) > 365) from = addDays(to, -365);
  }
  const len = diffDays(from, to) + 1;

  const sets = useMemo(
    () => Object.fromEntries(SERIES.map((s) => [s.key, activeDates(state, s.key)])) as Record<Series, Set<string>>,
    [state],
  );
  const inRange = <T extends { log_date: string }>(rows: T[]) => rows.filter((r) => r.log_date >= from && r.log_date <= to);
  const minutes = sessions.filter((s) => s.session_date >= from && s.session_date <= to).reduce((a, s) => a + s.minutes, 0);
  const dsaProblems = inRange(habits.filter((h) => h.kind === 'dsa')).reduce((a, h) => a + h.count, 0);
  const mealCount = (k: HabitKind) => inRange(habits.filter((h) => h.kind === k)).length;
  const meals = MEALS.reduce((a, k) => a + mealCount(k), 0);
  const junkRows = inRange(habits.filter((h) => h.kind === 'junk'));
  const junkTotal = junkRows.reduce((a, h) => a + h.count, 0);
  const junkDays = junkRows.length;
  const junkBars = useMemo(() => {
    const byDate = new Map(junkRows.map((h) => [h.log_date, h.count]));
    if (len <= 14) {
      return {
        every: 1,
        data: eachDay(from, to).map((d) => ({ label: fmt(d, { day: 'numeric' }), value: byDate.get(d) ?? 0, hint: `${fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}: ${byDate.get(d) ?? 0}` })),
      };
    }
    const w = weeklyCounts(new Set<string>(), from, to, settings.weekStart);
    const data = w.map((x) => {
      let sum = 0;
      for (const d of eachDay(x.start < from ? from : x.start, addDays(x.start, 6) > to ? to : addDays(x.start, 6))) sum += byDate.get(d) ?? 0;
      return { label: fmt(x.start, { day: 'numeric', month: 'short' }), value: sum, hint: `Week of ${fmt(x.start, { day: 'numeric', month: 'short' })}: ${sum}` };
    });
    return { every: Math.max(1, Math.ceil(data.length / 8)), data };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, from, to, len, settings.weekStart]);
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  const bySubject = useMemo(() => {
    const m = minutesBySubject(state, from, to);
    return [...m.entries()]
      .map(([id, min]) => ({ id, min, s: subjects.find((x) => x.id === id) }))
      .sort((a, b) => b.min - a.min);
  }, [state, from, to, subjects]);
  const maxSubject = Math.max(1, ...bySubject.map((x) => x.min));

  const weeksFor = (key: Series) => {
    const w = weeklyCounts(sets[key], from, to, settings.weekStart);
    return {
      every: Math.max(1, Math.ceil(w.length / 8)),
      data: w.map((x) => ({
        label: fmt(x.start, { day: 'numeric', month: 'short' }),
        value: x.count,
        hint: `Week of ${fmt(x.start, { day: 'numeric', month: 'short' })}: ${x.count} of ${x.days} day${x.days === 1 ? '' : 's'}`,
      })),
    };
  };

  // calendar
  const dots = (d: string) => SERIES.filter((s) => sets[s.key].has(d)).map((s) => s.color);
  const dayHabits = selected ? habits.filter((h) => h.log_date === selected) : [];
  const daySessions = selected ? sessions.filter((s) => s.session_date === selected) : [];
  const subName = (id: number | null) => subjects.find((s) => s.id === id)?.name ?? 'General';

  return (
    <div className="stack">
      <div className="row between wrap" style={{ marginBottom: 14 }}>
        <h1>Stats</h1>
        <Seg
          value={preset}
          onChange={setPreset}
          options={[
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
      </div>

      {preset === 'custom' && (
        <section className="card grid two">
          <label className="field">
            From
            <input className="input" type="date" value={cFrom} max={cTo} onChange={(e) => e.target.value && setCFrom(e.target.value)} />
          </label>
          <label className="field">
            To
            <input className="input" type="date" value={cTo} min={cFrom} max={today} onChange={(e) => e.target.value && setCTo(e.target.value)} />
          </label>
        </section>
      )}
      <p className="small muted" style={{ margin: '0 2px 10px' }}>
        {fmt(from, { day: 'numeric', month: 'short', year: 'numeric' })} – {fmt(to, { day: 'numeric', month: 'short', year: 'numeric' })} · {len} day{len === 1 ? '' : 's'}
      </p>

      <div className="grid tiles">
        <Tile color="var(--c-study)" big={`${countIn(sets.study, from, to)}`} sub={`/ ${len}`} label="Study days" note={`${pct(countIn(sets.study, from, to), len)}% · ${fmtMinutes(minutes)}`} />
        <Tile color="var(--c-gym)" big={`${countIn(sets.gym, from, to)}`} sub={`/ ${len}`} label="Gym days" note={`${pct(countIn(sets.gym, from, to), len)}% consistent`} />
        <Tile color="var(--c-dsa)" big={`${countIn(sets.dsa, from, to)}`} sub={`/ ${len}`} label="DSA days" note={dsaProblems ? `${dsaProblems} problems` : `${pct(countIn(sets.dsa, from, to), len)}%`} />
        <Tile color="var(--c-mess)" big={`${pct(meals, len * 3)}%`} label="Mess meals" note={`${meals} of ${len * 3} logged`} />
        <Tile color="var(--c-junk)" big={`${junkTotal}`} label="Junk food" note={junkTotal ? `${junkDays} day${junkDays === 1 ? '' : 's'} · ${(junkTotal / len).toFixed(1)}/day` : 'none logged'} />
      </div>

      <div className="section-title">
        <h2>Active vs missed days</h2>
        <span className="small muted">{len > 35 ? 'one cell per week' : 'one cell per day'}</span>
      </div>
      <section className="card">
        <Matrix
          from={from}
          to={to}
          today={today}
          weekStart={settings.weekStart}
          rows={SERIES.map((s) => ({ label: s.label, color: s.color, value: (d) => (sets[s.key].has(d) ? 1 : 0) }))}
        />
      </section>

      <div className="section-title">
        <h2>Weekly progress</h2>
        <span className="small muted">days active per week</span>
      </div>
      <div className="grid two">
        {SERIES.filter((s) => s.key !== 'mess').map((s) => {
          const w = weeksFor(s.key);
          const target = s.target ? settings[s.target] : undefined;
          return (
            <section className="card" key={s.key}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <h3>{s.label}</h3>
                {target ? <span className="small muted">goal {target}/week</span> : null}
              </div>
              <BarChart data={w.data} color={s.color} target={target} targetLabel={target ? `goal ${target}` : undefined} labelEvery={w.every} />
            </section>
          );
        })}
        <section className="card">
          <h3 style={{ marginBottom: 10 }}>Mess breakdown</h3>
          <div className="col" style={{ gap: 12 }}>
            {MEALS.map((k) => (
              <div key={k}>
                <div className="row between small" style={{ marginBottom: 4 }}>
                  <span className="strong">{HABIT_LABEL[k]}</span>
                  <span className="muted">
                    {mealCount(k)}/{len} · {pct(mealCount(k), len)}%
                  </span>
                </div>
                <Progress value={mealCount(k)} max={len} color="var(--c-mess)" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="section-title">
        <h2>Junk food</h2>
        <span className="small muted">{len <= 14 ? 'times per day' : 'times per week'}</span>
      </div>
      <section className="card">
        <BarChart data={junkBars.data} color="var(--c-junk)" labelEvery={junkBars.every} />
      </section>

      <div className="section-title">
        <h2>Streaks</h2>
        <span className="small muted">all time</span>
      </div>
      <div className="grid tiles">
        {SERIES.map((s) => {
          const st = streaks(sets[s.key], today);
          return (
            <section className="card stat" key={s.key}>
              <div className="big" style={{ color: s.color }}>
                {st.current}d
              </div>
              <div className="lbl">
                {s.label} · best {st.best}d
              </div>
            </section>
          );
        })}
      </div>

      <div className="section-title">
        <h2>Time by subject</h2>
        <span className="small muted">{fmtMinutes(minutes)} total</span>
      </div>
      <section className="card">
        {bySubject.length === 0 ? (
          <p className="muted small">No study logged in this range.</p>
        ) : (
          <div className="col" style={{ gap: 12 }}>
            {bySubject.map((x) => (
              <div key={x.id ?? 'general'}>
                <div className="row between small" style={{ marginBottom: 4 }}>
                  <span className="strong">
                    <span className="dot" style={{ background: x.s?.color ?? 'var(--muted)', display: 'inline-block', marginRight: 8 }} />
                    {x.s?.name ?? 'General'}
                  </span>
                  <span className="muted">{fmtMinutes(x.min)}</span>
                </div>
                <Progress value={x.min} max={maxSubject} color={x.s?.color} />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="section-title">
        <h2>Calendar</h2>
        <div className="row gap-s">
          <button className="btn icon small" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
            <Icon name="left" />
          </button>
          <strong className="small" style={{ minWidth: 110, textAlign: 'center' }}>
            {fmt(month, { month: 'long', year: 'numeric' })}
          </strong>
          <button className="btn icon small" aria-label="Next month" disabled={month >= monthStart(today)} onClick={() => setMonth(addMonths(month, 1))}>
            <Icon name="right" />
          </button>
        </div>
      </div>
      <section className="card">
        <MonthCalendar month={month} today={today} weekStart={settings.weekStart} selected={selected} onSelect={setSelected} dots={dots} />
        <div className="legend" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          {SERIES.map((s) => (
            <span key={s.key} className="row" style={{ gap: 5 }}>
              <i style={{ background: s.color, borderRadius: '50%', width: 8, height: 8 }} />
              {s.label}
            </span>
          ))}
        </div>
      </section>
      {selected && (
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>{relDay(selected, today)} · {fmt(selected, { day: 'numeric', month: 'long' })}</h3>
          {daySessions.length === 0 && dayHabits.length === 0 ? (
            <p className="small muted">Nothing logged.</p>
          ) : (
            <div className="col" style={{ gap: 6 }}>
              {daySessions.map((s) => (
                <p key={s.id} className="small">
                  📚 {subName(s.subject_id)} · {fmtMinutes(s.minutes)}
                </p>
              ))}
              {dayHabits.map((h) => (
                <p key={h.kind} className="small">
                  {h.kind === 'gym' ? '🏋️' : h.kind === 'dsa' ? '🧩' : '🍽️'} {HABIT_LABEL[h.kind]}
                  {h.kind === 'dsa' && h.count > 1 ? ` · ${h.count} problems` : ''}
                </p>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Tile({ color, big, sub, label, note }: { color: string; big: string; sub?: string; label: string; note: string }) {
  return (
    <section className="card stat">
      <div className="big" style={{ color }}>
        {big}
        {sub && <span className="muted small"> {sub}</span>}
      </div>
      <div className="lbl">{label}</div>
      <div className="tiny muted" style={{ marginTop: 2 }}>
        {note}
      </div>
    </section>
  );
}
