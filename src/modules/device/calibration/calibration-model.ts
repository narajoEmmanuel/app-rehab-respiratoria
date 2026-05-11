/**
 * Modelo experimental de calibración: convierte distanceMm en estimatedVolumeMl.
 * Soporta dos variantes:
 *   - linear_regression: regresión lineal por mínimos cuadrados sobre summaries.
 *   - piecewise_linear: interpolación lineal entre summaries ordenadas.
 *
 * No realiza I/O. No depende de React. Solo lee `CalibrationProfile`.
 */
import { evaluatePredictions } from '@/src/modules/device/calibration/calibration-model-evaluation';
import {
  CALIBRATION_MODEL_VERSION,
  MIN_USEFUL_DISTANCE_RANGE_MM,
  MODEL_WARNING_THRESHOLDS,
  type CalibrationModel,
  type CalibrationModelMetrics,
  type CalibrationModelRange,
  type EstimateVolumeResult,
} from '@/src/modules/device/calibration/calibration-model-types';
import type {
  CalibrationProfile,
  VolumeCalibrationSummary,
} from '@/src/modules/device/calibration/calibration-types';

function newModelId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function distinctVolumeCount(summaries: VolumeCalibrationSummary[]): number {
  const set = new Set<number>();
  for (const s of summaries) set.add(s.volumeMl);
  return set.size;
}

function rangeFromValues(values: number[]): CalibrationModelRange {
  if (values.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function deriveWarningsFromMetrics(metrics: CalibrationModelMetrics): string[] {
  const warnings: string[] = [];
  const { rmseMl, maeMl, maxAbsErrorMl, rSquared } = metrics;
  if (rmseMl !== null && rmseMl > MODEL_WARNING_THRESHOLDS.rmseMl) {
    warnings.push(
      `RMSE elevado (${rmseMl.toFixed(0)} mL > ${MODEL_WARNING_THRESHOLDS.rmseMl} mL).`,
    );
  }
  if (maeMl !== null && maeMl > MODEL_WARNING_THRESHOLDS.maeMl) {
    warnings.push(
      `MAE elevado (${maeMl.toFixed(0)} mL > ${MODEL_WARNING_THRESHOLDS.maeMl} mL).`,
    );
  }
  if (
    maxAbsErrorMl !== null &&
    maxAbsErrorMl > MODEL_WARNING_THRESHOLDS.maxAbsErrorMl
  ) {
    warnings.push(
      `Error máximo elevado (${maxAbsErrorMl.toFixed(0)} mL > ${MODEL_WARNING_THRESHOLDS.maxAbsErrorMl} mL).`,
    );
  }
  if (rSquared !== null && rSquared < MODEL_WARNING_THRESHOLDS.rSquaredMin) {
    warnings.push(
      `Coeficiente R² bajo (${rSquared.toFixed(3)} < ${MODEL_WARNING_THRESHOLDS.rSquaredMin}).`,
    );
  }
  return warnings;
}

type EmptyModelInput = {
  profile: CalibrationProfile;
  kind: CalibrationModel['kind'];
  status: CalibrationModel['status'];
  warnings: string[];
  now: number;
};

function buildEmptyModel(input: EmptyModelInput): CalibrationModel {
  const summaries = input.profile.summaries;
  const volumeRange = rangeFromValues(summaries.map((s) => s.volumeMl));
  const distanceRange = rangeFromValues(summaries.map((s) => s.avgDistanceMm));
  return {
    id: newModelId(),
    calibrationProfileId: input.profile.id,
    kind: input.kind,
    createdAt: input.now,
    updatedAt: input.now,
    relation: input.profile.relation,
    coefficients: {},
    pointsUsed: summaries.length,
    volumeRangeMl: volumeRange,
    distanceRangeMm: distanceRange,
    metrics: { rSquared: null, rmseMl: null, maeMl: null, maxAbsErrorMl: null },
    status: input.status,
    warnings: input.warnings,
    isExperimental: true,
    version: CALIBRATION_MODEL_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Linear regression
// ---------------------------------------------------------------------------

type LinearFit = {
  slope: number;
  intercept: number;
};

function linearLeastSquaresFit(
  xs: number[],
  ys: number[],
): LinearFit | null {
  const n = xs.length;
  if (n < 2) return null;
  const meanX = xs.reduce((acc, v) => acc + v, 0) / n;
  const meanY = ys.reduce((acc, v) => acc + v, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    numerator += dx * (ys[i] - meanY);
    denominator += dx * dx;
  }
  if (denominator === 0) return null;
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;
  return { slope, intercept };
}

export function buildLinearCalibrationModel(profile: CalibrationProfile): CalibrationModel {
  const now = Date.now();
  const summaries = profile.summaries;

  if (distinctVolumeCount(summaries) < 2) {
    return buildEmptyModel({
      profile,
      kind: 'linear_regression',
      status: 'insufficient_data',
      warnings: ['Se necesitan al menos 2 volúmenes distintos para ajustar el modelo.'],
      now,
    });
  }

  if (profile.relation === 'indeterminate') {
    return buildEmptyModel({
      profile,
      kind: 'linear_regression',
      status: 'non_monotonic',
      warnings: [
        'La relación volumen-distancia no es monotónica; revisa los puntos antes de modelar.',
      ],
      now,
    });
  }

  const xs = summaries.map((s) => s.avgDistanceMm);
  const ys = summaries.map((s) => s.volumeMl);
  const distanceRange = rangeFromValues(xs);
  const volumeRange = rangeFromValues(ys);
  const distanceSpread = distanceRange.max - distanceRange.min;

  if (distanceSpread < MIN_USEFUL_DISTANCE_RANGE_MM) {
    return buildEmptyModel({
      profile,
      kind: 'linear_regression',
      status: 'invalid_range',
      warnings: [
        `Rango de distancia insuficiente (${distanceSpread.toFixed(1)} mm < ${MIN_USEFUL_DISTANCE_RANGE_MM} mm).`,
      ],
      now,
    });
  }

  const fit = linearLeastSquaresFit(xs, ys);
  if (!fit) {
    return buildEmptyModel({
      profile,
      kind: 'linear_regression',
      status: 'invalid_range',
      warnings: ['No fue posible ajustar la regresión (denominador degenerado).'],
      now,
    });
  }

  const predicted = xs.map((x) => fit.slope * x + fit.intercept);
  const metrics = evaluatePredictions(ys, predicted);
  const warnings = deriveWarningsFromMetrics(metrics);

  return {
    id: newModelId(),
    calibrationProfileId: profile.id,
    kind: 'linear_regression',
    createdAt: now,
    updatedAt: now,
    relation: profile.relation,
    coefficients: { slope: fit.slope, intercept: fit.intercept },
    pointsUsed: summaries.length,
    volumeRangeMl: volumeRange,
    distanceRangeMm: distanceRange,
    metrics,
    status: 'valid',
    warnings,
    isExperimental: true,
    version: CALIBRATION_MODEL_VERSION,
  };
}

export function estimateVolumeFromDistanceLinear(
  distanceMm: number,
  model: CalibrationModel,
): EstimateVolumeResult {
  if (!Number.isFinite(distanceMm)) {
    return {
      estimatedVolumeMl: null,
      clamped: false,
      inRange: false,
      status: 'invalid_input',
      warning: 'La distancia recibida no es un número válido.',
    };
  }
  if (model.kind !== 'linear_regression') {
    return {
      estimatedVolumeMl: null,
      clamped: false,
      inRange: false,
      status: 'no_model',
      warning: 'El modelo no es de tipo linear_regression.',
    };
  }
  if (model.status !== 'valid') {
    return {
      estimatedVolumeMl: null,
      clamped: false,
      inRange: false,
      status: model.status === 'insufficient_data' ? 'insufficient_data' : 'no_model',
      warning: model.warnings[0],
    };
  }
  const slope = model.coefficients.slope;
  const intercept = model.coefficients.intercept;
  if (slope === undefined || intercept === undefined) {
    return {
      estimatedVolumeMl: null,
      clamped: false,
      inRange: false,
      status: 'no_model',
      warning: 'El modelo no tiene coeficientes válidos.',
    };
  }

  const distanceMin = model.distanceRangeMm.min;
  const distanceMax = model.distanceRangeMm.max;
  const volumeMin = model.volumeRangeMl.min;
  const volumeMax = model.volumeRangeMl.max;

  const inRange = distanceMm >= distanceMin && distanceMm <= distanceMax;
  const raw = slope * distanceMm + intercept;
  const clampedValue = clamp(raw, volumeMin, volumeMax);
  const clamped = clampedValue !== raw;

  return {
    estimatedVolumeMl: clampedValue,
    clamped,
    inRange,
    status: 'ok',
    warning: !inRange
      ? 'Distancia fuera del rango calibrado; el resultado se aplica con clamp al volumen mínimo/máximo.'
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Piecewise linear
// ---------------------------------------------------------------------------

function sortedByDistance(summaries: VolumeCalibrationSummary[]): VolumeCalibrationSummary[] {
  return [...summaries].sort((a, b) => a.avgDistanceMm - b.avgDistanceMm);
}

function piecewisePredictMl(
  distanceMm: number,
  summariesSortedByDistance: VolumeCalibrationSummary[],
): number | null {
  const n = summariesSortedByDistance.length;
  if (n === 0) return null;
  if (n === 1) return summariesSortedByDistance[0].volumeMl;

  const first = summariesSortedByDistance[0];
  const last = summariesSortedByDistance[n - 1];
  if (distanceMm <= first.avgDistanceMm) return first.volumeMl;
  if (distanceMm >= last.avgDistanceMm) return last.volumeMl;

  for (let i = 1; i < n; i++) {
    const left = summariesSortedByDistance[i - 1];
    const right = summariesSortedByDistance[i];
    if (distanceMm >= left.avgDistanceMm && distanceMm <= right.avgDistanceMm) {
      const span = right.avgDistanceMm - left.avgDistanceMm;
      if (span === 0) return (left.volumeMl + right.volumeMl) / 2;
      const t = (distanceMm - left.avgDistanceMm) / span;
      return left.volumeMl + t * (right.volumeMl - left.volumeMl);
    }
  }
  return null;
}

export function buildPiecewiseLinearCalibrationModel(
  profile: CalibrationProfile,
): CalibrationModel {
  const now = Date.now();
  const summaries = profile.summaries;

  if (distinctVolumeCount(summaries) < 2) {
    return buildEmptyModel({
      profile,
      kind: 'piecewise_linear',
      status: 'insufficient_data',
      warnings: ['Se necesitan al menos 2 volúmenes distintos para el modelo por tramos.'],
      now,
    });
  }

  const sortedByDist = sortedByDistance(summaries);
  const xs = sortedByDist.map((s) => s.avgDistanceMm);
  const ys = sortedByDist.map((s) => s.volumeMl);
  const distanceRange = rangeFromValues(xs);
  const volumeRange = rangeFromValues(ys);
  const distanceSpread = distanceRange.max - distanceRange.min;

  if (distanceSpread < MIN_USEFUL_DISTANCE_RANGE_MM) {
    return buildEmptyModel({
      profile,
      kind: 'piecewise_linear',
      status: 'invalid_range',
      warnings: [
        `Rango de distancia insuficiente (${distanceSpread.toFixed(1)} mm < ${MIN_USEFUL_DISTANCE_RANGE_MM} mm).`,
      ],
      now,
    });
  }

  // Predicción exacta sobre los mismos puntos (cuelga 0 error por construcción si no hay
  // dos volúmenes con la misma distancia). Se evalúa por consistencia y futuras métricas.
  const predicted: number[] = xs.map(
    (x) => piecewisePredictMl(x, sortedByDist) ?? Number.NaN,
  );
  const metrics = evaluatePredictions(ys, predicted);
  const warnings = deriveWarningsFromMetrics(metrics);

  return {
    id: newModelId(),
    calibrationProfileId: profile.id,
    kind: 'piecewise_linear',
    createdAt: now,
    updatedAt: now,
    relation: profile.relation,
    coefficients: {},
    pointsUsed: summaries.length,
    volumeRangeMl: volumeRange,
    distanceRangeMm: distanceRange,
    metrics,
    status: 'valid',
    warnings,
    isExperimental: true,
    version: CALIBRATION_MODEL_VERSION,
  };
}

export function estimateVolumeFromDistancePiecewise(
  distanceMm: number,
  profile: CalibrationProfile,
): EstimateVolumeResult {
  if (!Number.isFinite(distanceMm)) {
    return {
      estimatedVolumeMl: null,
      clamped: false,
      inRange: false,
      status: 'invalid_input',
      warning: 'La distancia recibida no es un número válido.',
    };
  }
  const summaries = profile.summaries;
  if (distinctVolumeCount(summaries) < 2) {
    return {
      estimatedVolumeMl: null,
      clamped: false,
      inRange: false,
      status: 'insufficient_data',
      warning: 'Se necesitan al menos 2 volúmenes distintos.',
    };
  }
  const sortedByDist = sortedByDistance(summaries);
  const distanceMin = sortedByDist[0].avgDistanceMm;
  const distanceMax = sortedByDist[sortedByDist.length - 1].avgDistanceMm;
  const inRange = distanceMm >= distanceMin && distanceMm <= distanceMax;

  const predicted = piecewisePredictMl(distanceMm, sortedByDist);
  if (predicted === null) {
    return {
      estimatedVolumeMl: null,
      clamped: false,
      inRange: false,
      status: 'no_model',
      warning: 'No fue posible interpolar el volumen.',
    };
  }

  const clamped = !inRange;
  return {
    estimatedVolumeMl: predicted,
    clamped,
    inRange,
    status: 'ok',
    warning: clamped
      ? 'Distancia fuera del rango calibrado; el resultado usa el extremo más cercano.'
      : undefined,
  };
}

export function estimateVolumeFromDistance(
  distanceMm: number,
  model: CalibrationModel,
  profile?: CalibrationProfile,
): EstimateVolumeResult {
  if (model.kind === 'linear_regression') {
    return estimateVolumeFromDistanceLinear(distanceMm, model);
  }
  if (model.kind === 'piecewise_linear') {
    if (!profile) {
      return {
        estimatedVolumeMl: null,
        clamped: false,
        inRange: false,
        status: 'no_model',
        warning: 'El modelo por tramos requiere el CalibrationProfile original.',
      };
    }
    if (model.status === 'insufficient_data') {
      return {
        estimatedVolumeMl: null,
        clamped: false,
        inRange: false,
        status: 'insufficient_data',
        warning: model.warnings[0],
      };
    }
    return estimateVolumeFromDistancePiecewise(distanceMm, profile);
  }
  return {
    estimatedVolumeMl: null,
    clamped: false,
    inRange: false,
    status: 'no_model',
    warning: 'Tipo de modelo no soportado.',
  };
}
