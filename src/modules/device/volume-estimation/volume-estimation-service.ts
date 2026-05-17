/**
 * Servicio central de estimación de volumen desde modelo activo y lectura del sensor.
 * No abre WebSocket ni gestiona transporte; solo orquesta storage + math de calibración.
 */
import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import { isActiveCalibrationModelStale } from '@/src/modules/device/calibration/active-calibration-model';
import type {
  ActiveVolumeEstimateResult,
  ActiveVolumeEstimateStatus,
} from '@/src/modules/device/calibration/active-volume-estimation-types';
import { estimateVolumeFromActiveModel } from '@/src/modules/device/calibration/active-volume-estimator';
import { loadActiveCalibrationModelForSpirometer } from '@/src/modules/device/calibration/active-calibration-storage';
import { loadCalibrationProfileForSpirometer } from '@/src/modules/device/calibration/calibration-storage';
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';
import {
  getActiveSpirometerContext,
  getSpirometerProfileById,
  listSpirometerDevices,
} from '@/src/modules/device/spirometer';
import type { SpirometerContext } from '@/src/modules/device/spirometer/spirometer-types';
import {
  EMPTY_ACTIVE_VOLUME_ESTIMATION_CONTEXT,
  type ActiveVolumeEstimationContext,
  type TherapyVolumeEstimateSnapshot,
  type VolumeEstimationReadinessStatus,
} from '@/src/modules/device/volume-estimation/volume-estimation-types';

export type LoadActiveVolumeEstimationContextResult = {
  context: ActiveVolumeEstimationContext;
  activeModel: ActiveCalibrationModel | null;
  calibrationProfile: CalibrationProfile | null;
  isModelStale: boolean;
};

async function resolveSpirometerContext(
  spirometerDeviceId?: string,
): Promise<SpirometerContext | null> {
  if (spirometerDeviceId) {
    const devices = await listSpirometerDevices();
    const device = devices.find((d) => d.id === spirometerDeviceId);
    if (!device) return null;
    const profile = getSpirometerProfileById(device.profileId);
    if (!profile) return null;
    return { device, profile };
  }
  return getActiveSpirometerContext();
}

function buildContextFromModel(
  spirometer: SpirometerContext,
  activeModel: ActiveCalibrationModel | null,
  isModelStale: boolean,
): ActiveVolumeEstimationContext {
  return {
    spirometerDeviceId: spirometer.device.id,
    spirometerProfileId: spirometer.profile.id,
    spirometerLabel: spirometer.device.label,
    spirometerProfileName: spirometer.profile.name,
    activeModelId: activeModel?.id ?? null,
    activeModelKind: activeModel?.modelKind ?? null,
    isReadyForTherapy: activeModel?.isReadyForTherapy ?? false,
    isModelStale,
    calibratedRangeMl: activeModel
      ? { min: activeModel.calibratedRangeMl.min, max: activeModel.calibratedRangeMl.max }
      : null,
    distanceRangeMm: activeModel
      ? { min: activeModel.distanceRangeMm.min, max: activeModel.distanceRangeMm.max }
      : null,
    maxU95Ml: activeModel?.uncertainty.maxU95Ml ?? null,
    clinicalStatusLabel: activeModel?.clinicalStatus.label ?? null,
  };
}

/** Carga espirómetro, perfil de calibración y modelo activo (sin lectura de sensor). */
export async function loadActiveVolumeEstimationContext(
  spirometerDeviceId?: string,
): Promise<LoadActiveVolumeEstimationContextResult> {
  const spirometer = await resolveSpirometerContext(spirometerDeviceId);
  if (!spirometer) {
    return {
      context: { ...EMPTY_ACTIVE_VOLUME_ESTIMATION_CONTEXT },
      activeModel: null,
      calibrationProfile: null,
      isModelStale: true,
    };
  }

  const deviceId = spirometer.device.id;
  const [calibrationProfile, activeModel] = await Promise.all([
    loadCalibrationProfileForSpirometer(deviceId),
    loadActiveCalibrationModelForSpirometer(deviceId),
  ]);

  const isModelStale = isActiveCalibrationModelStale(
    activeModel,
    calibrationProfile,
    false,
  );

  return {
    context: buildContextFromModel(spirometer, activeModel, isModelStale),
    activeModel,
    calibrationProfile,
    isModelStale,
  };
}

export type EstimateVolumeForCurrentSensorReadingParams = {
  context: ActiveVolumeEstimationContext;
  activeModel: ActiveCalibrationModel | null;
  calibrationProfile: CalibrationProfile | null;
  distanceMm: number | null;
  sensorConnected: boolean;
  hasUnsavedChanges?: boolean;
};

/** Estima volumen para la lectura actual usando el modelo activo del espirómetro en contexto. */
export function estimateVolumeForCurrentSensorReading(
  params: EstimateVolumeForCurrentSensorReadingParams,
): ActiveVolumeEstimateResult {
  const {
    activeModel,
    calibrationProfile,
    distanceMm,
    sensorConnected,
    hasUnsavedChanges = false,
  } = params;

  const isModelStale = isActiveCalibrationModelStale(
    activeModel,
    calibrationProfile,
    hasUnsavedChanges,
  );

  return estimateVolumeFromActiveModel({
    activeModel,
    distanceMm,
    sensorConnected,
    isModelStale,
  });
}

function mapEstimateStatusToReadiness(
  estimateStatus: ActiveVolumeEstimateStatus,
): VolumeEstimationReadinessStatus {
  switch (estimateStatus) {
    case 'ok':
      return 'ready';
    case 'no_active_model':
      return 'no_active_model';
    case 'model_stale':
      return 'model_stale';
    case 'sensor_disconnected':
      return 'sensor_disconnected';
    case 'invalid_sensor_reading':
      return 'invalid_sensor_reading';
    case 'missing_curve':
      return 'missing_curve';
    case 'not_ready_for_therapy':
      return 'not_ready_for_therapy';
    case 'out_of_range_low':
    case 'out_of_range_high':
      return 'out_of_range';
    default:
      return 'error';
  }
}

export function deriveVolumeEstimationReadiness(params: {
  loading: boolean;
  error: string | null;
  context: ActiveVolumeEstimationContext;
  estimate: ActiveVolumeEstimateResult;
}): VolumeEstimationReadinessStatus {
  if (params.loading) return 'loading';
  if (params.error) return 'error';
  if (!params.context.spirometerDeviceId) return 'no_spirometer';
  return mapEstimateStatusToReadiness(params.estimate.status);
}

export function getVolumeEstimationUserMessage(
  status: VolumeEstimationReadinessStatus,
  estimate: ActiveVolumeEstimateResult,
): string {
  if (estimate.warning) return estimate.warning;

  switch (status) {
    case 'ready':
      return 'Estimación lista.';
    case 'no_spirometer':
      return 'Selecciona un espirómetro para estimar volumen.';
    case 'no_active_model':
      return 'No hay modelo activo para el espirómetro seleccionado.';
    case 'sensor_disconnected':
      return 'Conecta el sensor para estimar volumen.';
    case 'model_stale':
      return 'El modelo activo está desactualizado. Reactiva el modelo antes de estimar.';
    case 'out_of_range':
      return 'La lectura está fuera del rango calibrado.';
    case 'missing_curve':
      return 'El modelo activo requiere reactivación.';
    case 'not_ready_for_therapy':
      return 'El modelo activo no cumple los criterios para estimar volumen.';
    case 'invalid_sensor_reading':
      return 'La lectura del sensor no es válida.';
    case 'loading':
      return 'Cargando modelo activo…';
    case 'error':
      return 'No se pudo cargar la estimación de volumen.';
    default:
      return 'Estado de estimación no disponible.';
  }
}

export function volumeEstimationCardStatusLabel(
  status: VolumeEstimationReadinessStatus,
): string {
  switch (status) {
    case 'ready':
      return 'Listo';
    case 'no_spirometer':
      return 'Sin espirómetro';
    case 'no_active_model':
      return 'Sin modelo activo';
    case 'model_stale':
      return 'Modelo desactualizado';
    case 'sensor_disconnected':
      return 'Sensor desconectado';
    case 'out_of_range':
      return 'Fuera de rango';
    case 'missing_curve':
      return 'Requiere reactivación';
    case 'not_ready_for_therapy':
      return 'No listo para terapia';
    case 'invalid_sensor_reading':
      return 'Lectura no válida';
    case 'loading':
      return 'Cargando…';
    case 'error':
      return 'Error de estimación';
    default:
      return '—';
  }
}

/** Mapea el estado del hook al contrato previsto para terapia (sin usarlo aún en sesión). */
export function toTherapyVolumeEstimateSnapshot(params: {
  readinessStatus: VolumeEstimationReadinessStatus;
  estimate: ActiveVolumeEstimateResult;
}): TherapyVolumeEstimateSnapshot {
  return {
    estimatedVolumeMl: params.estimate.estimatedVolumeMl,
    roundedVolumeMl: params.estimate.roundedVolumeMl,
    u95Ml: params.estimate.u95Ml,
    readinessStatus: params.readinessStatus,
    inCalibratedRange: params.estimate.inCalibratedRange,
    clamped: params.estimate.clamped,
    spirometerDeviceId: params.estimate.spirometerDeviceId,
    modelKind: params.estimate.modelKind,
  };
}
