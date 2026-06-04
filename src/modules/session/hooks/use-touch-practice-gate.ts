/**
 * Purpose: Gate touch practice mode to when no sensor is connected.
 * Module: session/hooks
 */

import { useEffect } from 'react';

import { isTouchPracticeModeEnabled } from '@/src/modules/session/session-input-mode';

export type UseTouchPracticeGateParams = {
  sensorConnected: boolean;
  touchPracticeEnabled: boolean;
  setTouchPracticeEnabled: (enabled: boolean) => void;
};

export type UseTouchPracticeGateResult = {
  /** Feature flag on and no sensor connected — UI for touch backup may render. */
  canUseTouchPractice: boolean;
  /** Touch input is active for gameplay and session persistence. */
  effectiveTouchPracticeEnabled: boolean;
  isTouchPracticeFeatureEnabled: boolean;
};

/**
 * Touch practice is only available without a connected sensor.
 * Automatically clears the user preference when a sensor connects.
 */
export function useTouchPracticeGate({
  sensorConnected,
  touchPracticeEnabled,
  setTouchPracticeEnabled,
}: UseTouchPracticeGateParams): UseTouchPracticeGateResult {
  const isTouchPracticeFeatureEnabled = isTouchPracticeModeEnabled();
  const canUseTouchPractice = isTouchPracticeFeatureEnabled && !sensorConnected;
  const effectiveTouchPracticeEnabled = canUseTouchPractice && touchPracticeEnabled;

  useEffect(() => {
    if (sensorConnected && touchPracticeEnabled) {
      setTouchPracticeEnabled(false);
    }
  }, [sensorConnected, touchPracticeEnabled, setTouchPracticeEnabled]);

  return {
    canUseTouchPractice,
    effectiveTouchPracticeEnabled,
    isTouchPracticeFeatureEnabled,
  };
}
