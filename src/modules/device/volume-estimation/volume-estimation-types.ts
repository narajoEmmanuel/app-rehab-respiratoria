/**
 * Tipos del servicio central de estimación de volumen (modelo activo + sensor global).
 */
import type { ActiveVolumeEstimateResult } from '@/src/modules/device/calibration/active-volume-estimation-types';
import type { CalibrationModelKind } from '@/src/modules/device/calibration/calibration-model-types';

export type VolumeEstimationReadinessStatus =
  | 'ready'
  | 'no_spirometer'
  | 'no_active_model'
  | 'model_stale'
  | 'sensor_disconnected'
  | 'invalid_sensor_reading'
  | 'missing_curve'
  | 'not_ready_for_therapy'
  | 'out_of_range'
  | 'loading'
  | 'error';

export type ActiveVolumeEstimationContext = {
  spirometerDeviceId: string | null;
  spirometerProfileId: string | null;
  spirometerLabel: string | null;
  spirometerProfileName: string | null;
  activeModelId: string | null;
  activeModelKind: CalibrationModelKind | null;
  isReadyForTherapy: boolean;
  isModelStale: boolean;
  calibratedRangeMl: { min: number; max: number } | null;
  distanceRangeMm: { min: number; max: number } | null;
  maxU95Ml: number | null;
  clinicalStatusLabel: string | null;
};

export type ActiveVolumeEstimationState = {
  loading: boolean;
  context: ActiveVolumeEstimationContext;
  estimate: ActiveVolumeEstimateResult;
  status: VolumeEstimationReadinessStatus;
  message: string;
  lastUpdatedAt: number | null;
};

/**
 * Contrato previsto para terapia (fase siguiente).
 * No consumir aún desde SessionScreen, niveles ni juegos.
 */
export type TherapyVolumeEstimateSnapshot = {
  estimatedVolumeMl: number | null;
  roundedVolumeMl: number | null;
  u95Ml: number | null;
  readinessStatus: VolumeEstimationReadinessStatus;
  inCalibratedRange: boolean;
  clamped: boolean;
  spirometerDeviceId: string | null;
  modelKind: CalibrationModelKind | null;
};

export const EMPTY_ACTIVE_VOLUME_ESTIMATION_CONTEXT: ActiveVolumeEstimationContext = {
  spirometerDeviceId: null,
  spirometerProfileId: null,
  spirometerLabel: null,
  spirometerProfileName: null,
  activeModelId: null,
  activeModelKind: null,
  isReadyForTherapy: false,
  isModelStale: true,
  calibratedRangeMl: null,
  distanceRangeMm: null,
  maxU95Ml: null,
  clinicalStatusLabel: null,
};
