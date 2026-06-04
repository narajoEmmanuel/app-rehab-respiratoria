/**
 * Purpose: Gate touch practice mode from profile preference and sensor connection.
 * Module: session/hooks
 */

import { useTouchPracticePreference } from '@/src/modules/session/hooks/use-touch-practice-preference';

export type UseTouchPracticeGateParams = {
  /** Real transport connected (not mock); see isRealSensorTransportConnected. */
  sensorConnected: boolean;
};

export type UseTouchPracticeGateResult = {
  /** Feature + profile preference + no sensor — touch may run this session. */
  canUseTouchPractice: boolean;
  effectiveTouchPracticeEnabled: boolean;
  touchPracticeFeatureEnabled: boolean;
  profileTouchPracticeEnabled: boolean;
  /** AsyncStorage preference loaded for active patient. */
  preferenceHydrated: boolean;
};

/**
 * Touch practice runs only when enabled in Perfil, feature flag is on, and no real sensor link.
 */
export function useTouchPracticeGate({
  sensorConnected,
}: UseTouchPracticeGateParams): UseTouchPracticeGateResult {
  const { hydrated, touchPracticeFeatureEnabled, profileTouchPracticeEnabled } =
    useTouchPracticePreference();

  const canUseTouchPractice =
    hydrated &&
    touchPracticeFeatureEnabled &&
    profileTouchPracticeEnabled &&
    sensorConnected !== true;

  const effectiveTouchPracticeEnabled = canUseTouchPractice;

  return {
    canUseTouchPractice,
    effectiveTouchPracticeEnabled,
    touchPracticeFeatureEnabled,
    profileTouchPracticeEnabled,
    preferenceHydrated: hydrated,
  };
}
