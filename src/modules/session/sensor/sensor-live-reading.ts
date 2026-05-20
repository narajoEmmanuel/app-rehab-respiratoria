import type { SensorReading } from '@/src/modules/device/types/sensor-reading';

/** Ventana para considerar que el feed del sensor sigue activo (recepción en app). */
export const SENSOR_LIVE_READING_MAX_AGE_MS = 6000;

export type SensorLiveReadingRejectReason =
  | 'sensor_not_connected'
  | 'no_last_reading'
  | 'distance_valid_false'
  | 'distance_mm_invalid'
  | 'reading_stale_by_receive_time'
  | null;

export type SensorLiveReadingCheck = {
  live: boolean;
  reason: SensorLiveReadingRejectReason;
  lastReadingAgeMs: number | null;
  distanceMm: number | null;
  distanceValid: boolean | undefined;
};

export type IsSensorReadingLiveParams = {
  lastReading: SensorReading | null | undefined;
  sensorConnected: boolean;
  /** Momento en que la app recibió la última lectura (preferido sobre reading.timestamp). */
  receivedAtMs?: number | null;
  nowMs?: number;
};

function resolveDistanceMm(reading: SensorReading): number | null {
  const distanceMm = reading.distanceMm;
  if (typeof distanceMm !== 'number' || !Number.isFinite(distanceMm)) {
    return null;
  }
  return distanceMm;
}

/**
 * Lectura usable para Nivel 1: misma tolerancia que Diagnóstico en distanceMm,
 * sin exigir distanceValid === true si viene undefined.
 */
export function checkSensorReadingLive(
  params: IsSensorReadingLiveParams,
): SensorLiveReadingCheck {
  const { lastReading, sensorConnected, receivedAtMs = null, nowMs = Date.now() } = params;

  if (!sensorConnected) {
    return {
      live: false,
      reason: 'sensor_not_connected',
      lastReadingAgeMs: null,
      distanceMm: null,
      distanceValid: undefined,
    };
  }

  if (!lastReading) {
    return {
      live: false,
      reason: 'no_last_reading',
      lastReadingAgeMs: null,
      distanceMm: null,
      distanceValid: undefined,
    };
  }

  const distanceValid = lastReading.distanceValid;
  if (distanceValid === false) {
    return {
      live: false,
      reason: 'distance_valid_false',
      lastReadingAgeMs: null,
      distanceMm: resolveDistanceMm(lastReading),
      distanceValid,
    };
  }

  const distanceMm = resolveDistanceMm(lastReading);
  if (distanceMm === null) {
    return {
      live: false,
      reason: 'distance_mm_invalid',
      lastReadingAgeMs: null,
      distanceMm: null,
      distanceValid,
    };
  }

  const receiveBase = receivedAtMs ?? lastReading.timestamp;
  const lastReadingAgeMs =
    typeof receiveBase === 'number' && Number.isFinite(receiveBase)
      ? nowMs - receiveBase
      : null;

  if (
    lastReadingAgeMs === null ||
    lastReadingAgeMs < 0 ||
    lastReadingAgeMs > SENSOR_LIVE_READING_MAX_AGE_MS
  ) {
    return {
      live: false,
      reason: 'reading_stale_by_receive_time',
      lastReadingAgeMs,
      distanceMm,
      distanceValid,
    };
  }

  return {
    live: true,
    reason: null,
    lastReadingAgeMs,
    distanceMm,
    distanceValid,
  };
}

export function isSensorReadingLive(
  lastReading: SensorReading | null | undefined,
  sensorConnected: boolean,
  receivedAtMs?: number | null,
  nowMs?: number,
): boolean {
  return checkSensorReadingLive({
    lastReading,
    sensorConnected,
    receivedAtMs,
    nowMs,
  }).live;
}

export function describeSensorLiveBlockReason(
  reason: SensorLiveReadingRejectReason,
): string {
  switch (reason) {
    case 'sensor_not_connected':
      return 'sensor no conectado (status distinto de connected/receiving)';
    case 'no_last_reading':
      return 'no lastReading en useSensorConnection';
    case 'distance_valid_false':
      return 'distanceValid === false';
    case 'distance_mm_invalid':
      return 'distanceMm ausente o no finito';
    case 'reading_stale_by_receive_time':
      return 'lectura vieja por tiempo desde última recepción en app';
    default:
      return 'desconocido';
  }
}
