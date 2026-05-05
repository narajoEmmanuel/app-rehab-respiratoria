/**
 * Purpose: Expo Router plan tab route wrapper.
 * Module: app routing
 * Dependencies: plans module screen
 * Notes: Keeps legacy plan routes as aliases while this is the primary tab.
 */
import { ConsentTabGuard } from '@/src/modules/legal/ConsentTabGuard';
import { WeeklyPlanScreen } from '@/src/modules/plans/screens/WeeklyPlanScreen';

export default function PlanTab() {
  return (
    <ConsentTabGuard>
      <WeeklyPlanScreen />
    </ConsentTabGuard>
  );
}
