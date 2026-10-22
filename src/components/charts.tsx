'use client';
import { addDays, daysInMonth, dow, eachDay, fmt, startOfWeek } from '@/lib/dates';

export interface Bar {
  label: string;
  value: number;
  hint?: string;
}

export function BarChart({
  data,
  color,
  target,
  targetLabel,
  labelEvery = 1,
  format = (n: number) => String(n),
}: {
  data: Bar[];
  color: string;
  target?: number;
  targetLabel?: string;
  labelEvery?: number;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, target ?? 0, ...data.map((d) => d.value));
  return (
    <div className="bars" role="img" aria-label="Bar chart">
      {data.map((d, i) => (
        <div className="col1" key={i} title={d.hint ?? `${d.label}: ${format(d.value)}`}>
          <span className="val">{d.value > 0 ? format(d.value) : ''}</span>
          <div className="plot">
            <div className={`bar ${d.value === 0 ? 'zero' : ''}`} style={{ height: `${(d.value / max) * 100}%`, ['--c' as string]: color }} />
          </div>
          <span className="lbl">{i % labelEvery === 0 ? d.label : ''}</span>
        </div>
      ))}
      {target !== undefined && target > 0 && (
        <div className="target" style={{ bottom: `${18 + (Math.min(target, max) / max) * 96}px` }}>
          <span>{targetLabel ?? `target ${target}`}</span>
        </div>
      )}
    </div>
  );
}

/** GitHub-style grid: one column per week, one row per weekday. level(date) is 0..4. */
export function Heatmap({
  from,
  to,
  today,
  weekStart,
  color,
  level,
  title,
}: {
  from: string;
  to: string;
  today: string;
  weekStart: 0 | 1;
  color: string;
  level: (d: string) => number;
  title: (d: string) => string;
}) {
  const first = startOfWeek(from, weekStart);
  const cells: { d: string; pad: boolean }[] = [];
  for (const d of eachDay(first, addDays(startOfWeek(to, weekStart), 6))) {
    cells.push({ d, pad: d < from || d > to });
  }
  const shade = (lv: number) =>
    lv <= 0 ? undefined : `color-mix(in srgb, ${color} ${[0, 28, 50, 75, 100][Math.min(4, lv)]}%, var(--cell))`;
  return (
    <div>
      <div className="heat" style={{ gridTemplateColumns: `repeat(${cells.length / 7}, 1fr)` }} role="img" aria-label="Activity heatmap">
        {cells.map(({ d, pad }) => (
          <i key={d} className={pad ? 'pad' : d === today ? 'today' : ''} title={pad ? '' : title(d)} style={pad ? undefined : { background: shade(level(d)) }} />
        ))}
      </div>
      <div className="legend">
        less
        {[0, 1, 2, 3, 4].map((l) => (
          <i key={l} style={{ background: shade(l) ?? 'var(--cell)' }} />
        ))}
        more
      </div>
    </div>
  );
}

export interface MatrixRow {
  label: string;
  color: string;
  /** value per date, 0 = missed */
  value: (d: string) => number;
}

/**
 * Active vs missed grid. Up to ~35 days it shows one cell per day;
 * longer ranges collapse to one cell per week (shaded by how many days were active).
 */
export function Matrix({
  from,
  to,
  today,
  weekStart,
  rows,
}: {
  from: string;
  to: string;
  today: string;
  weekStart: 0 | 1;
  rows: MatrixRow[];
}) {
  const days = eachDay(from, to);
  const byWeek = days.length > 35;
  const cols: { key: string; lo: string; hi: string }[] = [];
  if (byWeek) {
    for (let w = startOfWeek(from, weekStart); w <= to; w = addDays(w, 7)) {
      const hi = addDays(w, 6);
      cols.push({ key: w, lo: w < from ? from : w, hi: hi > to ? to : hi });
    }
  } else {
    for (const d of days) cols.push({ key: d, lo: d, hi: d });
  }
  const tmpl = `64px repeat(${cols.length}, minmax(0, 1fr))`;
  return (
    <div className="matrix" style={{ gridTemplateColumns: tmpl }} role="img" aria-label="Active and missed days">
      <span />
      {cols.map((c) => (
        <span className="hd" key={c.key}>
          {byWeek ? '' : ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dow(c.lo)]}
        </span>
      ))}
      {rows.map((r) => (
        <MatrixLine key={r.label} row={r} cols={cols} today={today} byWeek={byWeek} />
      ))}
      <span />
      <span className="tiny muted" style={{ gridColumn: `2 / span ${Math.max(1, Math.ceil(cols.length / 2))}` }}>
        {fmt(from, { day: 'numeric', month: 'short' })}
      </span>
      <span className="tiny muted" style={{ gridColumn: `${2 + Math.ceil(cols.length / 2)} / -1`, textAlign: 'right' }}>
        {fmt(to, { day: 'numeric', month: 'short' })}
      </span>
    </div>
  );
}

function MatrixLine({ row, cols, today, byWeek }: { row: MatrixRow; cols: { key: string; lo: string; hi: string }[]; today: string; byWeek: boolean }) {
  return (
    <>
      <span className="rowlbl">{row.label}</span>
      {cols.map((c) => {
        let active = 0;
        let span = 0;
        for (const d of eachDay(c.lo, c.hi)) {
          span++;
          if (row.value(d) > 0) active++;
        }
        const frac = span ? active / span : 0;
        const bg = active === 0 ? undefined : byWeek ? `color-mix(in srgb, ${row.color} ${20 + frac * 80}%, var(--cell))` : row.color;
        const isToday = !byWeek && c.lo === today;
        return (
          <i
            key={c.key}
            className={isToday ? 'today' : ''}
            style={{ background: bg }}
            title={byWeek ? `Week of ${fmt(c.lo, { day: 'numeric', month: 'short' })}: ${active}/${span} days` : `${fmt(c.lo, { weekday: 'short', day: 'numeric', month: 'short' })}: ${active ? 'active' : 'missed'}`}
          />
        );
      })}
    </>
  );
}

export function MonthCalendar({
  month,
  today,
  weekStart,
  selected,
  onSelect,
  dots,
}: {
  month: string; // YYYY-MM-01
  today: string;
  weekStart: 0 | 1;
  selected: string | null;
  onSelect: (d: string) => void;
  dots: (d: string) => string[];
}) {
  const lead = (dow(month) - weekStart + 7) % 7;
  const n = daysInMonth(month);
  const heads = weekStart === 1 ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return (
    <div className="cal">
      {heads.map((h, i) => (
        <span className="dh" key={i}>
          {h}
        </span>
      ))}
      {Array.from({ length: lead }, (_, i) => (
        <button className="blank" key={`b${i}`} tabIndex={-1} aria-hidden />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const d = month.slice(0, 8) + String(i + 1).padStart(2, '0');
        return (
          <button
            key={d}
            className={[d === selected ? 'sel' : '', d === today ? 'today' : '', d > today ? 'future' : ''].join(' ')}
            onClick={() => onSelect(d)}
            aria-label={fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}
          >
            <span>{i + 1}</span>
            <span className="dots">
              {dots(d).map((c, k) => (
                <i key={k} style={{ background: c }} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
