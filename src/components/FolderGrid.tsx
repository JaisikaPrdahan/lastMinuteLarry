'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassFolder, { type ArtRecipe, type FolderFile } from '@/components/ui/glass-folder-cards';
import type { Chapter, Material, Subject } from '@/lib/types';

function mix(a: string, b: string, t: number): string {
  const n = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [n(a), n(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// Same ink-and-paper palette as the login hero; the subject colour is only a tint.
function recipe(color: string): ArtRecipe {
  const c = /^#[0-9a-f]{6}$/i.test(color) ? color : '#888888';
  return {
    style: 'marble',
    colors: ['#111110', mix('#111110', c, 0.35), '#3a3835', mix('#ebe9e5', c, 0.3), '#f1efea', '#1c1b19'],
    scale: 0.8,
    warp: 2.6,
    gloss: 0.5,
    veins: 0.4,
  };
}

export default function FolderGrid({
  subjects,
  chapters,
  materials,
  examDays,
}: {
  subjects: Subject[];
  chapters: Chapter[];
  materials: Material[];
  examDays: Record<number, number | null>;
}) {
  const router = useRouter();
  const [tone, setTone] = useState<'light' | 'dark'>('light');
  const [fw, setFw] = useState(160);
  useEffect(() => {
    const f = () => setFw(window.innerWidth < 700 ? Math.min(190, Math.floor((window.innerWidth - 32 - 14) / 2)) : 300);
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const f = () => setTone(mq.matches ? 'dark' : 'light');
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);

  return (
    <div className="folders">
      {subjects.map((s, i) => {
        const chs = chapters.filter((c) => c.subject_id === s.id);
        const ms = materials.filter((m) => m.subject_id === s.id);
        const done = ms.filter((m) => m.done).length;
        const d = examDays[s.id];
        const files: FolderFile[] = chs.map((c) => {
          const cm = ms.filter((m) => m.chapter_id === c.id);
          return { name: c.title, meta: `${cm.filter((m) => m.done).length}/${cm.length} units` };
        });
        const meta = `${done}/${ms.length} units${d != null ? ` · exam ${d === 0 ? 'today' : `in ${d}d`}` : ''}`;
        return (
          <div key={`${s.id}-${chs.length}-${done}`} className="folder-cell">
            <GlassFolder
              label={s.name}
              meta={meta}
              tone={tone}
              art={recipe(s.color)}
              seed={s.id + 2}
              files={files}
              action="none"
              appearDelay={i * 90}
              width={fw}
              onFileSelect={() => router.push(`/subjects/${s.id}`)}
            />
            <div className="folder-cap">
              <strong>{s.name}</strong>
              <span>{meta}</span>
            </div>
            <Link href={`/subjects/${s.id}`} className="btn small">
              Open {s.name} →
            </Link>
          </div>
        );
      })}
    </div>
  );
}
