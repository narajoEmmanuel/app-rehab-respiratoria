/**
 * Funciones puras de agregación y derivación sobre puntos de calibración.
 * No tocan React ni AsyncStorage; las consume `SensorCalibrationScreen` y el storage.
 */
import {
  MAX_ACCEPTABLE_SLOPE_VARIATION_RATIO,
  MAX_ACCEPTABLE_STD_DISTANCE_MM,
  MIN_REPETITIONS_PER_REQUIRED_VOLUME,
  MIN_REPETITIONS_PER_VOLUME,
  MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY,
  GEOMETRIC_STEP_OK_TOLERANCE_MM,
  GEOMETRIC_STEP_REVIEW_TOLERANCE_MM,
  MIN_SEGMENT_DISTANCE_DELTA_MM,
} from '@/src/modules/device/calibration/calibration-constants';
import { buildGeometricSegmentsMl, getExtendedRangeMinVolumeMl } from '@/src/modules/device/spirometer';
import type { SpirometerProfile } from '@/src/modules/device/spirometer/spirometer-types';
import {
  CALIBRATION_PROFILE_VERSION,
  type CalibrationCapturePoint,
  type CalibrationProfile,
  type GlobalDistanceRange,
  type VolumeCalibrationSummary,
  type VolumeDistanceRelation,
} from '@/src/modules/device/calibration/calibration-types';

function sum(arr: number[]): number {
  let total = 0;
  for (const v of arr) total += v;
  return total;
}

function newProfileId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `cal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function groupCalibrationPointsByVolume(
  points: CalibrationCapturePoint[],
): Map<number, CalibrationCapturePoint[]> {
  const byVolume = new Map<number, CalibrationCapturePoint[]>();
  for (const p of points) {
    const list = byVolume.get(p.volumeMl) ?? [];
    list.push(p);
    byVolume.set(p.volumeMl, list);
  }
  return byVolume;
}

export function computeVolumeSummaries(
  points: CalibrationCapturePoint[],
): VolumeCalibrationSummary[] {
  const byVolume = groupCalibrationPointsByVolume(points);
  const rows: VolumeCalibrationSummary[] = [];
  for (const [volumeMl, list] of byVolume.entries()) {
    const distances = list.map((x) => x.distanceMm);
    const raws = list.map((x) => x.rawDistanceMm);
    rows.push({
      volumeMl,
      repetitions: list.length,
      avgDistanceMm: sum(distances) / list.length,
      avgRawDistanceMm: sum(raws) / list.length,
      minDistanceMm: Math.min(...distances),
      maxDistanceMm: Math.max(...distances),
    });
  }
  rows.sort((a, b) => a.volumeMl - b.volumeMl);
  return rows;
}

export function computeGlobalDistanceRange(
  points: CalibrationCapturePoint[],
): GlobalDistanceRange {
  if (points.length === 0) {
    return { minDistanceMm: null, maxDistanceMm: null, rangeMm: null };
  }
  const ds = points.map((p) => p.distanceMm);
  const minDistanceMm = Math.min(...ds);
  const maxDistanceMm = Math.max(...ds);
  return {
    minDistanceMm,
    maxDistanceMm,
    rangeMm: maxDistanceMm - minDistanceMm,
  };
}

/**
 * Mira los promedios por volumen ordenados ascendentemente y exige tendencia
 * estrictamente creciente (directa) o decreciente (inversa). Cualquier mezcla
 * o empate cuenta como indeterminada.
 */
export function determineVolumeDistanceRelation(
  summaries: VolumeCalibrationSummary[],
): VolumeDistanceRelation {
  if (summaries.length < 2) return 'indeterminate';
  const sorted = [...summaries].sort((a, b) => a.volumeMl - b.volumeMl);
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    diffs.push(sorted[i].avgDistanceMm - sorted[i - 1].avgDistanceMm);
  }
  const allPositive = diffs.every((d) => d > 0);
  const allNegative = diffs.every((d) => d < 0);
  if (allPositive) return 'direct';
  if (allNegative) return 'inverse';
  return 'indeterminate';
}

export type VolumeCoverage = {
  /** Volumen mínimo presente en summaries (mL), o `null` si no hay puntos. */
  coveredMinMl: number | null;
  /** Volumen máximo presente en summaries (mL), o `null` si no hay puntos. */
  coveredMaxMl: number | null;
  /** Porcentaje 0–100 del rango recomendado (500–3000) que queda cubierto. */
  recommendedCoveragePct: number;
  /** Porcentaje 0–100 del rango total operativo (500–5000) que queda cubierto. */
  totalCoveragePct: number;
  /** `true` si los puntos cubren totalmente 500–3000. */
  coversRecommended: boolean;
  /** `true` si los puntos cubren totalmente el bloque extendido 3500–5000. */
  coversExtended: boolean;
  /** `true` si los puntos cubren totalmente 500–5000. */
  coversTotal: boolean;
};

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/**
 * Calcula la cobertura del rango operativo a partir de los summaries.
 * El cero real del espirómetro (0 mL) no resta cobertura pero tampoco aporta,
 * porque las intersecciones se calculan contra los rangos operativos definidos.
 */
export function computeVolumeCoverage(
  summaries: VolumeCalibrationSummary[],
  profile: SpirometerProfile,
): VolumeCoverage {
  if (summaries.length === 0) {
    return {
      coveredMinMl: null,
      coveredMaxMl: null,
      recommendedCoveragePct: 0,
      totalCoveragePct: 0,
      coversRecommended: false,
      coversExtended: false,
      coversTotal: false,
    };
  }
  const volumes = summaries.map((s) => s.volumeMl);
  const coveredMinMl = Math.min(...volumes);
  const coveredMaxMl = Math.max(...volumes);

  const recMin = profile.recommendedMinVolumeMl;
  const recMax = profile.recommendedMaxVolumeMl;
  const recSpan = recMax - recMin;
  const recOverlap = Math.max(
    0,
    Math.min(coveredMaxMl, recMax) - Math.max(coveredMinMl, recMin),
  );
  const recommendedCoveragePct = recSpan > 0 ? clampPct((recOverlap / recSpan) * 100) : 0;

  const opMin = profile.operativeMinVolumeMl;
  const maxVol = profile.maxVolumeMl;
  const totalSpan = maxVol - opMin;
  const totalOverlap = Math.max(
    0,
    Math.min(coveredMaxMl, maxVol) - Math.max(coveredMinMl, opMin),
  );
  const totalCoveragePct = totalSpan > 0 ? clampPct((totalOverlap / totalSpan) * 100) : 0;

  const extMin = getExtendedRangeMinVolumeMl(profile);
  const coversExtended =
    extMin === null
      ? profile.extendedMaxVolumeMl <= profile.recommendedMaxVolumeMl
      : coveredMinMl <= extMin && coveredMaxMl >= profile.extendedMaxVolumeMl;

  return {
    coveredMinMl,
    coveredMaxMl,
    recommendedCoveragePct,
    totalCoveragePct,
    coversRecommended: coveredMinMl <= recMin && coveredMaxMl >= recMax,
    coversExtended,
    coversTotal: coveredMinMl <= opMin && coveredMaxMl >= maxVol,
  };
}

/** Devuelve `true` si hay summaries por debajo del límite inferior operativo del perfil. */
export function hasSubOperativeVolumes(
  summaries: VolumeCalibrationSummary[],
  operativeMinVolumeMl: number,
): boolean {
  return summaries.some((s) => s.volumeMl < operativeMinVolumeMl);
}

export type RequiredCalibrationCoverage = {
  requiredVolumes: number[];
  presentRequiredVolumes: number[];
  missingRequiredVolumes: number[];
  repetitionsByRequiredVolume: Record<number, number>;
  requiredVolumesWithLowRepetitions: number[];
  totalValidRequiredPoints: number;
  hasAllRequiredVolumes: boolean;
  hasMinRepetitionsForAllRequiredVolumes: boolean;
  meetsRequiredProtocol: boolean;
};

/**
 * Evalúa el protocolo mínimo (6 volúmenes obligatorios, ≥5 mediciones por volumen, ≥30 puntos válidos).
 * Los puntos se consideran válidos si pertenecen a un volumen obligatorio y `distanceValid` es true.
 */
export function computeRequiredCalibrationCoverage(
  points: CalibrationCapturePoint[],
  summaries: VolumeCalibrationSummary[],
  requiredVolumesMl: number[],
): RequiredCalibrationCoverage {
  const requiredVolumes = [...requiredVolumesMl];
  const summaryByVolume = new Map<number, VolumeCalibrationSummary>();
  for (const s of summaries) {
    summaryByVolume.set(s.volumeMl, s);
  }
  const repetitionsByRequiredVolume: Record<number, number> = {};
  for (const v of requiredVolumes) {
    repetitionsByRequiredVolume[v] = summaryByVolume.get(v)?.repetitions ?? 0;
  }
  const presentRequiredVolumes = requiredVolumes.filter((v) => summaryByVolume.has(v));
  const missingRequiredVolumes = requiredVolumes.filter((v) => !summaryByVolume.has(v));
  const requiredVolumesWithLowRepetitions = requiredVolumes.filter((v) => {
    const s = summaryByVolume.get(v);
    return s !== undefined && s.repetitions < MIN_REPETITIONS_PER_REQUIRED_VOLUME;
  });
  const requiredSet = new Set<number>(requiredVolumes);
  let totalValidRequiredPoints = 0;
  for (const p of points) {
    if (requiredSet.has(p.volumeMl) && p.distanceValid) {
      totalValidRequiredPoints += 1;
    }
  }
  const hasAllRequiredVolumes = missingRequiredVolumes.length === 0;
  const hasMinRepetitionsForAllRequiredVolumes = requiredVolumes.every((v) => {
    const s = summaryByVolume.get(v);
    return s !== undefined && s.repetitions >= MIN_REPETITIONS_PER_REQUIRED_VOLUME;
  });
  const meetsRequiredProtocol =
    hasAllRequiredVolumes &&
    hasMinRepetitionsForAllRequiredVolumes &&
    totalValidRequiredPoints >= MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY;
  return {
    requiredVolumes,
    presentRequiredVolumes,
    missingRequiredVolumes,
    repetitionsByRequiredVolume,
    requiredVolumesWithLowRepetitions,
    totalValidRequiredPoints,
    hasAllRequiredVolumes,
    hasMinRepetitionsForAllRequiredVolumes,
    meetsRequiredProtocol,
  };
}

export type GeometricScaleSegmentStatus = 'ok' | 'review' | 'critical' | 'missing';

export type GeometricScaleSegment = {
  volumeFromMl: number;
  volumeToMl: number;
  expectedDeltaDistanceMm: number;
  actualDeltaDistanceMm: number | null;
  absoluteErrorMm: number | null;
  percentError: number | null;
  status: GeometricScaleSegmentStatus;
};

export type GeometricScaleReport = {
  expectedDistanceStepPer500MlMm: number | null;
  geometricValidationEnabled: boolean;
  geometricValidationConfigured: boolean;
  requiredSegments: GeometricScaleSegment[];
  okSegments: number;
  reviewSegments: number;
  criticalSegments: number;
  missingSegments: number;
  passesGeometricValidation: boolean;
  warnings: string[];
};

/**
 * Comprueba que cada salto de volumen del perfil activo produzca el desplazamiento esperado en distancia,
 * según verificación geométrica del montaje (regla en perfil actual; no sustituye la calibración completa).
 */
export function computeGeometricScaleReport(
  summaries: VolumeCalibrationSummary[],
  relation: VolumeDistanceRelation,
  profile: SpirometerProfile,
): GeometricScaleReport {
  const expectedMag = profile.expectedDistanceStepMm;
  const geometricValidationConfigured =
    profile.geometricValidationEnabled && expectedMag !== null;

  if (!geometricValidationConfigured) {
    return {
      expectedDistanceStepPer500MlMm: expectedMag,
      geometricValidationEnabled: profile.geometricValidationEnabled,
      geometricValidationConfigured: false,
      requiredSegments: [],
      okSegments: 0,
      reviewSegments: 0,
      criticalSegments: 0,
      missingSegments: 0,
      passesGeometricValidation: true,
      warnings: [
        'La validación geométrica requiere medir la distancia física entre marcas del espirómetro.',
      ],
    };
  }

  const summaryByVolume = new Map<number, VolumeCalibrationSummary>();
  for (const s of summaries) {
    summaryByVolume.set(s.volumeMl, s);
  }

  const requiredSegments: GeometricScaleSegment[] = [];
  const warnings: string[] = [];
  const segmentPairs = buildGeometricSegmentsMl(profile);

  for (const [fromMl, toMl] of segmentPairs) {
    const sFrom = summaryByVolume.get(fromMl);
    const sTo = summaryByVolume.get(toMl);
    const expectedDeltaDistanceMm = relation === 'inverse' ? -expectedMag : expectedMag;

    if (sFrom === undefined || sTo === undefined) {
      requiredSegments.push({
        volumeFromMl: fromMl,
        volumeToMl: toMl,
        expectedDeltaDistanceMm,
        actualDeltaDistanceMm: null,
        absoluteErrorMm: null,
        percentError: null,
        status: 'missing',
      });
      warnings.push(
        `Validación geométrica: faltan datos para el tramo ${fromMl}–${toMl} mL.`,
      );
      continue;
    }

    const actualDeltaDistanceMm = sTo.avgDistanceMm - sFrom.avgDistanceMm;

    if (relation === 'direct' && actualDeltaDistanceMm <= 0) {
      requiredSegments.push({
        volumeFromMl: fromMl,
        volumeToMl: toMl,
        expectedDeltaDistanceMm,
        actualDeltaDistanceMm,
        absoluteErrorMm: Math.abs(actualDeltaDistanceMm - expectedDeltaDistanceMm),
        percentError:
          expectedMag > 0
            ? (Math.abs(actualDeltaDistanceMm - expectedDeltaDistanceMm) / expectedMag) * 100
            : null,
        status: 'critical',
      });
      warnings.push(
        `Validación geométrica: el tramo ${fromMl}–${toMl} mL no aumenta la distancia como en montaje directo.`,
      );
      continue;
    }

    if (relation === 'inverse' && actualDeltaDistanceMm >= 0) {
      requiredSegments.push({
        volumeFromMl: fromMl,
        volumeToMl: toMl,
        expectedDeltaDistanceMm,
        actualDeltaDistanceMm,
        absoluteErrorMm: Math.abs(actualDeltaDistanceMm - expectedDeltaDistanceMm),
        percentError:
          expectedMag > 0
            ? (Math.abs(actualDeltaDistanceMm - expectedDeltaDistanceMm) / expectedMag) * 100
            : null,
        status: 'critical',
      });
      warnings.push(
        `Validación geométrica: el tramo ${fromMl}–${toMl} mL no disminuye la distancia como en montaje inverso.`,
      );
      continue;
    }

    let absoluteErrorMm: number;
    if (relation === 'indeterminate') {
      if (actualDeltaDistanceMm === 0) {
        requiredSegments.push({
          volumeFromMl: fromMl,
          volumeToMl: toMl,
          expectedDeltaDistanceMm,
          actualDeltaDistanceMm,
          absoluteErrorMm: expectedMag,
          percentError: 100,
          status: 'critical',
        });
        warnings.push(
          `Validación geométrica: sin cambio de distancia en el tramo ${fromMl}–${toMl} mL.`,
        );
        continue;
      }
      absoluteErrorMm = Math.min(
        Math.abs(actualDeltaDistanceMm - expectedMag),
        Math.abs(actualDeltaDistanceMm + expectedMag),
      );
    } else {
      absoluteErrorMm = Math.abs(actualDeltaDistanceMm - expectedDeltaDistanceMm);
    }

    const percentError = (absoluteErrorMm / expectedMag) * 100;

    let status: GeometricScaleSegmentStatus;
    if (absoluteErrorMm <= GEOMETRIC_STEP_OK_TOLERANCE_MM) {
      status = 'ok';
    } else if (absoluteErrorMm <= GEOMETRIC_STEP_REVIEW_TOLERANCE_MM) {
      status = 'review';
      warnings.push(
        `Validación geométrica: revisar tramo ${fromMl}–${toMl} mL (error ${absoluteErrorMm.toFixed(1)} mm).`,
      );
    } else {
      status = 'critical';
      warnings.push(
        `Validación geométrica: tramo ${fromMl}–${toMl} mL fuera de tolerancia (error ${absoluteErrorMm.toFixed(1)} mm).`,
      );
    }

    requiredSegments.push({
      volumeFromMl: fromMl,
      volumeToMl: toMl,
      expectedDeltaDistanceMm,
      actualDeltaDistanceMm,
      absoluteErrorMm,
      percentError,
      status,
    });
  }

  let okSegments = 0;
  let reviewSegments = 0;
  let criticalSegments = 0;
  let missingSegments = 0;
  for (const seg of requiredSegments) {
    if (seg.status === 'ok') okSegments += 1;
    else if (seg.status === 'review') reviewSegments += 1;
    else if (seg.status === 'critical') criticalSegments += 1;
    else missingSegments += 1;
  }

  const passesGeometricValidation =
    requiredSegments.length > 0 && requiredSegments.every((s) => s.status === 'ok');

  return {
    expectedDistanceStepPer500MlMm: expectedMag,
    geometricValidationEnabled: profile.geometricValidationEnabled,
    geometricValidationConfigured: true,
    requiredSegments,
    okSegments,
    reviewSegments,
    criticalSegments,
    missingSegments,
    passesGeometricValidation,
    warnings,
  };
}

export type VolumeRepeatabilityWarningLevel = 'ok' | 'moderate' | 'high';

export type VolumeRepeatability = {
  volumeMl: number;
  repetitions: number;
  meanDistanceMm: number;
  /** Desviación típica de `distanceMm` entre mediciones del mismo volumen (muestral, n ≥ 2). */
  sdBetweenRepetitionsMm: number;
  minDistanceMm: number;
  maxDistanceMm: number;
  rangeDistanceMm: number;
  needsRetake: boolean;
  warningLevel: VolumeRepeatabilityWarningLevel;
};

function sampleStdDev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  let sumSq = 0;
  for (const v of values) {
    const d = v - mean;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (n - 1));
}

function classifySdBetweenRepetitions(sdMm: number): {
  warningLevel: VolumeRepeatabilityWarningLevel;
  needsRetake: boolean;
} {
  if (sdMm <= 3) {
    return { warningLevel: 'ok', needsRetake: false };
  }
  if (sdMm <= 5) {
    return { warningLevel: 'moderate', needsRetake: false };
  }
  return { warningLevel: 'high', needsRetake: true };
}

/**
 * Repetibilidad agregada por cada volumen presente en los puntos (dispersión entre repeticiones).
 */
export function computePerVolumeRepeatability(
  points: CalibrationCapturePoint[],
  summaries: VolumeCalibrationSummary[],
): VolumeRepeatability[] {
  if (summaries.length === 0) return [];
  const byVol = groupCalibrationPointsByVolume(points);
  const rows: VolumeRepeatability[] = [];
  for (const s of [...summaries].sort((a, b) => a.volumeMl - b.volumeMl)) {
    const list = byVol.get(s.volumeMl) ?? [];
    const distances = list.map((p) => p.distanceMm);
    const meanDistanceMm =
      distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : s.avgDistanceMm;
    const sdBetweenRepetitionsMm = sampleStdDev(distances);
    const minDistanceMm =
      distances.length > 0 ? Math.min(...distances) : s.minDistanceMm;
    const maxDistanceMm =
      distances.length > 0 ? Math.max(...distances) : s.maxDistanceMm;
    const rangeDistanceMm = maxDistanceMm - minDistanceMm;
    const { warningLevel, needsRetake } = classifySdBetweenRepetitions(sdBetweenRepetitionsMm);
    rows.push({
      volumeMl: s.volumeMl,
      repetitions: s.repetitions,
      meanDistanceMm,
      sdBetweenRepetitionsMm,
      minDistanceMm,
      maxDistanceMm,
      rangeDistanceMm,
      needsRetake,
      warningLevel,
    });
  }
  return rows;
}

export type CalibrationRepeatabilityReport = {
  hasPoints: boolean;
  /** Repeticiones mínimas registradas para un mismo volumen. */
  minRepetitionsPerVolume: number;
  /** Volúmenes con menos de `MIN_REPETITIONS_PER_VOLUME` repeticiones. */
  volumesWithLowRepetitions: number[];
  /** Volúmenes con alta variación entre repeticiones; conviene repetir volumen antes de terapia. */
  volumesRecommendedForRetake: number[];
  /** Detalle por volumen (variación entre repeticiones + rangos). */
  perVolume: VolumeRepeatability[];
  /** Promedio de `stdDistanceMm` sobre todos los puntos. */
  averageStdDistanceMm: number;
  /** `stdDistanceMm` máximo encontrado en algún punto. */
  maxStdDistanceMm: number;
  /** Volumen del punto con la mayor variación. */
  volumeWithMaxStdDistanceMm: number | null;
  warnings: string[];
};

/**
 * Diagnóstico de repetibilidad a partir de los puntos crudos y sus summaries.
 * Usa `stdDistanceMm` de cada punto (ya calculado durante la captura promediada).
 */
export function computeRepeatabilityReport(
  points: CalibrationCapturePoint[],
  summaries: VolumeCalibrationSummary[],
  requiredVolumesMl: number[],
): CalibrationRepeatabilityReport {
  if (points.length === 0 || summaries.length === 0) {
    return {
      hasPoints: false,
      minRepetitionsPerVolume: 0,
      volumesWithLowRepetitions: [],
      volumesRecommendedForRetake: [],
      perVolume: [],
      averageStdDistanceMm: 0,
      maxStdDistanceMm: 0,
      volumeWithMaxStdDistanceMm: null,
      warnings: [],
    };
  }
  const reps = summaries.map((s) => s.repetitions);
  const minRepetitionsPerVolume = Math.min(...reps);
  const volumesWithLowRepetitions = summaries
    .filter((s) => s.repetitions < MIN_REPETITIONS_PER_VOLUME)
    .map((s) => s.volumeMl);
  const requiredSet = new Set<number>(requiredVolumesMl);
  const requiredVolumesWithTherapyLowReps = summaries
    .filter(
      (s) =>
        requiredSet.has(s.volumeMl) && s.repetitions < MIN_REPETITIONS_PER_REQUIRED_VOLUME,
    )
    .map((s) => s.volumeMl);
  const stds = points.map((p) => p.stdDistanceMm);
  const averageStdDistanceMm = stds.reduce((acc, v) => acc + v, 0) / stds.length;
  let maxStdDistanceMm = 0;
  let volumeWithMaxStdDistanceMm: number | null = null;
  for (const p of points) {
    if (p.stdDistanceMm > maxStdDistanceMm) {
      maxStdDistanceMm = p.stdDistanceMm;
      volumeWithMaxStdDistanceMm = p.volumeMl;
    }
  }
  const warnings: string[] = [];
  if (volumesWithLowRepetitions.length > 0) {
    warnings.push(
      `Volúmenes con menos de ${MIN_REPETITIONS_PER_VOLUME} repeticiones (advertencia técnica): ${volumesWithLowRepetitions
        .map((v) => `${v} mL`)
        .join(', ')}.`,
    );
  }
  if (requiredVolumesWithTherapyLowReps.length > 0) {
    warnings.push(
      `Volúmenes obligatorios con menos de ${MIN_REPETITIONS_PER_REQUIRED_VOLUME} mediciones válidas: ${requiredVolumesWithTherapyLowReps
        .sort((a, b) => a - b)
        .map((v) => `${v} mL`)
        .join(', ')}.`,
    );
  }
  if (maxStdDistanceMm > MAX_ACCEPTABLE_STD_DISTANCE_MM) {
    warnings.push(
      `Variación elevada en ${volumeWithMaxStdDistanceMm ?? '?'} mL (±${maxStdDistanceMm.toFixed(2)} mm > ${MAX_ACCEPTABLE_STD_DISTANCE_MM} mm).`,
    );
  }
  const perVolume = computePerVolumeRepeatability(points, summaries);
  const volumesRecommendedForRetake = perVolume
    .filter((row) => row.needsRetake)
    .map((row) => row.volumeMl)
    .sort((a, b) => a - b);
  if (volumesRecommendedForRetake.length > 0) {
    warnings.push(
      `Alta variación entre mediciones en: ${volumesRecommendedForRetake.map((v) => `${v} mL`).join(', ')}. Considera repetir volumen.`,
    );
  }
  return {
    hasPoints: true,
    minRepetitionsPerVolume,
    volumesWithLowRepetitions,
    volumesRecommendedForRetake,
    perVolume,
    averageStdDistanceMm,
    maxStdDistanceMm,
    volumeWithMaxStdDistanceMm,
    warnings,
  };
}

export type CalibrationSegment = {
  volumeFromMl: number;
  volumeToMl: number;
  distanceFromMm: number;
  distanceToMm: number;
  deltaVolumeMl: number;
  deltaDistanceMm: number;
  /** mL por mm; puede ser negativo en relación inversa. `null` si Δd == 0. */
  slopeMlPerMm: number | null;
};

export type CalibrationSegmentReport = {
  segments: CalibrationSegment[];
  /** Mínimo |slope| entre segmentos definidos. */
  minSlopeMlPerMm: number | null;
  /** Máximo |slope| entre segmentos definidos. */
  maxSlopeMlPerMm: number | null;
  /** max|slope| / min|slope|; alto valor indica saltos bruscos. */
  slopeVariationRatio: number | null;
  warnings: string[];
};

/**
 * Calcula segmentos entre pares de summaries consecutivos por volumeMl y
 * evalúa la consistencia de la pendiente. Sirve para detectar problemas de
 * montaje (e.g., salto 500-1000 mL muy distinto al resto).
 */
export function computeSegmentReport(
  summaries: VolumeCalibrationSummary[],
  relation: VolumeDistanceRelation,
): CalibrationSegmentReport {
  if (summaries.length < 2) {
    return {
      segments: [],
      minSlopeMlPerMm: null,
      maxSlopeMlPerMm: null,
      slopeVariationRatio: null,
      warnings: [],
    };
  }
  const sorted = [...summaries].sort((a, b) => a.volumeMl - b.volumeMl);
  const segments: CalibrationSegment[] = [];
  const warnings: string[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const left = sorted[i - 1];
    const right = sorted[i];
    const deltaVolumeMl = right.volumeMl - left.volumeMl;
    const deltaDistanceMm = right.avgDistanceMm - left.avgDistanceMm;
    const slopeMlPerMm = deltaDistanceMm === 0 ? null : deltaVolumeMl / deltaDistanceMm;
    segments.push({
      volumeFromMl: left.volumeMl,
      volumeToMl: right.volumeMl,
      distanceFromMm: left.avgDistanceMm,
      distanceToMm: right.avgDistanceMm,
      deltaVolumeMl,
      deltaDistanceMm,
      slopeMlPerMm,
    });
    if (relation === 'direct' && deltaDistanceMm <= 0) {
      warnings.push(
        `Salto no monotónico entre ${left.volumeMl} y ${right.volumeMl} mL (Δd ${deltaDistanceMm.toFixed(2)} mm).`,
      );
    } else if (relation === 'inverse' && deltaDistanceMm >= 0) {
      warnings.push(
        `Salto no monotónico entre ${left.volumeMl} y ${right.volumeMl} mL (Δd ${deltaDistanceMm.toFixed(2)} mm).`,
      );
    } else if (Math.abs(deltaDistanceMm) < MIN_SEGMENT_DISTANCE_DELTA_MM) {
      warnings.push(
        `Salto de distancia muy pequeño entre ${left.volumeMl} y ${right.volumeMl} mL (${Math.abs(deltaDistanceMm).toFixed(2)} mm).`,
      );
    }
  }
  const absSlopes = segments
    .map((s) => (s.slopeMlPerMm === null ? null : Math.abs(s.slopeMlPerMm)))
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const minSlopeMlPerMm = absSlopes.length > 0 ? Math.min(...absSlopes) : null;
  const maxSlopeMlPerMm = absSlopes.length > 0 ? Math.max(...absSlopes) : null;
  const slopeVariationRatio =
    minSlopeMlPerMm !== null && maxSlopeMlPerMm !== null && minSlopeMlPerMm > 0
      ? maxSlopeMlPerMm / minSlopeMlPerMm
      : null;
  if (
    slopeVariationRatio !== null &&
    slopeVariationRatio > MAX_ACCEPTABLE_SLOPE_VARIATION_RATIO
  ) {
    warnings.push(
      `Variación de pendiente alta (×${slopeVariationRatio.toFixed(1)}); revisa los saltos extremos.`,
    );
  }
  return {
    segments,
    minSlopeMlPerMm,
    maxSlopeMlPerMm,
    slopeVariationRatio,
    warnings,
  };
}

export type BuildCalibrationProfileOptions = {
  id?: string;
  name?: string;
  notes?: string;
  /** Si se pasa un perfil previo, conservamos su `id` y `createdAt`. */
  previous?: CalibrationProfile | null;
  spirometerDeviceId: string;
  spirometerProfileId: string;
  spirometerProfileSnapshot: SpirometerProfile;
  /** Inyectable para tests; por defecto `Date.now()`. */
  now?: number;
};

/** Construye un `CalibrationProfile` consistente derivando summaries, rango y relación. */
export function buildCalibrationProfile(
  points: CalibrationCapturePoint[],
  options: BuildCalibrationProfileOptions,
): CalibrationProfile {
  const summaries = computeVolumeSummaries(points);
  const globalRange = computeGlobalDistanceRange(points);
  const relation = determineVolumeDistanceRelation(summaries);
  const now = options.now ?? Date.now();
  const previous = options.previous ?? null;
  const snapshot = options.spirometerProfileSnapshot;
  return {
    id: options.id ?? previous?.id ?? newProfileId(),
    name: options.name ?? previous?.name ?? 'Calibración local',
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    points,
    summaries,
    globalRange,
    relation,
    isExperimental: true,
    source: 'local_calibration',
    notes: options.notes ?? previous?.notes,
    version: CALIBRATION_PROFILE_VERSION,
    spirometerDeviceId: options.spirometerDeviceId,
    spirometerProfileId: options.spirometerProfileId,
    spirometerProfileSnapshot: snapshot,
    calibrationRangeMl: {
      min: snapshot.operativeMinVolumeMl,
      max: snapshot.maxVolumeMl,
    },
    requiredVolumesMl: [...snapshot.requiredVolumesMl],
  };
}
