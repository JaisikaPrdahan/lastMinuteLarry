'use client';
import { useState } from 'react';
import type { AppState } from '@/lib/types';
import { addSubject, seedStarter } from '@/lib/actions';
import { diffDays } from '@/lib/dates';
import FolderGrid from './FolderGrid';
import { COLORS, ColorPick, Empty, Err, Icon, Sheet, useRun } from './ui';

export default function SubjectsView({ state }: { state: AppState }) {
  const { subjects, chapters, materials, exams, today } = state;
  const { pending, error, run, setError } = useRun();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[subjects.length % COLORS.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(
      () => addSubject(name, color),
      () => {
        setAdding(false);
        setName('');
      },
    );
  }

  return (
    <div className="stack">
      <div className="row between" style={{ marginBottom: 14 }}>
        <h1>Subjects</h1>
        <button
          className="btn primary"
          onClick={() => {
            setError(null);
            setColor(COLORS[subjects.length % COLORS.length]);
            setAdding(true);
          }}
        >
          <Icon name="plus" /> Add subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <section className="card">
          <Empty>
            <p className="strong" style={{ color: 'var(--text)' }}>
              No subjects yet
            </p>
            <p className="small">Add them one by one, or start with the four you mentioned.</p>
            <div className="row wrap" style={{ justifyContent: 'center', marginTop: 12 }}>
              <button className="btn primary" disabled={pending} onClick={() => run(() => seedStarter())}>
                {pending ? 'Adding…' : 'Add FACD, WSMA, SE, PCAP'}
              </button>
            </div>
            <p className="tiny" style={{ marginTop: 8 }}>
              Creates each with your PPT/program counts in an “Unsorted” chapter. Move units into real chapters later.
            </p>
            <Err>{error}</Err>
          </Empty>
        </section>
      ) : (
        <FolderGrid
          subjects={subjects}
          chapters={chapters}
          materials={materials}
          examDays={Object.fromEntries(
            subjects.map((s) => {
              const next = exams.filter((e) => e.subject_id === s.id && e.exam_date >= today).sort((x, y) => x.exam_date.localeCompare(y.exam_date))[0];
              return [s.id, next ? diffDays(today, next.exam_date) : null];
            }),
          )}
        />
      )}

      {adding && (
        <Sheet title="Add subject" onClose={() => setAdding(false)}>
          <form onSubmit={submit} className="col gap-l">
            <label className="field">
              Name
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus required placeholder="e.g. FACD" />
            </label>
            <div className="col gap-s">
              <span className="small strong muted">Colour</span>
              <ColorPick value={color} onChange={setColor} />
            </div>
            <Err>{error}</Err>
            <button className="btn primary" disabled={pending || !name.trim()}>
              {pending ? 'Saving…' : 'Add subject'}
            </button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
