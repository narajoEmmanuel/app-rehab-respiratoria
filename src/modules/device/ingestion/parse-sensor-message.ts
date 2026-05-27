import type {
  SensorFlowState,
  SensorMessageParseResult,
  SensorSource,
  SensorStatus,
} from '@/src/modules/device/types/sensor-reading';

const VALID_FLOW_STATES: SensorFlowState[] = ['idle', 'inhaling', 'holding', 'exhaling'];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toFiniteNumberOr(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? value : fallback;
}

function normalizeFlowState(value: unknown): SensorFlowState {
  if (typeof value === 'string' && VALID_FLOW_STATES.includes(value as SensorFlowState)) {
    return value as SensorFlowState;
  }
  return 'idle';
}

function normalizeSource(value: unknown): SensorSource {
  if (typeof value === 'string' && value.length > 0) {
    return value as SensorSource;
  }
  return 'websocket';
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function normalizeSensorStatus(value: unknown): SensorStatus | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value as SensorStatus;
  }
  return undefined;
}

/**
 * Convierte un mensaje crudo del ESP32 (string JSON u objeto) en un SensorReading.
 * Tolera payloads "raw_sensor"/"vl53l0x" donde volumen/repeticiones aún no se calculan:
 * en ese caso se rellenan con 0 en lugar de descartar la lectura.
 */
export function parseSensorMessage(rawMessage: unknown): SensorMessageParseResult {
  try {
    const payload =
      typeof rawMessage === 'string'
        ? (JSON.parse(rawMessage) as Record<string, unknown>)
        : (rawMessage as Record<string, unknown>);

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const {
      volumeMl,
      sustainedTimeMs,
      validRepetitions,
      distanceMm,
      rawDistanceMm,
      distanceValid,
      flowState,
      isValidAttempt,
      source,
      firmwareVersion,
      deviceId,
      timestampMs,
      sensorStatus,
      sampleCount,
      filter,
    } = payload;

    const timestamp = isFiniteNumber(payload.timestamp)
      ? payload.timestamp
      : isFiniteNumber(timestampMs)
        ? (timestampMs as number)
        : Date.now();

    return {
      timestamp,
      volumeMl: toFiniteNumberOr(volumeMl, 0),
      sustainedTimeMs: toFiniteNumberOr(sustainedTimeMs, 0),
      validRepetitions: toFiniteNumberOr(validRepetitions, 0),
      distanceMm: isFiniteNumber(distanceMm) ? distanceMm : undefined,
      rawDistanceMm: isFiniteNumber(rawDistanceMm) ? rawDistanceMm : undefined,
      distanceValid: typeof distanceValid === 'boolean' ? distanceValid : undefined,
      flowState: normalizeFlowState(flowState),
      isValidAttempt: typeof isValidAttempt === 'boolean' ? isValidAttempt : undefined,
      source: normalizeSource(source),
      firmwareVersion: normalizeOptionalString(firmwareVersion),
      deviceId: normalizeOptionalString(deviceId),
      timestampMs: isFiniteNumber(timestampMs) ? timestampMs : undefined,
      sensorStatus: normalizeSensorStatus(sensorStatus),
      sampleCount: isFiniteNumber(sampleCount) ? sampleCount : undefined,
      filter: normalizeOptionalString(filter),
    };
  } catch {
    return null;
  }
}
