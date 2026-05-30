/**
 * Captura multipunto, recalibración y export CSV técnico solo en builds de desarrollo
 * con EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=true.
 */

export function isTechnicalCalibrationEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION === 'true';
}

/** Ruta de acción cuando la calibración no está lista (según flag técnica). */
export function technicalCalibrationFallbackRoute(): '/sensor-calibration' | '/sensor-connection' {
  return isTechnicalCalibrationEnabled() ? '/sensor-calibration' : '/sensor-connection';
}
