/**
 * Modelo experimental de calibración: convierte distanceMm en estimatedVolumeMl.
 * Soporta dos variantes:
 *   - linear_regression: regresión lineal por mínimos cuadrados sobre summaries.
 *   - piecewise_linear: interpolación lineal entre summaries ordenadas.
 *
 * No realiza I/O. No depende de React. Solo lee `CalibrationProfile`.
 */
import {
  MAX_ACCEPTABLE_SLOPE_VARIATION_RATIO,
  MAX_ACCEPTABLE_STD_DISTANCE_MM,
  MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY,
  PIECEWISE_PREFERRED_MIN_DISTINCT_VOLUMES,
} from '@/src/modules/device/calibration/calibration-constants';
import {
  computeGeometricScaleReport,
  computeRepeatabilityReport,
  computeRequiredCalibrationCoverage,
  computeSegmentReport,
  computeVolumeCoverage,
  type CalibrationRepeatabilityReport,
  type CalibrationSegmentReport,
  type GeometricScaleReport,
  type RequiredCalibrationCoverage,
} from '@/src/modules/device/calibration/calibration-math';
import { evaluatePredictions } from '@/src/modules/device/calibration/calibration-model-evaluation';
import {
  CALIBRATION_MODEL_VERSION,
  LINEAR_ACCEPTABLE_THRESHOLDS,
  MIN_USEFUL_DISTANCE_RANGE_MM,
  MODEL_WARNING_THRESHOLDS,
  type CalibrationLinealQuality,
  type CalibrationModel,
  type CalibrationModelMetrics,
  type CalibrationModelRange,
  type CalibrationModelRecommendation,
  type CalibrationModelRecommendationKind,
  type CalibrationQuality,
  type CalibrationGeometricScaleSummary,
  type CalibrationRecommendationCoverage,
  type CalibrationRecommendationStatus,
  type CalibrationRequiredProtocolSummary,
  type EstimateVolumeResult,
} from '@/src/modules/device/calibration/calibration-model-types';
import {
  buildUncertaintyRecommendation,
  computeCalibrationUncertaintySummary,
} from '@/src/modules/device/calibration/calibration-uncertainty';
import type {
  CalibrationProfile,
  VolumeCalibrationSummary,
  VolumeDistanceRelation,
} from '@/src/modules/device/calibration/calibration-types';
import {
  getSpirometerProfileById,
  SPIROMETER_PROFILE_3000ML_ID,
} from '@/src/modules/device/spirometer';
import type { SpirometerProfile } from '@/src/modules/device/spirometer/spirometer-types';

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

// ---------------------------------------------------------------------------
// Recomendación de modelo final
// ---------------------------------------------------------------------------

function isLinearAcceptable(model: CalibrationModel): boolean {
  if (model.status !== 'valid') return false;
  const { rSquared, rmseMl, maeMl, maxAbsErrorMl } = model.metrics;
  if (rSquared === null || rmseMl === null || maeMl === null || maxAbsErrorMl === null) {
    return false;
  }
  return (
    rSquared >= LINEAR_ACCEPTABLE_THRESHOLDS.rSquaredMin &&
    rmseMl <= LINEAR_ACCEPTABLE_THRESHOLDS.rmseMlMax &&
    maeMl <= LINEAR_ACCEPTABLE_THRESHOLDS.maeMlMax &&
    maxAbsErrorMl <= LINEAR_ACCEPTABLE_THRESHOLDS.maxAbsErrorMlMax
  );
}

function buildRequiredProtocolSummary(
  requiredCov: RequiredCalibrationCoverage,
): CalibrationRequiredProtocolSummary {
  return {
    requiredVolumes: requiredCov.requiredVolumes,
    missingRequiredVolumes: requiredCov.missingRequiredVolumes,
    requiredVolumesWithLowRepetitions: requiredCov.requiredVolumesWithLowRepetitions,
    totalValidRequiredPoints: requiredCov.totalValidRequiredPoints,
    minimumRequiredPoints: MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY,
    meetsRequiredProtocol: requiredCov.meetsRequiredProtocol,
  };
}

function resolveProfileSnapshot(profile: CalibrationProfile): SpirometerProfile {
  if (profile.spirometerProfileSnapshot) {
    return profile.spirometerProfileSnapshot;
  }
  const fromId = profile.spirometerProfileId
    ? getSpirometerProfileById(profile.spirometerProfileId)
    : null;
  return fromId ?? getSpirometerProfileById(SPIROMETER_PROFILE_3000ML_ID)!;
}

function resolveRequiredVolumes(profile: CalibrationProfile): number[] {
  if (profile.requiredVolumesMl?.length) return profile.requiredVolumesMl;
  return resolveProfileSnapshot(profile).requiredVolumesMl;
}

function buildGeometricScaleSummary(
  report: GeometricScaleReport,
): CalibrationGeometricScaleSummary {
  return {
    expectedDistanceStepPer500MlMm: report.expectedDistanceStepPer500MlMm,
    geometricValidationConfigured: report.geometricValidationConfigured,
    okSegments: report.okSegments,
    reviewSegments: report.reviewSegments,
    criticalSegments: report.criticalSegments,
    missingSegments: report.missingSegments,
    passesGeometricValidation: report.passesGeometricValidation,
  };
}

function deriveTherapyReadinessReason(params: {
  isReadyForTherapy: boolean;
  requiredProtocol: CalibrationRequiredProtocolSummary;
  requiredCov: RequiredCalibrationCoverage;
  coverage: CalibrationRecommendationCoverage;
  relation: VolumeDistanceRelation;
  distanceSpread: number;
  recommendedKind: CalibrationModelRecommendationKind;
  maxStdDistanceMm: number;
  slopeVariationRatio: number | null;
  volumesRecommendedForRetake: number[];
  passesGeometricValidation: boolean;
  hasAcceptableUncertainty: boolean;
}): string {
  if (params.isReadyForTherapy) {
    return 'Calibración apta para estimación terapéutica dentro del rango recomendado.';
  }
  const { requiredProtocol, requiredCov } = params;
  if (params.relation === 'indeterminate') {
    return 'La relación volumen-distancia no es consistente. Repite la calibración.';
  }
  if (params.distanceSpread < MIN_USEFUL_DISTANCE_RANGE_MM) {
    return 'El rango de distancia es insuficiente para estimar volumen.';
  }
  if (params.recommendedKind === 'none') {
    return 'No es posible construir un modelo confiable con los datos actuales.';
  }
  if (requiredProtocol.missingRequiredVolumes.length > 0) {
    return `Faltan volúmenes obligatorios: ${requiredProtocol.missingRequiredVolumes.join(', ')} mL.`;
  }
  if (
    !requiredCov.hasMinRepetitionsForAllRequiredVolumes ||
    requiredProtocol.requiredVolumesWithLowRepetitions.length > 0
  ) {
    return 'Cada volumen obligatorio requiere al menos 5 mediciones válidas.';
  }
  if (requiredProtocol.totalValidRequiredPoints < requiredProtocol.minimumRequiredPoints) {
    return 'Se requieren al menos 30 puntos válidos en el rango recomendado.';
  }
  if (params.volumesRecommendedForRetake.length > 0) {
    return 'Repite las mediciones con alta variación antes de usar el modelo en terapia.';
  }
  if (!params.passesGeometricValidation) {
    return 'La escala geométrica del sensor no coincide con la escala física del espirómetro. Revisa el montaje o repite los puntos marcados.';
  }
  if (!params.hasAcceptableUncertainty) {
    return 'La incertidumbre metrológica es elevada. Revisa el montaje o repite las mediciones.';
  }
  if (!params.coverage.coversRecommended) {
    return 'Falta cubrir el rango recomendado 500-3000 mL.';
  }
  if (params.maxStdDistanceMm > MAX_ACCEPTABLE_STD_DISTANCE_MM) {
    return 'La medición tiene variación elevada. Repite los puntos inestables.';
  }
  if (
    params.slopeVariationRatio !== null &&
    params.slopeVariationRatio > MAX_ACCEPTABLE_SLOPE_VARIATION_RATIO
  ) {
    return 'La medición tiene variación elevada. Repite los puntos inestables.';
  }
  return 'Completa el protocolo mínimo de calibración para uso terapéutico.';
}

type TherapyEvaluationContext = {
  profile: CalibrationProfile;
  requiredProtocol: CalibrationRequiredProtocolSummary;
  requiredCov: RequiredCalibrationCoverage;
  repeatability: CalibrationRepeatabilityReport;
  segmentReport: CalibrationSegmentReport;
  geometricReport: GeometricScaleReport;
  distanceSpread: number;
};

function withTherapyEvaluation(
  base: Omit<
    CalibrationModelRecommendation,
    | 'canEstimateWithinCalibratedRange'
    | 'isReadyForTherapy'
    | 'therapyReadinessReason'
    | 'requiredProtocol'
    | 'geometricScale'
    | 'uncertainty'
  >,
  ctx: TherapyEvaluationContext,
): CalibrationModelRecommendation {
  const uncertaintySummary = computeCalibrationUncertaintySummary(ctx.profile);
  const uncertainty = buildUncertaintyRecommendation(uncertaintySummary);

  const segmentSlopeCritical =
    ctx.segmentReport.slopeVariationRatio !== null &&
    ctx.segmentReport.slopeVariationRatio > MAX_ACCEPTABLE_SLOPE_VARIATION_RATIO;
  const stdCritical = ctx.repeatability.maxStdDistanceMm > MAX_ACCEPTABLE_STD_DISTANCE_MM;
  const retakeVolumesRecommended = ctx.repeatability.volumesRecommendedForRetake.length > 0;
  const isImportedProfile =
    ctx.profile.source === 'imported_equation' || ctx.profile.source === 'imported_file';
  const geometryRequired =
    !isImportedProfile && ctx.profile.spirometerProfileSnapshot.geometricValidationEnabled;
  const geometryOk = ctx.geometricReport.passesGeometricValidation;
  const isReadyForTherapy =
    ctx.requiredProtocol.meetsRequiredProtocol &&
    base.coverage.coversRecommended &&
    ctx.profile.relation !== 'indeterminate' &&
    ctx.distanceSpread >= MIN_USEFUL_DISTANCE_RANGE_MM &&
    base.recommendedKind !== 'none' &&
    !stdCritical &&
    !segmentSlopeCritical &&
    !retakeVolumesRecommended &&
    (!geometryRequired || geometryOk) &&
    uncertainty.hasAcceptableUncertainty;
  const therapyReadinessReason = deriveTherapyReadinessReason({
    isReadyForTherapy,
    requiredProtocol: ctx.requiredProtocol,
    requiredCov: ctx.requiredCov,
    coverage: base.coverage,
    relation: ctx.profile.relation,
    distanceSpread: ctx.distanceSpread,
    recommendedKind: base.recommendedKind,
    maxStdDistanceMm: ctx.repeatability.maxStdDistanceMm,
    slopeVariationRatio: ctx.segmentReport.slopeVariationRatio,
    volumesRecommendedForRetake: ctx.repeatability.volumesRecommendedForRetake,
    passesGeometricValidation: geometryOk,
    hasAcceptableUncertainty: uncertainty.hasAcceptableUncertainty,
  });
  return {
    ...base,
    canEstimateWithinCalibratedRange: base.canEstimateVolume,
    isReadyForTherapy,
    therapyReadinessReason,
    requiredProtocol: ctx.requiredProtocol,
    geometricScale: buildGeometricScaleSummary(ctx.geometricReport),
    uncertainty,
  };
}

/**
 * Decide qué modelo recomendar para estimar volumen, separando explícitamente:
 *   - calidad de la calibración (datos, monotonicidad, rango, cobertura),
 *   - calidad del ajuste lineal (R², errores absolutos),
 *   - modelo recomendado para estimación.
 *
 * Reglas (en orden):
 *   A. <2 volúmenes distintos      → none / needs_more_points
 *   B. relation === indeterminate  → none / needs_recalibration
 *   C. distanceRange < 5 mm        → none / invalid
 *   D. cobertura incompleta        → preferentemente piecewise si ≥4 volúmenes; status limited_range
 *   E. lineal aceptable + cobertura → linear o piecewise (preferir piecewise si ≥4)
 *   F. lineal no aceptable, monotónica, ≥4 volúmenes → piecewise (linealQuality not_recommended)
 */
export function recommendCalibrationModel(
  profile: CalibrationProfile,
  linearModel: CalibrationModel,
  piecewiseModel: CalibrationModel,
): CalibrationModelRecommendation {
  const summaries = profile.summaries;
  const distinctVolumes = distinctVolumeCount(summaries);
  const spirometerProfile = resolveProfileSnapshot(profile);
  const requiredVolumes = resolveRequiredVolumes(profile);
  const requiredCov = computeRequiredCalibrationCoverage(
    profile.points,
    summaries,
    requiredVolumes,
  );
  const requiredProtocol = buildRequiredProtocolSummary(requiredCov);
  const repeatability = computeRepeatabilityReport(
    profile.points,
    summaries,
    requiredVolumes,
  );
  const segmentReport = computeSegmentReport(summaries, profile.relation);
  const geometricReport = computeGeometricScaleReport(
    summaries,
    profile.relation,
    spirometerProfile,
  );
  const distances = summaries.map((s) => s.avgDistanceMm);
  const distanceSpread =
    distances.length >= 2 ? Math.max(...distances) - Math.min(...distances) : 0;

  const therapyCtx: TherapyEvaluationContext = {
    profile,
    requiredProtocol,
    requiredCov,
    repeatability,
    segmentReport,
    geometricReport,
    distanceSpread,
  };

  const coverageRaw = computeVolumeCoverage(summaries, spirometerProfile);
  const coverage: CalibrationRecommendationCoverage = {
    coversRecommended: coverageRaw.coversRecommended,
    coversTotal: coverageRaw.coversTotal,
    recommendedCoveragePct:
      summaries.length === 0 ? null : coverageRaw.recommendedCoveragePct,
    totalCoveragePct: summaries.length === 0 ? null : coverageRaw.totalCoveragePct,
  };

  if (distinctVolumes < 2) {
    return withTherapyEvaluation(
      {
        recommendedKind: 'none',
        status: 'needs_more_points',
        canEstimateVolume: false,
        reason: 'Faltan puntos de calibración en diferentes volúmenes.',
        warnings: [],
        linealQuality: 'unavailable',
        calibrationQuality: 'invalid',
        coverage,
      },
      therapyCtx,
    );
  }

  if (profile.relation === 'indeterminate') {
    return withTherapyEvaluation(
      {
        recommendedKind: 'none',
        status: 'needs_recalibration',
        canEstimateVolume: false,
        reason: 'La relación volumen-distancia no es consistente. Repite la calibración.',
        warnings: [],
        linealQuality: 'unavailable',
        calibrationQuality: 'invalid',
        coverage,
      },
      therapyCtx,
    );
  }

  if (distanceSpread < MIN_USEFUL_DISTANCE_RANGE_MM) {
    return withTherapyEvaluation(
      {
        recommendedKind: 'none',
        status: 'invalid',
        canEstimateVolume: false,
        reason: 'El rango de distancia es insuficiente para estimar volumen.',
        warnings: [],
        linealQuality: 'unavailable',
        calibrationQuality: 'invalid',
        coverage,
      },
      therapyCtx,
    );
  }

  // Calidad del modelo lineal (independiente del modelo recomendado).
  let linealQuality: CalibrationLinealQuality;
  if (linearModel.status !== 'valid') {
    linealQuality = 'unavailable';
  } else {
    linealQuality = isLinearAcceptable(linearModel) ? 'acceptable' : 'not_recommended';
  }

  const piecewiseAvailable = piecewiseModel.status === 'valid';
  const hasEnoughDistinct = distinctVolumes >= PIECEWISE_PREFERRED_MIN_DISTINCT_VOLUMES;

  const warnings: string[] = [];
  let recommendedKind: CalibrationModelRecommendationKind;
  let status: CalibrationRecommendationStatus;
  let canEstimateVolume: boolean;
  let reason: string;
  let calibrationQuality: CalibrationQuality;

  if (coverage.coversRecommended) {
    status = 'ready';
    canEstimateVolume = true;
    if (hasEnoughDistinct && piecewiseAvailable) {
      recommendedKind = 'piecewise_linear';
      reason =
        linealQuality === 'not_recommended'
          ? 'La calibración es monotónica, pero no suficientemente lineal. Se recomienda estimación por tramos.'
          : 'Calibración completa con suficientes volúmenes; se prefiere estimación por tramos para conservar la curva real.';
      calibrationQuality = linealQuality === 'acceptable' ? 'good' : 'limited';
    } else if (linealQuality === 'acceptable') {
      recommendedKind = 'linear_regression';
      reason = 'Calibración completa con relación lineal aceptable.';
      calibrationQuality = 'limited';
    } else if (piecewiseAvailable) {
      recommendedKind = 'piecewise_linear';
      reason =
        'Calibración completa pero con pocos volúmenes; se usa estimación por tramos.';
      calibrationQuality = 'limited';
    } else {
      recommendedKind = 'none';
      canEstimateVolume = false;
      reason = 'No es posible construir un modelo confiable con los datos actuales.';
      calibrationQuality = 'poor';
    }
  } else {
    status = 'limited_range';
    warnings.push(
      'Completa el rango recomendado 500–3000 mL antes de usar el modelo en terapia.',
    );
    if (hasEnoughDistinct && piecewiseAvailable) {
      recommendedKind = 'piecewise_linear';
      canEstimateVolume = true;
      reason =
        linealQuality === 'not_recommended'
          ? 'La calibración es monotónica pero no suficientemente lineal; se estima por tramos solo dentro del rango calibrado.'
          : 'Cobertura limitada; se estima por tramos solo dentro del rango calibrado.';
      calibrationQuality = 'limited';
    } else if (linealQuality === 'acceptable') {
      recommendedKind = 'linear_regression';
      canEstimateVolume = true;
      reason = 'Modelo lineal aceptable, pero la cobertura no alcanza el rango recomendado.';
      calibrationQuality = 'limited';
    } else {
      recommendedKind = 'none';
      canEstimateVolume = false;
      reason =
        'Faltan puntos en el rango recomendado y la relación lineal no es aceptable.';
      calibrationQuality = 'poor';
    }
  }

  if (linealQuality === 'not_recommended' && recommendedKind !== 'linear_regression') {
    warnings.push(
      'El ajuste lineal no alcanza los umbrales de calidad (R²/RMSE/MAE/Error máx).',
    );
  }

  return withTherapyEvaluation(
    {
      recommendedKind,
      status,
      canEstimateVolume,
      reason,
      warnings,
      linealQuality,
      calibrationQuality,
      coverage,
    },
    therapyCtx,
  );
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
