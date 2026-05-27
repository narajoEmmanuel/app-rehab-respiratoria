/**
 * Tipos para la estimación en vivo de volumen a partir del modelo activo.
 */
import type { CalibrationModelKind } from '@/src/modules/device/calibration/calibration-model-types';

export type ActiveVolumeEstimateStatus =
  | 'ok'
  | 'no_active_model'
  | 'model_stale'
  | 'sensor_disconnected'
  | 'invalid_sensor_reading'
  | 'out_of_range_low'
  | 'out_of_range_high'
  | 'missing_curve'
  | 'not_ready_for_therapy';

export type ActiveVolumeEstimateUsedSegment = {
  volumeFromMl: number;
  volumeToMl: number;
  distanceFromMm: number;
  distanceToMm: number;
};

export type ActiveVolumeEstimateResult = {
  estimatedVolumeMl: number | null;
  roundedVolumeMl: number | null;
  u95Ml: number | null;
  lowerBoundMl: number | null;
  upperBoundMl: number | null;
  distanceMm: number | null;
  modelKind: CalibrationModelKind | null;
  spirometerDeviceId: string | null;
  spirometerProfileId: string | null;
  /**
   * true when the sensor distance falls within the calibrated distance range
   * AND the resulting volume was not clamped. false when extrapolating beyond
   * the range of calibration points or when no calibration is active.
   */
  inCalibratedRange: boolean;
  /**
   * true when the estimated volume was limited (clamped) to the model's
   * min/max calibrated volume, OR when the distance is outside the calibrated
   * distance range. In practice mode or without calibration this is false.
   */
  clamped: boolean;
  status: ActiveVolumeEstimateStatus;
  warning: string | null;
  usedSegment: ActiveVolumeEstimateUsedSegment | null;
};
