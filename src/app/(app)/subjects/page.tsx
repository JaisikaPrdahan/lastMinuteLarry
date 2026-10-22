import type { Metadata } from 'next';
import { getState } from '@/lib/data';
import SubjectsView from '@/components/SubjectsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Subjects' };

export default async function Page() {
  return <SubjectsView state={await getState()} />;
}
