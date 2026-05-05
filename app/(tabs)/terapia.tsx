/**
 * Purpose: Expo Router therapy tab route wrapper.
 * Module: app routing
 * Dependencies: levels module screen
 * Notes: Temporary alias for existing levels experience.
 */
import { ConsentTabGuard } from '@/src/modules/legal/ConsentTabGuard';
import { LevelsScreen } from '@/src/modules/levels/screens/LevelsScreen';

export default function TerapiaTab() {
  return (
    <ConsentTabGuard>
      <LevelsScreen headerSubtitle="Elige tu terapia respiratoria" />
    </ConsentTabGuard>
  );
}
