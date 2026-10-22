import { getState } from '@/lib/data';
import TodayView from '@/components/TodayView';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return <TodayView state={await getState()} />;
}
