/**
 * Persistencia del modelo de calibración activo por espirómetro físico.
 * No modifica ni borra CalibrationProfile al limpiar el modelo activo.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ACTIVE_CALIBRATION_MODEL_VERSION,
  type ActiveCalibrationModel,
} from '@/src/modules/device/calibration/active-calibration-types';
import { logActiveCalibrationModelSaved } from '@/src/modules/device/calibration/diagnostic-calibration-debug';

export const ACTIVE_CALIBRATION_BY_SPIROMETER_STORAGE_KEY =
  '@respira_active_calibration_models_by_spirometer_v1';

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

function coerceActiveCalibrationModel(value: unknown): ActiveCalibrationModel | null {
  if (!isPlainObject(value)) return null;
  if (typeof value.id !== 'string') return null;
  if (typeof value.spirometerDeviceId !== 'string') return null;
  if (typeof value.spirometerProfileId !== 'string') return null;
  if (!isSpirometerProfileSnapshot(value.spirometerProfileSnapshot)) return null;
  if (typeof value.calibrationProfileId !== 'string') return null;
  if (typeof value.sourceCalibrationUpdatedAt !== 'number') return null;
  if (typeof value.activatedAt !== 'number') return null;
  if (typeof value.updatedAt !== 'number') return null;
  if (value.modelKind !== 'linear_regression' && value.modelKind !== 'piecewise_linear') {
    return null;
  }
  if (typeof value.modelVersion !== 'number') return null;
  if (typeof value.isReadyForTherapy !== 'boolean') return null;
  if (typeof value.canEstimateWithinCalibratedRange !== 'boolean') return null;
  if (typeof value.therapyReadinessReason !== 'string') return null;
  if (typeof value.recommendedReason !== 'string') return null;
  if (!isPlainObject(value.recommendedModel)) return null;
  if (!isPlainObject(value.calibratedRangeMl)) return null;
  if (!isPlainObject(value.distanceRangeMm)) return null;
  if (!Array.isArray(value.requiredVolumesMl)) return null;
  if (!isPlainObject(value.protocol)) return null;
  if (!isPlainObject(value.coverage)) return null;
  if (!isPlainObject(value.repeatability)) return null;
  if (!isPlainObject(value.geometricValidation)) return null;
  if (!isPlainObject(value.uncertainty)) return null;
  if (!isPlainObject(value.quality)) return null;
  if (!isPlainObject(value.clinicalStatus)) return null;
  return value as unknown as ActiveCalibrationModel;
}

async function readModelsMap(): Promise<Record<string, ActiveCalibrationModel>> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_CALIBRATION_BY_SPIROMETER_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return {};
    const map: Record<string, ActiveCalibrationModel> = {};
    for (const [deviceId, modelRaw] of Object.entries(parsed)) {
      const model = coerceActiveCalibrationModel(modelRaw);
      if (model) map[deviceId] = model;
    }
    return map;
  } catch {
    return {};
  }
}

async function writeModelsMap(map: Record<string, ActiveCalibrationModel>): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_CALIBRATION_BY_SPIROMETER_STORAGE_KEY, JSON.stringify(map));
}

export async function saveActiveCalibrationModelForSpirometer(
  model: ActiveCalibrationModel,
): Promise<void> {
  const payload: ActiveCalibrationModel = {
    ...model,
    modelVersion: ACTIVE_CALIBRATION_MODEL_VERSION,
    updatedAt: Date.now(),
  };
  const map = await readModelsMap();
  map[model.spirometerDeviceId] = payload;
  try {
    await writeModelsMap(map);
    logActiveCalibrationModelSaved(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`No se pudo guardar el modelo activo: ${message}`);
  }
}

export async function loadActiveCalibrationModelForSpirometer(
  spirometerDeviceId: string,
): Promise<ActiveCalibrationModel | null> {
  const map = await readModelsMap();
  return map[spirometerDeviceId] ?? null;
}

export async function clearActiveCalibrationModelForSpirometer(
  spirometerDeviceId: string,
): Promise<void> {
  const map = await readModelsMap();
  if (!(spirometerDeviceId in map)) return;
  delete map[spirometerDeviceId];
  try {
    await writeModelsMap(map);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`No se pudo borrar el modelo activo: ${message}`);
  }
}

export async function listActiveCalibrationModelsBySpirometer(): Promise<
  Record<string, ActiveCalibrationModel>
> {
  return readModelsMap();
}

export async function hasActiveCalibrationModelForSpirometer(
  spirometerDeviceId: string,
): Promise<boolean> {
  const map = await readModelsMap();
  return spirometerDeviceId in map;
}
