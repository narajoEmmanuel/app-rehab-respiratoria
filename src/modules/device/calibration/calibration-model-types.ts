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

/**
 * Umbrales para considerar el ajuste lineal "aceptable" como modelo recomendado.
 * Son criterios combinados (todos deben cumplirse).
 */
export const LINEAR_ACCEPTABLE_THRESHOLDS = {
  rSquaredMin: 0.95,
  rmseMlMax: 250,
  maeMlMax: 200,
  maxAbsErrorMlMax: 500,
} as const;

export type CalibrationModelRecommendationKind =
  | 'linear_regression'
  | 'piecewise_linear'
  | 'none';

export type CalibrationRecommendationStatus =
  | 'ready'
  | 'needs_more_points'
  | 'needs_recalibration'
  | 'limited_range'
  | 'invalid';

export type CalibrationLinealQuality = 'acceptable' | 'not_recommended' | 'unavailable';

export type CalibrationQuality = 'good' | 'limited' | 'poor' | 'invalid';

export type CalibrationRecommendationCoverage = {
  coversRecommended: boolean;
  coversTotal: boolean;
  recommendedCoveragePct: number | null;
  totalCoveragePct: number | null;
};

export type CalibrationRequiredProtocolSummary = {
  requiredVolumes: number[];
  missingRequiredVolumes: number[];
  requiredVolumesWithLowRepetitions: number[];
  totalValidRequiredPoints: number;
  minimumRequiredPoints: number;
  meetsRequiredProtocol: boolean;
};

/** Resumen de validación geométrica (escala física ~10 mm / 500 mL) incluido en la recomendación. */
export type CalibrationGeometricScaleSummary = {
  expectedDistanceStepPer500MlMm: number;
  okSegments: number;
  reviewSegments: number;
  criticalSegments: number;
  missingSegments: number;
  passesGeometricValidation: boolean;
};

export type CalibrationModelRecommendation = {
  recommendedKind: CalibrationModelRecommendationKind;
  status: CalibrationRecommendationStatus;
  canEstimateVolume: boolean;
  /** Puede estimar volumen dentro del tramo capturado con un modelo válido (sin exigir protocolo terapéutico completo). */
  canEstimateWithinCalibratedRange: boolean;
  /** Cumple protocolo mínimo, cobertura, calidad de señal y modelo recomendado para uso terapéutico. */
  isReadyForTherapy: boolean;
  /** Causa principal del estado de listo para terapia o del bloqueo. */
  therapyReadinessReason: string;
  requiredProtocol: CalibrationRequiredProtocolSummary;
  /** Validación geométrica del montaje frente a la escala física del espirómetro (~10 mm / 500 mL). */
  geometricScale: CalibrationGeometricScaleSummary;
  reason: string;
  warnings: string[];
  linealQuality: CalibrationLinealQuality;
  calibrationQuality: CalibrationQuality;
  coverage: CalibrationRecommendationCoverage;
};
