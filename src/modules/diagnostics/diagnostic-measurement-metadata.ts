/**
 * Measurement provenance for diagnostic attempts and persisted evaluations.
 * Touch results are never presented as ESP32 readings.
 */
import type { DiagnosticInputMode } from '@/src/modules/diagnostics/diagnostic-input-mode';

export type DiagnosticMeasurementSource = 'sensor_model' | 'touch';

export function isTouchDiagnosticInputMode(mode: DiagnosticInputMode): boolean {
  return mode === 'touch' || mode === 'touch_practice';
}

/** Practice-only diagnostic (local_sensor fallback); not saved as official evaluation. */
export function isDiagnosticPracticeOnly(mode: DiagnosticInputMode): boolean {
  return mode === 'touch_practice';
}

export function buildDiagnosticMeasurementMetadata(inputMode: DiagnosticInputMode): {
  measurement_source: DiagnosticMeasurementSource;
  sensor_used: boolean;
} {
  if (isTouchDiagnosticInputMode(inputMode)) {
    return { measurement_source: 'touch', sensor_used: false };
  }
  return { measurement_source: 'sensor_model', sensor_used: true };
}
