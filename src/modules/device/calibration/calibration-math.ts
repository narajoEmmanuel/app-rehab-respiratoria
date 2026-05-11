/**
 * Funciones puras de agregación y derivación sobre puntos de calibración.
 * No tocan React ni AsyncStorage; las consume `SensorCalibrationScreen` y el storage.
 */
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
