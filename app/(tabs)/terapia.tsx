/**
 * Purpose: Expo Router therapy tab route wrapper.
 * Module: app routing
 * Dependencies: levels module screen
 * Notes: Temporary alias for existing levels experience.
 */
import { LevelsScreen } from '@/src/modules/levels/screens/LevelsScreen';

export default function TerapiaTab() {
  return <LevelsScreen headerTitle="Terapia" headerSubtitle="Elige tu terapia respiratoria" />;
}
