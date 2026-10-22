'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlassFolder, { type ArtRecipe, type FolderFile } from '@/components/ui/glass-folder-cards';
import type { Chapter, Material, Subject } from '@/lib/types';

function recipe(color: string): ArtRecipe {
  return { style: 'marble', colors: [color, '#101018', color, '#ffffff'], scale: 1.1, warp: 1, gloss: 0.7, veins: 0.3 };
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
              width={300}
              onFileSelect={() => router.push(`/subjects/${s.id}`)}
            />
            <Link href={`/subjects/${s.id}`} className="btn small">
              Open {s.name} →
            </Link>
          </div>
        );
      })}
    </div>
  );
}
