/**
 * Tipos del modelo experimental de calibración (distanceMm → estimatedVolumeMl).
 * No depende de React ni de transporte; lo usan calibration-model / evaluation y la UI.
 */
import type { VolumeDistanceRelation } from '@/src/modules/device/calibration/calibration-types';

export type CalibrationModelKind = 'linear_regression' | 'piecewise_linear';

export type CalibrationModelStatus =
  | 'valid'
  | 'insufficient_data'
  | 'non_monotonic'
  | 'high_error'
  | 'invalid_range';

export type EstimateVolumeStatus =
  | 'ok'
  | 'no_model'
  | 'out_of_range'
  | 'invalid_input'
  | 'insufficient_data';

export type CalibrationModelCoefficients = {
  slope?: number;
  intercept?: number;
};

export type CalibrationModelRange = {
  min: number;
  max: number;
};

export type CalibrationModelMetrics = {
  rSquared: number | null;
  rmseMl: number | null;
  maeMl: number | null;
  maxAbsErrorMl: number | null;
};

export const CALIBRATION_MODEL_VERSION = 1;

export type CalibrationModel = {
  id: string;
  calibrationProfileId: string;
  kind: CalibrationModelKind;
  createdAt: number;
  updatedAt: number;
  relation: VolumeDistanceRelation;
  coefficients: CalibrationModelCoefficients;
  pointsUsed: number;
  volumeRangeMl: CalibrationModelRange;
  distanceRangeMm: CalibrationModelRange;
  metrics: CalibrationModelMetrics;
  status: CalibrationModelStatus;
  warnings: string[];
  isExperimental: true;
  version: number;
};

export type EstimateVolumeResult = {
  estimatedVolumeMl: number | null;
  clamped: boolean;
  inRange: boolean;
  status: EstimateVolumeStatus;
  warning?: string;
};

/** Umbrales de advertencia (no bloquean el status `valid`, solo agregan warnings). */
export const MODEL_WARNING_THRESHOLDS = {
  rmseMl: 250,
  maeMl: 200,
  maxAbsErrorMl: 500,
  rSquaredMin: 0.95,
} as const;

/** Mínimo de rango útil (mm) para considerar la calibración cubre un intervalo aceptable. */
export const MIN_USEFUL_DISTANCE_RANGE_MM = 5;
