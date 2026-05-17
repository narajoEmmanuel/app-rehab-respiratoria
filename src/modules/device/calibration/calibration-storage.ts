/**
 * Persistencia local del perfil de calibración en AsyncStorage.
 * Calibración por unidad física de espirómetro (`spirometerDeviceId`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CALIBRATION_PROFILE_VERSION,
  type CalibrationProfile,
} from '@/src/modules/device/calibration/calibration-types';
import {
  getActiveSpirometerDevice,
  getSpirometerProfileById,
  SPIROMETER_DEVICE_5000ML_ID,
} from '@/src/modules/device/spirometer';

export const CALIBRATION_STORAGE_KEY = '@respira_device_calibration_profile_v1';
export const CALIBRATION_BY_SPIROMETER_STORAGE_KEY =
  '@respira_device_calibration_profiles_by_spirometer_v1';
const LEGACY_MIGRATION_FLAG_KEY = '@respira_calibration_legacy_migrated_v1';

export type LoadCalibrationResult =
  | { kind: 'empty' }
  | { kind: 'ok'; profile: CalibrationProfile }
  | { kind: 'corrupt'; rawPreview: string; errorMessage: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSpirometerProfileSnapshot(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.maxVolumeMl === 'number' &&
    Array.isArray(value.requiredVolumesMl)
  );
}

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

  const version = value.version as number;
  if (version >= 2) {
    if (typeof value.spirometerDeviceId !== 'string') return null;
    if (typeof value.spirometerProfileId !== 'string') return null;
    if (!isSpirometerProfileSnapshot(value.spirometerProfileSnapshot)) return null;
    if (!isPlainObject(value.calibrationRangeMl)) return null;
    if (!Array.isArray(value.requiredVolumesMl)) return null;
  }

  return value as unknown as CalibrationProfile;
}

async function readProfilesMap(): Promise<Record<string, CalibrationProfile>> {
  try {
    const raw = await AsyncStorage.getItem(CALIBRATION_BY_SPIROMETER_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return {};
    const map: Record<string, CalibrationProfile> = {};
    for (const [deviceId, profileRaw] of Object.entries(parsed)) {
      const profile = coerceCalibrationProfile(profileRaw);
      if (profile) map[deviceId] = profile;
    }
    return map;
  } catch {
    return {};
  }
}

async function writeProfilesMap(map: Record<string, CalibrationProfile>): Promise<void> {
  await AsyncStorage.setItem(CALIBRATION_BY_SPIROMETER_STORAGE_KEY, JSON.stringify(map));
}

async function migrateLegacyCalibrationIfNeeded(): Promise<void> {
  const migrated = await AsyncStorage.getItem(LEGACY_MIGRATION_FLAG_KEY);
  if (migrated === 'true') return;

  const map = await readProfilesMap();
  if (map[SPIROMETER_DEVICE_5000ML_ID]) {
    await AsyncStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, 'true');
    return;
  }

  let legacyRaw: string | null = null;
  try {
    legacyRaw = await AsyncStorage.getItem(CALIBRATION_STORAGE_KEY);
  } catch {
    await AsyncStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, 'true');
    return;
  }
  if (!legacyRaw) {
    await AsyncStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, 'true');
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(legacyRaw);
  } catch {
    await AsyncStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, 'true');
    return;
  }

  const legacyProfile = coerceCalibrationProfile(parsed);
  if (!legacyProfile) {
    await AsyncStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, 'true');
    return;
  }

  const defaultProfile = getSpirometerProfileById('spirometer_5000ml_default');
  if (!defaultProfile) {
    await AsyncStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, 'true');
    return;
  }

  const migratedProfile: CalibrationProfile = {
    ...legacyProfile,
    version: CALIBRATION_PROFILE_VERSION,
    spirometerDeviceId: SPIROMETER_DEVICE_5000ML_ID,
    spirometerProfileId: defaultProfile.id,
    spirometerProfileSnapshot: defaultProfile,
    calibrationRangeMl: {
      min: defaultProfile.operativeMinVolumeMl,
      max: defaultProfile.maxVolumeMl,
    },
    requiredVolumesMl: [...defaultProfile.requiredVolumesMl],
  };

  map[SPIROMETER_DEVICE_5000ML_ID] = migratedProfile;
  await writeProfilesMap(map);
  await AsyncStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, 'true');
}

export async function saveCalibrationProfileForSpirometer(
  spirometerDeviceId: string,
  profile: CalibrationProfile,
): Promise<void> {
  const payload: CalibrationProfile = { ...profile, version: CALIBRATION_PROFILE_VERSION };
  const map = await readProfilesMap();
  map[spirometerDeviceId] = payload;
  try {
    await writeProfilesMap(map);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`No se pudo guardar la calibración local: ${message}`);
  }
}

export async function loadCalibrationProfileForSpirometer(
  spirometerDeviceId: string,
): Promise<CalibrationProfile | null> {
  await migrateLegacyCalibrationIfNeeded();
  const map = await readProfilesMap();
  return map[spirometerDeviceId] ?? null;
}

export async function clearCalibrationProfileForSpirometer(
  spirometerDeviceId: string,
): Promise<void> {
  const map = await readProfilesMap();
  if (!(spirometerDeviceId in map)) return;
  delete map[spirometerDeviceId];
  try {
    await writeProfilesMap(map);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`No se pudo borrar la calibración local: ${message}`);
  }
}

export async function listCalibrationProfilesBySpirometer(): Promise<
  Record<string, CalibrationProfile>
> {
  await migrateLegacyCalibrationIfNeeded();
  return readProfilesMap();
}

export async function saveCalibrationProfile(profile: CalibrationProfile): Promise<void> {
  const deviceId = profile.spirometerDeviceId;
  if (deviceId) {
    await saveCalibrationProfileForSpirometer(deviceId, profile);
    return;
  }
  const active = await getActiveSpirometerDevice();
  if (!active) {
    throw new Error('No hay espirómetro activo para guardar la calibración.');
  }
  await saveCalibrationProfileForSpirometer(active.id, profile);
}

export async function loadCalibrationProfile(): Promise<CalibrationProfile | null> {
  const result = await loadCalibrationProfileDetailed();
  return result.kind === 'ok' ? result.profile : null;
}

export async function loadCalibrationProfileDetailed(
  spirometerDeviceId?: string,
): Promise<LoadCalibrationResult> {
  await migrateLegacyCalibrationIfNeeded();

  const deviceId =
    spirometerDeviceId ?? (await getActiveSpirometerDevice())?.id ?? null;
  if (!deviceId) return { kind: 'empty' };

  let map: Record<string, CalibrationProfile>;
  try {
    map = await readProfilesMap();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { kind: 'corrupt', rawPreview: '', errorMessage: message };
  }

  const profile = map[deviceId];
  if (!profile) return { kind: 'empty' };

  return { kind: 'ok', profile };
}

export async function clearCalibrationProfile(spirometerDeviceId?: string): Promise<void> {
  const deviceId =
    spirometerDeviceId ?? (await getActiveSpirometerDevice())?.id ?? null;
  if (!deviceId) return;
  await clearCalibrationProfileForSpirometer(deviceId);
}

export async function hasCalibrationProfile(spirometerDeviceId?: string): Promise<boolean> {
  try {
    const deviceId =
      spirometerDeviceId ?? (await getActiveSpirometerDevice())?.id ?? null;
    if (!deviceId) return false;
    const map = await readProfilesMap();
    return deviceId in map;
  } catch {
    return false;
  }
}
