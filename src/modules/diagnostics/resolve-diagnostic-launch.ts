/**
 * Single decision for initial evaluation input: sensor (priority) vs touch fallback.
 */
import { runtimeEnv } from '@/src/config/runtime-env';
import { isSensorRuntimeEnabled } from '@/src/config/sensor-runtime-guards';
import type { DiagnosticInputMode } from '@/src/modules/diagnostics/diagnostic-input-mode';
import { isTouchPracticeModeEnabled } from '@/src/modules/session/session-input-mode';

export type ResolveDiagnosticLaunchParams = {
  /** Sensor calibration + live signal ready (immediate snapshot). */
  sensorReadinessCanStart: boolean;
  /**
   * Feature flag + preferencia de Perfil (sin comprobar transporte WS).
   * En local_sensor el fallback táctil depende de readiness, no de si el socket está abierto.
   */
  profileTouchPracticeAllowed: boolean;
};

/**
 * Sensor wins when runtime allows it and readiness is satisfied.
 * Touch is used when sensor is unavailable and touch practice is enabled.
 */
export function resolveDiagnosticLaunchInputMode(
  params: ResolveDiagnosticLaunchParams,
): DiagnosticInputMode {
  const sensorRuntimeEnabled = isSensorRuntimeEnabled();
  const touchFeatureEnabled = isTouchPracticeModeEnabled();

  if (sensorRuntimeEnabled && params.sensorReadinessCanStart) {
    return 'sensor';
  }

  if (!touchFeatureEnabled) {
    return 'sensor';
  }

  if (!sensorRuntimeEnabled || runtimeEnv.isWebTouch) {
    return 'touch';
  }

  if (params.profileTouchPracticeAllowed) {
    return 'touch_practice';
  }

  return 'sensor';
}

export function isDiagnosticTouchFallbackAllowed(params: {
  profileTouchPracticeAllowed: boolean;
}): boolean {
  const touchFeatureEnabled = isTouchPracticeModeEnabled();
  if (!touchFeatureEnabled) return false;

  if (!isSensorRuntimeEnabled() || runtimeEnv.isWebTouch) {
    return true;
  }

  return params.profileTouchPracticeAllowed;
}
