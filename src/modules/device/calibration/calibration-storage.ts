/**
 * Persistencia local del perfil de calibración en AsyncStorage.
 * Solo dispositivo: no toca Supabase, sesiones, historial ni terapia.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CALIBRATION_PROFILE_VERSION,
  type CalibrationProfile,
} from '@/src/modules/device/calibration/calibration-types';

export const CALIBRATION_STORAGE_KEY = '@respira_device_calibration_profile_v1';

export type LoadCalibrationResult =
  | { kind: 'empty' }
  | { kind: 'ok'; profile: CalibrationProfile }
  | { kind: 'corrupt'; rawPreview: string; errorMessage: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validación mínima del JSON cargado. No reconstruye, solo valida la forma esperada.
 * Devuelve `null` si el payload no parece un `CalibrationProfile`.
 */
function coerceCalibrationProfile(value: unknown): CalibrationProfile | null {
  if (!isPlainObject(value)) return null;
  if (typeof value.id !== 'string') return null;
  if (typeof value.name !== 'string') return null;
  if (typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt)) return null;
  if (typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)) return null;
  if (!Array.isArray(value.points)) return null;
  if (!Array.isArray(value.summaries)) return null;
  if (!isPlainObject(value.globalRange)) return null;
  if (value.source !== 'local_calibration') return null;
  if (value.isExperimental !== true) return null;
  if (typeof value.version !== 'number') return null;
  return value as unknown as CalibrationProfile;
}

export async function saveCalibrationProfile(profile: CalibrationProfile): Promise<void> {
  const payload: CalibrationProfile = { ...profile, version: CALIBRATION_PROFILE_VERSION };
  try {
    await AsyncStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`No se pudo guardar la calibración local: ${message}`);
  }
}

/**
 * Versión tolerante: devuelve `null` si no hay perfil o si el JSON está corrupto/inválido,
 * para no romper la app cuando la pantalla se abre.
 */
export async function loadCalibrationProfile(): Promise<CalibrationProfile | null> {
  const result = await loadCalibrationProfileDetailed();
  return result.kind === 'ok' ? result.profile : null;
}

/**
 * Versión con detalle para la UI: distingue entre vacío, OK y corrupto, sin lanzar excepción.
 */
export async function loadCalibrationProfileDetailed(): Promise<LoadCalibrationResult> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(CALIBRATION_STORAGE_KEY);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { kind: 'corrupt', rawPreview: '', errorMessage: message };
  }
  if (!raw) return { kind: 'empty' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON no parseable';
    return { kind: 'corrupt', rawPreview: raw.slice(0, 120), errorMessage: message };
  }
  const profile = coerceCalibrationProfile(parsed);
  if (!profile) {
    return {
      kind: 'corrupt',
      rawPreview: raw.slice(0, 120),
      errorMessage: 'El perfil persistido no tiene la forma esperada.',
    };
  }
  return { kind: 'ok', profile };
}

export async function clearCalibrationProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CALIBRATION_STORAGE_KEY);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`No se pudo borrar la calibración local: ${message}`);
  }
}

export async function hasCalibrationProfile(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CALIBRATION_STORAGE_KEY);
    return raw !== null;
  } catch {
    return false;
  }
}
