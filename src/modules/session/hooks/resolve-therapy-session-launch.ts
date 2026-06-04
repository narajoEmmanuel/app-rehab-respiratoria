/**
 * Purpose: Single decision for starting a therapy session with sensor vs touch backup.
 * Module: session/hooks
 */

import type { SessionInputMode } from '@/src/modules/session/session-input-mode';

export type ResolveTherapySessionLaunchParams = {
  sensorTransportConnected: boolean;
  effectiveTouchPracticeEnabled: boolean;
};

/** Aligns Home, Terapia, and Sesión on the same launch rules. */
export function resolveTherapySessionLaunchInputMode(
  params: ResolveTherapySessionLaunchParams,
): SessionInputMode {
  if (params.sensorTransportConnected) return 'sensor';
  if (params.effectiveTouchPracticeEnabled) return 'touch_practice';
  return 'sensor';
}
