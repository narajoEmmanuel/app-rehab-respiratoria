/**
 * Purpose: Single decision for starting a therapy session with sensor vs touch backup.
 * Module: session/hooks
 */

import type { SessionInputMode } from '@/src/modules/session/session-input-mode';
import { isSensorRuntimeEnabled } from '@/src/config/sensor-runtime-guards';

export type ResolveTherapySessionLaunchParams = {
  sensorTransportConnected: boolean;
  effectiveTouchPracticeEnabled: boolean;
};

/** Aligns Home, Terapia, and Sesión on the same launch rules. */
export function resolveTherapySessionLaunchInputMode(
  params: ResolveTherapySessionLaunchParams,
): SessionInputMode {
  const sensorRuntimeEnabled = isSensorRuntimeEnabled();

  if (!sensorRuntimeEnabled) return 'touch_practice';
  if (params.sensorTransportConnected) return 'sensor';
  if (params.effectiveTouchPracticeEnabled) return 'touch_practice';
  return 'sensor';
}
