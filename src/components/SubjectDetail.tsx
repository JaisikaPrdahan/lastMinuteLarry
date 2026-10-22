'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { upload } from '@vercel/blob/client';
import { useRef, useState } from 'react';
import type { AppState, Chapter, Kind, Material } from '@/lib/types';
import { KIND_LABEL } from '@/lib/types';
import {
  addChapter,
  addFile,
  addUnits,
  attachFile,
  deleteChapter,
  deleteMaterial,
  deleteSubject,
  removeFile,
  renameChapter,
  toggleMaterial,
  updateMaterial,
  updateSubject,
} from '@/lib/actions';
import { BLOB_ACCESS } from '@/lib/blob-access';
import { Check, ColorPick, Empty, Err, Icon, Progress, Seg, Sheet, useRun } from './ui';

const MAX_BYTES = 150 * 1024 * 1024;
const safe = (s: string) => s.replace(/[^A-Za-z0-9._ -]+/g, '_').slice(0, 120) || 'file';
const bytes = (n: number | null) =>
  n === null ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'ppt', label: 'PPT / PDF' },
  { value: 'program', label: 'Program' },
  { value: 'other', label: 'Other' },
];

type Target = { chapterId: number } | { materialId: number };
interface Up {
  id: string;
  name: string;
  pct: number;
  error?: string;
}

export default function SubjectDetail({ state, subjectId }: { state: AppState; subjectId: number }) {
  const router = useRouter();
  const subject = state.subjects.find((s) => s.id === subjectId)!;
  const chapters = state.chapters.filter((c) => c.subject_id === subjectId);
  const mats = state.materials.filter((m) => m.subject_id === subjectId);
  const done = mats.filter((m) => m.done).length;
  const { pending, error, run } = useRun();

  const [newChapter, setNewChapter] = useState('');
  const [unitsFor, setUnitsFor] = useState<Chapter | null>(null);
  const [editing, setEditing] = useState<Material | null>(null);
  const [editSubject, setEditSubject] = useState(false);
  const [uploads, setUploads] = useState<Up[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<Target | null>(null);

  function pickFiles(t: Target) {
    target.current = t;
    fileRef.current?.click();
  }

  async function uploadFiles(files: File[], t: Target) {
    for (const file of files) {
      const id = `${Date.now()}-${Math.random()}`;
      setUploads((u) => [...u, { id, name: file.name, pct: 0 }]);
      try {
        if (file.size > MAX_BYTES) throw new Error('Larger than 150 MB');
        const blob = await upload(`${safe(subject.name)}/${safe(file.name)}`, file, {
          access: BLOB_ACCESS,
          handleUploadUrl: '/api/blob/upload',
          multipart: file.size > 8 * 1024 * 1024,
          onUploadProgress: (p) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, pct: Math.round(p.percentage) } : x))),
        });
        const info = { url: blob.url, name: file.name, size: file.size };
        const r = 'chapterId' in t ? await addFile(t.chapterId, info) : await attachFile(t.materialId, info);
        if (!r.ok) throw new Error(r.error);
        setUploads((u) => u.filter((x) => x.id !== id));
      } catch (e) {
        setUploads((u) => u.map((x) => (x.id === id ? { ...x, error: (e as Error).message || 'Upload failed' } : x)));
      }
    }
    router.refresh();
  }

  return (
    <div className="stack">
      <Link href="/subjects" className="small strong muted row" style={{ marginBottom: 10, gap: 4 }}>
        <Icon name="left" /> All subjects
      </Link>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row">
          <span className="dot" style={{ background: subject.color, width: 14, height: 14 }} />
          <h1 style={{ flex: 1 }}>{subject.name}</h1>
          <button className="btn small" onClick={() => setEditSubject(true)}>
            <Icon name="edit" /> Edit
          </button>
        </div>
        <div style={{ margin: '12px 0 6px' }}>
          <Progress value={done} max={mats.length} color={subject.color} />
        </div>
        <p className="small muted">
          {done} of {mats.length} units completed · {chapters.length} chapter{chapters.length === 1 ? '' : 's'}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length && target.current) uploadFiles(files, target.current);
        }}
      />

      {uploads.length > 0 && (
        <section className="card col">
          <h3>Uploads</h3>
          {uploads.map((u) => (
            <div key={u.id} className="col" style={{ gap: 4 }}>
              <div className="row between">
                <span className="small ellip" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.name}
                </span>
                {u.error ? (
                  <button className="btn ghost small" onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))}>
                    Dismiss
                  </button>
                ) : (
                  <span className="small muted">{u.pct}%</span>
                )}
              </div>
              {u.error ? <p className="err">{u.error}</p> : <Progress value={u.pct} max={100} color={subject.color} />}
            </div>
          ))}
        </section>
      )}

      {chapters.length === 0 && (
        <section className="card">
          <Empty>Add your first chapter below, then upload its PPTs/PDFs or add units.</Empty>
        </section>
      )}

      {chapters.map((c) => {
        const items = mats.filter((m) => m.chapter_id === c.id);
        const d = items.filter((m) => m.done).length;
        return (
          <section className="card" key={c.id}>
            <div className="row between top">
              <div style={{ minWidth: 0 }}>
                <h2>{c.title}</h2>
                <p className="small muted">
                  {d}/{items.length} done
                </p>
              </div>
              <div className="row gap-s">
                <button
                  className="btn ghost icon small"
                  aria-label="Rename chapter"
                  onClick={() => {
                    const t = window.prompt('Chapter name', c.title);
                    if (t && t.trim() && t.trim() !== c.title) run(() => renameChapter(c.id, t));
                  }}
                >
                  <Icon name="edit" />
                </button>
                <button
                  className="btn ghost icon small danger"
                  aria-label="Delete chapter"
                  onClick={() =>
                    window.confirm(`Delete “${c.title}” with its ${items.length} unit(s) and any uploaded files?`) && run(() => deleteChapter(c.id))
                  }
                >
                  <Icon name="trash" />
                </button>
              </div>
            </div>
            <div className="row wrap gap-s" style={{ margin: '10px 0' }}>
              <button className="btn small" onClick={() => pickFiles({ chapterId: c.id })}>
                <Icon name="upload" /> Upload PPT / PDF
              </button>
              <button className="btn small" onClick={() => setUnitsFor(c)}>
                <Icon name="plus" /> Add units
              </button>
            </div>
            {items.length === 0 ? (
              <p className="small muted">Nothing here yet.</p>
            ) : (
              <div className="list">
                {items.map((m) => (
                  <div key={m.id} className={`mat ${m.done ? 'done' : ''}`}>
                    <Check on={m.done} label={`Mark ${m.title} done`} onChange={(v) => run(() => toggleMaterial(m.id, v))} />
                    <button className="title" style={{ textAlign: 'left', background: 'none', border: 0, font: 'inherit', color: 'inherit', padding: 0, cursor: 'pointer' }} onClick={() => setEditing(m)}>
                      {m.title}
                    </button>
                    {m.file_url && (
                      <a className="btn ghost icon small" href={`/api/files/${m.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${m.file_name ?? 'file'}`} title={`${m.file_name ?? ''} ${bytes(m.file_size)}`}>
                        <Icon name="file" />
                      </a>
                    )}
                    <span className="badge">{KIND_LABEL[m.kind]}</span>
                    <button className="btn ghost icon small" onClick={() => setEditing(m)} aria-label={`Edit ${m.title}`}>
                      <Icon name="more" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section className="card">
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addChapter(subjectId, newChapter), () => setNewChapter(''));
          }}
        >
          <input className="input" placeholder="New chapter name" value={newChapter} onChange={(e) => setNewChapter(e.target.value)} maxLength={100} />
          <button className="btn primary" disabled={pending || !newChapter.trim()}>
            <Icon name="plus" /> Chapter
          </button>
        </form>
        <Err>{error}</Err>
      </section>

      {unitsFor && <UnitsSheet chapter={unitsFor} onClose={() => setUnitsFor(null)} />}
      {editing && (
        <MaterialSheet
          m={editing}
          chapters={chapters}
          defaults={state.settings}
          onClose={() => setEditing(null)}
          onUpload={(files) => {
            setEditing(null);
            uploadFiles(files, { materialId: editing.id });
          }}
        />
      )}
      {editSubject && <SubjectSheet subjectId={subjectId} name={subject.name} color={subject.color} count={mats.length} onClose={() => setEditSubject(false)} />}
    </div>
  );
}

function UnitsSheet({ chapter, onClose }: { chapter: Chapter; onClose: () => void }) {
  const { pending, error, run } = useRun();
  const [kind, setKind] = useState<Kind>('ppt');
  const [count, setCount] = useState('1');
  const [label, setLabel] = useState('');
  return (
    <Sheet title={`Add units to ${chapter.title}`} onClose={onClose}>
      <form
        className="col gap-l"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addUnits(chapter.id, kind, Number(count), label), onClose);
        }}
      >
        <p className="small muted">Use this for PPTs or programs you want to tick off without uploading a file (e.g. “16 programs”). Numbering continues across the subject.</p>
        <Seg value={kind} onChange={setKind} options={KIND_OPTIONS} />
        <div className="grid two">
          <label className="field">
            How many
            <input className="input" type="number" inputMode="numeric" min={1} max={100} value={count} onChange={(e) => setCount(e.target.value)} required />
          </label>
          <label className="field">
            Name prefix (optional)
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder={kind === 'ppt' ? 'PPT' : kind === 'program' ? 'Program' : 'Item'} />
          </label>
        </div>
        <Err>{error}</Err>
        <button className="btn primary" disabled={pending}>
          {pending ? 'Adding…' : 'Add units'}
        </button>
      </form>
    </Sheet>
  );
}

function MaterialSheet({
  m,
  chapters,
  defaults,
  onClose,
  onUpload,
}: {
  m: Material;
  chapters: Chapter[];
  defaults: AppState['settings'];
  onClose: () => void;
  onUpload: (files: File[]) => void;
}) {
  const { pending, error, run } = useRun();
  const [title, setTitle] = useState(m.title);
  const [kind, setKind] = useState<Kind>(m.kind);
  const [chapterId, setChapterId] = useState(String(m.chapter_id));
  const [est, setEst] = useState(m.est_minutes ? String(m.est_minutes) : '');
  const input = useRef<HTMLInputElement>(null);
  const def = kind === 'ppt' ? defaults.minPerPpt : kind === 'program' ? defaults.minPerProgram : defaults.minPerOther;

  return (
    <Sheet title="Edit unit" onClose={onClose}>
      <form
        className="col gap-l"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateMaterial(m.id, { title, kind, chapterId: Number(chapterId), estMinutes: est.trim() ? Number(est) : null }), onClose);
        }}
      >
        <label className="field">
          Title
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
        </label>
        <Seg value={kind} onChange={setKind} options={KIND_OPTIONS} />
        <div className="grid two">
          <label className="field">
            Chapter
            <select className="input" value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Minutes to finish
            <input className="input" type="number" inputMode="numeric" min={1} max={1000} value={est} onChange={(e) => setEst(e.target.value)} placeholder={`default ${def}`} />
          </label>
        </div>

        <div className="card flat col">
          <span className="small strong">File</span>
          {m.file_url ? (
            <>
              <p className="small muted" style={{ wordBreak: 'break-all' }}>
                {m.file_name} · {bytes(m.file_size)}
              </p>
              <div className="row wrap gap-s">
                <a className="btn small" href={`/api/files/${m.id}`} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
                <a className="btn small" href={`/api/files/${m.id}?download=1`}>
                  Download
                </a>
                <button type="button" className="btn small" onClick={() => input.current?.click()}>
                  Replace
                </button>
                <button type="button" className="btn small danger" onClick={() => window.confirm('Remove the file? The unit stays.') && run(() => removeFile(m.id), onClose)}>
                  Remove
                </button>
              </div>
            </>
          ) : (
            <div>
              <button type="button" className="btn small" onClick={() => input.current?.click()}>
                <Icon name="upload" /> Attach a file
              </button>
            </div>
          )}
          <input
            ref={input}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) onUpload([f]);
            }}
          />
        </div>

        <Err>{error}</Err>
        <div className="row">
          <button
            type="button"
            className="btn danger"
            onClick={() => window.confirm(`Delete “${m.title}”${m.file_url ? ' and its file' : ''}?`) && run(() => deleteMaterial(m.id), onClose)}
          >
            <Icon name="trash" /> Delete
          </button>
          <button className="btn primary right" disabled={pending || !title.trim()}>
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function SubjectSheet({ subjectId, name, color, count, onClose }: { subjectId: number; name: string; color: string; count: number; onClose: () => void }) {
  const router = useRouter();
  const { pending, error, run } = useRun();
  const [n, setN] = useState(name);
  const [c, setC] = useState(color);
  return (
    <Sheet title="Edit subject" onClose={onClose}>
      <form
        className="col gap-l"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateSubject(subjectId, n, c), onClose);
        }}
      >
        <label className="field">
          Name
          <input className="input" value={n} onChange={(e) => setN(e.target.value)} maxLength={60} required />
        </label>
        <div className="col gap-s">
          <span className="small strong muted">Colour</span>
          <ColorPick value={c} onChange={setC} />
        </div>
        <Err>{error}</Err>
        <div className="row">
          <button
            type="button"
            className="btn danger"
            onClick={() =>
              window.confirm(`Delete ${name}, its ${count} unit(s), uploaded files and exams? Past study sessions are kept.`) &&
              run(() => deleteSubject(subjectId), () => router.push('/subjects'))
            }
          >
            <Icon name="trash" /> Delete
          </button>
          <button className="btn primary right" disabled={pending || !n.trim()}>
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
