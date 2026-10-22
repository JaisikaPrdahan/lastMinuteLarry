import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getState } from '@/lib/data';
import SubjectDetail from '@/components/SubjectDetail';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Subject' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await getState();
  const subject = state.subjects.find((s) => s.id === Number(id));
  if (!subject) notFound();
  return <SubjectDetail state={state} subjectId={subject.id} />;
}
