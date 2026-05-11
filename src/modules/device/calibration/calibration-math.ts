/**
 * Funciones puras de agregación y derivación sobre puntos de calibración.
 * No tocan React ni AsyncStorage; las consume `SensorCalibrationScreen` y el storage.
 */
import {
  EXPECTED_MAX_VOLUME_ML,
  EXPECTED_MIN_VOLUME_ML,
  EXTENDED_RANGE_ML,
  MIN_OPERATIVE_VOLUME_ML,
  RECOMMENDED_RANGE_ML,
} from '@/src/modules/device/calibration/calibration-constants';
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

  const recSpan = RECOMMENDED_RANGE_ML.max - RECOMMENDED_RANGE_ML.min;
  const recOverlap = Math.max(
    0,
    Math.min(coveredMaxMl, RECOMMENDED_RANGE_ML.max) -
      Math.max(coveredMinMl, RECOMMENDED_RANGE_ML.min),
  );
  const recommendedCoveragePct =
    recSpan > 0 ? clampPct((recOverlap / recSpan) * 100) : 0;

  const totalSpan = EXPECTED_MAX_VOLUME_ML - EXPECTED_MIN_VOLUME_ML;
  const totalOverlap = Math.max(
    0,
    Math.min(coveredMaxMl, EXPECTED_MAX_VOLUME_ML) -
      Math.max(coveredMinMl, EXPECTED_MIN_VOLUME_ML),
  );
  const totalCoveragePct =
    totalSpan > 0 ? clampPct((totalOverlap / totalSpan) * 100) : 0;

  return {
    coveredMinMl,
    coveredMaxMl,
    recommendedCoveragePct,
    totalCoveragePct,
    coversRecommended:
      coveredMinMl <= RECOMMENDED_RANGE_ML.min &&
      coveredMaxMl >= RECOMMENDED_RANGE_ML.max,
    coversExtended:
      coveredMinMl <= EXTENDED_RANGE_ML.min && coveredMaxMl >= EXTENDED_RANGE_ML.max,
    coversTotal:
      coveredMinMl <= EXPECTED_MIN_VOLUME_ML && coveredMaxMl >= EXPECTED_MAX_VOLUME_ML,
  };
}

/** Devuelve `true` si hay summaries por debajo del límite inferior operativo (500 mL). */
export function hasSubOperativeVolumes(
  summaries: VolumeCalibrationSummary[],
): boolean {
  return summaries.some((s) => s.volumeMl < MIN_OPERATIVE_VOLUME_ML);
}

export type BuildCalibrationProfileOptions = {
  id?: string;
  name?: string;
  notes?: string;
  /** Si se pasa un perfil previo, conservamos su `id` y `createdAt`. */
  previous?: CalibrationProfile | null;
  /** Inyectable para tests; por defecto `Date.now()`. */
  now?: number;
};

/** Construye un `CalibrationProfile` consistente derivando summaries, rango y relación. */
export function buildCalibrationProfile(
  points: CalibrationCapturePoint[],
  options: BuildCalibrationProfileOptions = {},
): CalibrationProfile {
  const summaries = computeVolumeSummaries(points);
  const globalRange = computeGlobalDistanceRange(points);
  const relation = determineVolumeDistanceRelation(summaries);
  const now = options.now ?? Date.now();
  const previous = options.previous ?? null;
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
  };
}
