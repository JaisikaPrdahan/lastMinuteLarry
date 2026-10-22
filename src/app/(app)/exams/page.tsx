import type { Metadata } from 'next';
import { getState } from '@/lib/data';
import ExamsView from '@/components/ExamsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Exams' };

export default async function Page() {
  return <ExamsView state={await getState()} />;
}
