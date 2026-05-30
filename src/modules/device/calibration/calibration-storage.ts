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
  CALIBRATION_BY_SPIROMETER_STORAGE_KEY,
  CALIBRATION_STORAGE_KEY,
} from '@/src/modules/device/calibration/calibration-storage-keys';
import {
  getActiveSpirometerDevice,
  getSpirometerProfileById,
  LEGACY_SPIROMETER_DEVICE_5000ML_ID,
  LEGACY_SPIROMETER_DEVICE_OTHER_ID,
  SPIROMETER_DEVICE_3000ML_ID,
  SPIROMETER_PROFILE_3000ML_ID,
} from '@/src/modules/device/spirometer';

export { CALIBRATION_STORAGE_KEY, CALIBRATION_BY_SPIROMETER_STORAGE_KEY } from '@/src/modules/device/calibration/calibration-storage-keys';
const LEGACY_MIGRATION_FLAG_KEY = '@respira_calibration_legacy_migrated_v1';

const LEGACY_DEVICE_IDS = [
  LEGACY_SPIROMETER_DEVICE_5000ML_ID,
  LEGACY_SPIROMETER_DEVICE_OTHER_ID,
];

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
  const source = value.source;
  if (
    source !== 'local_calibration' &&
    source !== 'imported_equation' &&
    source !== 'imported_file' &&
    source !== 'team_validated'
  ) {
    return null;
  }
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

function remapProfileTo3000Device(profile: CalibrationProfile): CalibrationProfile {
  const defaultProfile = getSpirometerProfileById(SPIROMETER_PROFILE_3000ML_ID);
  if (!defaultProfile) return profile;
  return {
    ...profile,
    spirometerDeviceId: SPIROMETER_DEVICE_3000ML_ID,
    spirometerProfileId: defaultProfile.id,
    spirometerProfileSnapshot: defaultProfile,
    calibrationRangeMl: {
      min: defaultProfile.operativeMinVolumeMl,
      max: defaultProfile.maxVolumeMl,
    },
    requiredVolumesMl: [...defaultProfile.requiredVolumesMl],
  };
}

function migrateProfilesMapTo3000(
  map: Record<string, CalibrationProfile>,
): Record<string, CalibrationProfile> {
  let changed = false;
  const next = { ...map };

  for (const legacyId of LEGACY_DEVICE_IDS) {
    if (legacyId in next && !(SPIROMETER_DEVICE_3000ML_ID in next)) {
      next[SPIROMETER_DEVICE_3000ML_ID] = remapProfileTo3000Device(next[legacyId]);
      changed = true;
    }
    if (legacyId in next) {
      delete next[legacyId];
      changed = true;
    }
  }

  if (SPIROMETER_DEVICE_3000ML_ID in next) {
    const remapped = remapProfileTo3000Device(next[SPIROMETER_DEVICE_3000ML_ID]);
    if (remapped !== next[SPIROMETER_DEVICE_3000ML_ID]) {
      next[SPIROMETER_DEVICE_3000ML_ID] = remapped;
      changed = true;
    }
  }

  return changed ? next : map;
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
    const migrated = migrateProfilesMapTo3000(map);
    if (migrated !== map) {
      await writeProfilesMap(migrated);
    }
    return migrated;
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
  if (map[SPIROMETER_DEVICE_3000ML_ID]) {
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

  const migratedProfile = remapProfileTo3000Device({
    ...legacyProfile,
    version: CALIBRATION_PROFILE_VERSION,
  });

  map[SPIROMETER_DEVICE_3000ML_ID] = migratedProfile;
  await writeProfilesMap(map);
  await AsyncStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, 'true');
}

export async function saveCalibrationProfileForSpirometer(
  spirometerDeviceId: string,
  profile: CalibrationProfile,
): Promise<void> {
  const targetId =
    spirometerDeviceId === SPIROMETER_DEVICE_3000ML_ID ||
    LEGACY_DEVICE_IDS.includes(spirometerDeviceId)
      ? SPIROMETER_DEVICE_3000ML_ID
      : spirometerDeviceId;
  const payload: CalibrationProfile = {
    ...profile,
    spirometerDeviceId: targetId,
    version: CALIBRATION_PROFILE_VERSION,
  };
  const map = await readProfilesMap();
  map[targetId] = payload;
  try {
    await writeProfilesMap(map);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.warn(`[RehabCalib] No se pudo guardar la calibración local: ${message}`);
  }
}

export async function loadCalibrationProfileForSpirometer(
  spirometerDeviceId: string,
): Promise<CalibrationProfile | null> {
  await migrateLegacyCalibrationIfNeeded();
  const map = await readProfilesMap();
  const targetId = LEGACY_DEVICE_IDS.includes(spirometerDeviceId)
    ? SPIROMETER_DEVICE_3000ML_ID
    : spirometerDeviceId;
  return map[targetId] ?? null;
}

export async function clearCalibrationProfileForSpirometer(
  spirometerDeviceId: string,
): Promise<void> {
  const map = await readProfilesMap();
  const targetId = LEGACY_DEVICE_IDS.includes(spirometerDeviceId)
    ? SPIROMETER_DEVICE_3000ML_ID
    : spirometerDeviceId;
  if (!(targetId in map)) return;
  delete map[targetId];
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

  const targetId = LEGACY_DEVICE_IDS.includes(deviceId)
    ? SPIROMETER_DEVICE_3000ML_ID
    : deviceId;

  let map: Record<string, CalibrationProfile>;
  try {
    map = await readProfilesMap();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { kind: 'corrupt', rawPreview: '', errorMessage: message };
  }

  const profile = map[targetId];
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
    const targetId = LEGACY_DEVICE_IDS.includes(deviceId)
      ? SPIROMETER_DEVICE_3000ML_ID
      : deviceId;
    return targetId in map;
  } catch {
    return false;
  }
}
