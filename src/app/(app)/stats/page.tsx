import type { Metadata } from 'next';
import { getState } from '@/lib/data';
import StatsView from '@/components/StatsView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Stats' };

export default async function Page() {
  return <StatsView state={await getState()} />;
}
