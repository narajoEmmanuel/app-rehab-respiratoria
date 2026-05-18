/**
 * Normalización de nombres visibles del paciente (sin cambiar IDs ni claves).
 */

export const LOCAL_PATIENT_DISPLAY_NAME = 'Paciente local';

const LEGACY_DISPLAY_NAMES = new Set([
  'Prototipo local (desarrollo)',
  'Sensor Test User',
]);

export function isLegacyPatientDisplayName(name: string | null | undefined): boolean {
  if (name == null) return true;
  const trimmed = name.trim();
  if (trimmed.length === 0) return true;
  return LEGACY_DISPLAY_NAMES.has(trimmed);
}

export function normalizePatientDisplayName(name?: string | null): string {
  if (name == null || name.trim().length === 0) {
    return LOCAL_PATIENT_DISPLAY_NAME;
  }
  const trimmed = name.trim();
  if (LEGACY_DISPLAY_NAMES.has(trimmed)) {
    return LOCAL_PATIENT_DISPLAY_NAME;
  }
  return trimmed;
}
