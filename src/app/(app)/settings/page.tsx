import type { Metadata } from 'next';
import { getState } from '@/lib/data';
import SettingsView from '@/components/SettingsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings' };

export default async function Page() {
  const state = await getState();
  return <SettingsView settings={state.settings} tz={state.tz} subjectCount={state.subjects.length} />;
}
