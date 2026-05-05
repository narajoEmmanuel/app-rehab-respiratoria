/**
 * Purpose: Expo Router history route wrapper.
 * Module: app routing
 * Dependencies: history module screen
 * Notes: Thin routing layer only.
 */
import { ConsentTabGuard } from '@/src/modules/legal/ConsentTabGuard';
import { HistoryScreen } from '@/src/modules/history/screens/HistoryScreen';

export default function HistorialTab() {
  return (
    <ConsentTabGuard>
      <HistoryScreen />
    </ConsentTabGuard>
  );
}

