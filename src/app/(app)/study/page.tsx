import type { Metadata } from 'next';
import { getState } from '@/lib/data';
import StudyView from '@/components/StudyView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Study' };

export default async function Page() {
  return <StudyView state={await getState()} />;
}
