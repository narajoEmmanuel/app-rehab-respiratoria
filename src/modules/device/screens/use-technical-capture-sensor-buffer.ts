/**
 * Buffer de muestras del sensor para captura técnica: ref en vivo + stats con throttle.
 * Evita setState en cada mensaje WebSocket (congela la UI / maximum update depth).
 */
import { useEffect, useRef, useState } from 'react';

import type {
  SensorConnectionStatus,
  SensorReading,
} from '@/src/modules/device/types/sensor-reading';

export const BUFFER_MAX_SAMPLES = 20;
export const BUFFER_WINDOW_MS = 2000;
const DISPLAY_THROTTLE_MS = 200;
const MIN_DISTANCE_DELTA_MM = 1;

export type ValidSample = {
  distanceMm: number;
  rawDistanceMm: number;
  timestamp: number;
  source: string;
  receivedAt: number;
};

export type BufferStats = {
  sampleCount: number;
  avgDistanceMm: number;
  avgRawDistanceMm: number;
  minDistanceMm: number;
  maxDistanceMm: number;
  stdDistanceMm: number;
  latestSource: string;
  latestTimestamp: number;
};

export type SignalStability = 'insufficient' | 'stable' | 'acceptable' | 'variable';

const STABILITY_VARIABLE_STD_MM = 5;
const STABILITY_STABLE_STD_MM = 2.5;

export function computeBufferStats(samples: readonly ValidSample[]): BufferStats | null {
  if (samples.length === 0) return null;
  let sum = 0;
  let sumRaw = 0;
  let min = samples[0].distanceMm;
  let max = samples[0].distanceMm;
  for (const s of samples) {
    sum += s.distanceMm;
    sumRaw += s.rawDistanceMm;
    if (s.distanceMm < min) min = s.distanceMm;
    if (s.distanceMm > max) max = s.distanceMm;
  }
  const n = samples.length;
  const avg = sum / n;
  const avgRaw = sumRaw / n;
  let variance = 0;
  for (const s of samples) {
    const d = s.distanceMm - avg;
    variance += d * d;
  }
  const std = Math.sqrt(variance / n);
  const latest = samples[samples.length - 1];
  return {
    sampleCount: n,
    avgDistanceMm: avg,
    avgRawDistanceMm: avgRaw,
    minDistanceMm: min,
    maxDistanceMm: max,
    stdDistanceMm: std,
    latestSource: latest.source,
    latestTimestamp: latest.timestamp,
  };
}

export function classifyStability(stats: BufferStats | null): SignalStability {
  if (!stats || stats.sampleCount < 2) return 'insufficient';
  if (stats.stdDistanceMm >= STABILITY_VARIABLE_STD_MM) return 'variable';
  if (stats.stdDistanceMm <= STABILITY_STABLE_STD_MM) return 'stable';
  return 'acceptable';
}

function statsEqual(a: BufferStats | null, b: BufferStats | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.sampleCount === b.sampleCount &&
    Math.abs(a.avgDistanceMm - b.avgDistanceMm) < 0.05 &&
    Math.abs(a.stdDistanceMm - b.stdDistanceMm) < 0.05
  );
}

export function useTechnicalCaptureSensorBuffer(
  lastReading: SensorReading | null,
  mode: string,
  status: SensorConnectionStatus,
): {
  bufferStats: BufferStats | null;
  stability: SignalStability;
  getBufferStatsSnapshot: () => BufferStats | null;
  clearBuffer: () => void;
} {
  const samplesRef = useRef<ValidSample[]>([]);
  const displayStatsRef = useRef<BufferStats | null>(null);
  const [bufferStats, setBufferStats] = useState<BufferStats | null>(null);
  const [stability, setStability] = useState<SignalStability>('insufficient');
  const lastDisplayAtRef = useRef(0);
  const lastDisplayedAvgRef = useRef<number | null>(null);

  const pushDisplayUpdate = () => {
    const stats = computeBufferStats(samplesRef.current);
    const stab = classifyStability(stats);
    const now = Date.now();
    const avg = stats?.avgDistanceMm ?? null;
    const deltaOk =
      avg === null ||
      lastDisplayedAvgRef.current === null ||
      Math.abs(avg - lastDisplayedAvgRef.current) >= MIN_DISTANCE_DELTA_MM;
    const timeOk = now - lastDisplayAtRef.current >= DISPLAY_THROTTLE_MS;
    if (!deltaOk && !timeOk && statsEqual(stats, displayStatsRef.current)) return;

    lastDisplayAtRef.current = now;
    if (avg !== null) lastDisplayedAvgRef.current = avg;
    displayStatsRef.current = stats;

    setBufferStats((prev) => (statsEqual(prev, stats) ? prev : stats));
    setStability((prev) => (prev === stab ? prev : stab));
  };

  useEffect(() => {
    if (!lastReading || lastReading.distanceValid !== true) return;
    const dm = lastReading.distanceMm;
    if (typeof dm !== 'number' || !Number.isFinite(dm)) return;
    const rawCandidate = lastReading.rawDistanceMm;
    const sample: ValidSample = {
      distanceMm: dm,
      rawDistanceMm:
        typeof rawCandidate === 'number' && Number.isFinite(rawCandidate) ? rawCandidate : dm,
      timestamp: lastReading.timestamp,
      source: String(lastReading.source ?? mode),
      receivedAt: Date.now(),
    };
    const now = sample.receivedAt;
    const merged = [...samplesRef.current, sample].filter(
      (s) => now - s.receivedAt <= BUFFER_WINDOW_MS,
    );
    samplesRef.current =
      merged.length > BUFFER_MAX_SAMPLES
        ? merged.slice(merged.length - BUFFER_MAX_SAMPLES)
        : merged;

    pushDisplayUpdate();
  }, [lastReading, mode]);

  useEffect(() => {
    if (status === 'idle' || status === 'disconnected' || status === 'error') {
      samplesRef.current = [];
      displayStatsRef.current = null;
      lastDisplayedAvgRef.current = null;
      setBufferStats((prev) => (prev === null ? prev : null));
      setStability((prev) => (prev === 'insufficient' ? prev : 'insufficient'));
    }
  }, [status]);

  const getBufferStatsSnapshot = () => computeBufferStats(samplesRef.current);

  const clearBuffer = () => {
    samplesRef.current = [];
    displayStatsRef.current = null;
    lastDisplayedAvgRef.current = null;
    setBufferStats(null);
    setStability('insufficient');
  };

  return { bufferStats, stability, getBufferStatsSnapshot, clearBuffer };
}
