/**
 * Estimación en vivo de volumen usando el modelo activo del espirómetro seleccionado.
 * No depende de React ni de transporte.
 */
import { hasActiveCalibrationCurveSnapshot } from '@/src/modules/device/calibration/active-calibration-model';
import type {
  ActiveCalibrationCurvePoint,
  ActiveCalibrationModel,
} from '@/src/modules/device/calibration/active-calibration-types';
import type {
  ActiveVolumeEstimateResult,
  ActiveVolumeEstimateStatus,
  ActiveVolumeEstimateUsedSegment,
} from '@/src/modules/device/calibration/active-volume-estimation-types';

const OUT_OF_RANGE_WARNING =
  'La lectura está fuera del rango calibrado. El volumen se limitó al rango disponible.';
const STALE_MODEL_WARNING =
  'El modelo activo está desactualizado. Reactiva el modelo antes de estimar volumen.';
const MISSING_CURVE_WARNING = 'Modelo activo requiere reactivación';
const DISTANCE_MATCH_EPS_MM = 0.05;

export type EstimateVolumeFromActiveModelParams = {
  activeModel: ActiveCalibrationModel | null;
  distanceMm: number | null;
  sensorConnected: boolean;
  isModelStale?: boolean;
};

function emptyResult(
  overrides: Partial<ActiveVolumeEstimateResult> & Pick<ActiveVolumeEstimateResult, 'status'>,
): ActiveVolumeEstimateResult {
  return {
    estimatedVolumeMl: null,
    roundedVolumeMl: null,
    u95Ml: null,
    lowerBoundMl: null,
    upperBoundMl: null,
    distanceMm: null,
    modelKind: null,
    spirometerDeviceId: null,
    spirometerProfileId: null,
    inCalibratedRange: false,
    clamped: false,
    warning: null,
    usedSegment: null,
    ...overrides,
  };
}

function clampVolume(volume: number, min: number, max: number): { value: number; clamped: boolean } {
  if (volume < min) return { value: min, clamped: true };
  if (volume > max) return { value: max, clamped: true };
  return { value: volume, clamped: false };
}

function sortedCurvePoints(points: ActiveCalibrationCurvePoint[]): ActiveCalibrationCurvePoint[] {
  return [...points].sort((a, b) => a.avgDistanceMm - b.avgDistanceMm);
}

function distanceOutOfRangeStatus(
  distanceMm: number,
  distanceMin: number,
  distanceMax: number,
): 'out_of_range_low' | 'out_of_range_high' {
  return distanceMm < distanceMin ? 'out_of_range_low' : 'out_of_range_high';
}

function resolveU95ForDistance(
  distanceMm: number,
  points: ActiveCalibrationCurvePoint[],
  fallbackMaxU95Ml: number | null,
): number | null {
  const sorted = sortedCurvePoints(points);
  if (sorted.length === 0) return fallbackMaxU95Ml;

  for (const p of sorted) {
    if (Math.abs(p.avgDistanceMm - distanceMm) <= DISTANCE_MATCH_EPS_MM) {
      return p.u95Ml ?? fallbackMaxU95Ml;
    }
  }

  const dMin = sorted[0].avgDistanceMm;
  const dMax = sorted[sorted.length - 1].avgDistanceMm;

  if (distanceMm <= dMin) return sorted[0].u95Ml ?? fallbackMaxU95Ml;
  if (distanceMm >= dMax) return sorted[sorted.length - 1].u95Ml ?? fallbackMaxU95Ml;

  for (let i = 1; i < sorted.length; i++) {
    const left = sorted[i - 1];
    const right = sorted[i];
    if (distanceMm >= left.avgDistanceMm && distanceMm <= right.avgDistanceMm) {
      const uLeft = left.u95Ml;
      const uRight = right.u95Ml;
      if (uLeft !== null && uRight !== null) return Math.max(uLeft, uRight);
      return uLeft ?? uRight ?? fallbackMaxU95Ml;
    }
  }

  return fallbackMaxU95Ml;
}

type PiecewiseEstimate = {
  volumeMl: number;
  usedSegment: ActiveVolumeEstimateUsedSegment | null;
};

function piecewiseEstimateFromCurve(
  distanceMm: number,
  points: ActiveCalibrationCurvePoint[],
): PiecewiseEstimate {
  const sorted = sortedCurvePoints(points);
  const n = sorted.length;
  if (n === 0) return { volumeMl: 0, usedSegment: null };
  if (n === 1) {
    return { volumeMl: sorted[0].volumeMl, usedSegment: null };
  }

  const first = sorted[0];
  const last = sorted[n - 1];

  if (distanceMm <= first.avgDistanceMm) {
    return { volumeMl: first.volumeMl, usedSegment: null };
  }
  if (distanceMm >= last.avgDistanceMm) {
    return { volumeMl: last.volumeMl, usedSegment: null };
  }

  for (let i = 1; i < n; i++) {
    const left = sorted[i - 1];
    const right = sorted[i];
    if (distanceMm >= left.avgDistanceMm && distanceMm <= right.avgDistanceMm) {
      const span = right.avgDistanceMm - left.avgDistanceMm;
      const t = span === 0 ? 0.5 : (distanceMm - left.avgDistanceMm) / span;
      return {
        volumeMl: left.volumeMl + t * (right.volumeMl - left.volumeMl),
        usedSegment: {
          volumeFromMl: left.volumeMl,
          volumeToMl: right.volumeMl,
          distanceFromMm: left.avgDistanceMm,
          distanceToMm: right.avgDistanceMm,
        },
      };
    }
  }

  return { volumeMl: last.volumeMl, usedSegment: null };
}

function linearEstimateVolume(
  distanceMm: number,
  activeModel: ActiveCalibrationModel,
): number | null {
  const model = activeModel.recommendedModel;
  const slope = model.coefficients.slope;
  const intercept = model.coefficients.intercept;
  if (slope === undefined || intercept === undefined) return null;
  const raw = slope * distanceMm + intercept;
  if (!Number.isFinite(raw)) return null;
  return raw;
}

function finalizeEstimate(params: {
  activeModel: ActiveCalibrationModel;
  distanceMm: number;
  rawVolumeMl: number;
  inDistanceRange: boolean;
  usedSegment: ActiveVolumeEstimateUsedSegment | null;
  curvePoints: ActiveCalibrationCurvePoint[];
}): ActiveVolumeEstimateResult {
  const { activeModel, distanceMm, rawVolumeMl, inDistanceRange, usedSegment, curvePoints } =
    params;
  const volMin = activeModel.calibratedRangeMl.min;
  const volMax = activeModel.calibratedRangeMl.max;
  const { value: estimatedVolumeMl, clamped: volumeClamped } = clampVolume(
    rawVolumeMl,
    volMin,
    volMax,
  );
  const clamped = volumeClamped || !inDistanceRange;

  const fallbackU95 = activeModel.uncertainty.maxU95Ml;
  const u95Ml = resolveU95ForDistance(distanceMm, curvePoints, fallbackU95);
  const lowerBoundMl =
    u95Ml !== null ? estimatedVolumeMl - u95Ml : null;
  const upperBoundMl =
    u95Ml !== null ? estimatedVolumeMl + u95Ml : null;

  let status: ActiveVolumeEstimateStatus = 'ok';
  let warning: string | null = null;

  if (!inDistanceRange) {
    status = distanceOutOfRangeStatus(
      distanceMm,
      activeModel.distanceRangeMm.min,
      activeModel.distanceRangeMm.max,
    );
    warning = OUT_OF_RANGE_WARNING;
  }

  return {
    estimatedVolumeMl,
    roundedVolumeMl: Math.round(estimatedVolumeMl),
    u95Ml,
    lowerBoundMl,
    upperBoundMl,
    distanceMm,
    modelKind: activeModel.modelKind,
    spirometerDeviceId: activeModel.spirometerDeviceId,
    spirometerProfileId: activeModel.spirometerProfileId,
    inCalibratedRange: inDistanceRange && !volumeClamped,
    clamped,
    status,
    warning,
    usedSegment,
  };
}

export function estimateVolumeFromActiveModel(
  params: EstimateVolumeFromActiveModelParams,
): ActiveVolumeEstimateResult {
  const { activeModel, distanceMm, sensorConnected, isModelStale = false } = params;

  if (!activeModel) {
    return emptyResult({ status: 'no_active_model' });
  }

  const baseMeta = {
    modelKind: activeModel.modelKind,
    spirometerDeviceId: activeModel.spirometerDeviceId,
    spirometerProfileId: activeModel.spirometerProfileId,
  };

  if (isModelStale) {
    return emptyResult({
      ...baseMeta,
      status: 'model_stale',
      warning: STALE_MODEL_WARNING,
    });
  }

  if (!hasActiveCalibrationCurveSnapshot(activeModel)) {
    return emptyResult({
      ...baseMeta,
      status: 'missing_curve',
      warning: MISSING_CURVE_WARNING,
    });
  }

  if (!activeModel.isReadyForTherapy) {
    return emptyResult({
      ...baseMeta,
      status: 'not_ready_for_therapy',
      warning: activeModel.therapyReadinessReason,
    });
  }

  if (!sensorConnected) {
    return emptyResult({
      ...baseMeta,
      status: 'sensor_disconnected',
    });
  }

  if (distanceMm === null || !Number.isFinite(distanceMm)) {
    return emptyResult({
      ...baseMeta,
      status: 'invalid_sensor_reading',
      warning: 'La distancia del sensor no es válida.',
    });
  }

  const curvePoints = activeModel.calibrationCurve!.points;
  const distanceMin = activeModel.distanceRangeMm.min;
  const distanceMax = activeModel.distanceRangeMm.max;
  const inDistanceRange = distanceMm >= distanceMin && distanceMm <= distanceMax;

  if (activeModel.modelKind === 'linear_regression') {
    const raw = linearEstimateVolume(distanceMm, activeModel);
    if (raw === null) {
      return emptyResult({
        ...baseMeta,
        distanceMm,
        status: 'missing_curve',
        warning: 'El modelo lineal activo no tiene coeficientes válidos.',
      });
    }
    return finalizeEstimate({
      activeModel,
      distanceMm,
      rawVolumeMl: raw,
      inDistanceRange,
      usedSegment: null,
      curvePoints,
    });
  }

  if (activeModel.modelKind === 'piecewise_linear') {
    const { volumeMl, usedSegment } = piecewiseEstimateFromCurve(distanceMm, curvePoints);
    return finalizeEstimate({
      activeModel,
      distanceMm,
      rawVolumeMl: volumeMl,
      inDistanceRange,
      usedSegment,
      curvePoints,
    });
  }

  return emptyResult({
    ...baseMeta,
    distanceMm,
    status: 'missing_curve',
    warning: 'Tipo de modelo activo no soportado.',
  });
}

export function activeVolumeEstimateCardStatusLabel(
  result: ActiveVolumeEstimateResult,
): string {
  switch (result.status) {
    case 'ok':
      return 'Listo';
    case 'no_active_model':
      return 'Sin modelo activo';
    case 'model_stale':
      return 'Modelo desactualizado';
    case 'sensor_disconnected':
      return 'Sensor desconectado';
    case 'out_of_range_low':
    case 'out_of_range_high':
      return 'Fuera de rango';
    case 'missing_curve':
      return 'Requiere reactivación';
    case 'not_ready_for_therapy':
      return 'No listo para terapia';
    case 'invalid_sensor_reading':
      return 'Lectura no válida';
    default:
      return '—';
  }
}
