/**
 * Purpose: Parse raw websocket payloads into a safe SensorReading.
 * Module: device
 * Dependencies: device/types/sensor-reading
 */
import type {
  SensorFlowState,
  SensorMessageParseResult,
} from '@/src/modules/device/types/sensor-reading';

const VALID_FLOW_STATES: SensorFlowState[] = ['idle', 'inhaling', 'holding', 'exhaling'];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeFlowState(value: unknown): SensorFlowState {
  if (typeof value === 'string' && VALID_FLOW_STATES.includes(value as SensorFlowState)) {
    return value as SensorFlowState;
  }
  return 'idle';
}

export function parseSensorMessage(rawMessage: unknown): SensorMessageParseResult {
  try {
    const payload =
      typeof rawMessage === 'string'
        ? (JSON.parse(rawMessage) as Record<string, unknown>)
        : (rawMessage as Record<string, unknown>);

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const { volumeMl, sustainedTimeMs, validRepetitions, distanceMm, flowState, isValidAttempt } =
      payload;

    const hasRequiredFields =
      isFiniteNumber(volumeMl) &&
      isFiniteNumber(sustainedTimeMs) &&
      isFiniteNumber(validRepetitions);

    if (!hasRequiredFields) {
      return null;
    }

    const timestamp = isFiniteNumber(payload.timestamp) ? payload.timestamp : Date.now();

    return {
      timestamp,
      volumeMl,
      sustainedTimeMs,
      validRepetitions,
      distanceMm: isFiniteNumber(distanceMm) ? distanceMm : undefined,
      flowState: normalizeFlowState(flowState),
      isValidAttempt: typeof isValidAttempt === 'boolean' ? isValidAttempt : undefined,
      source: 'websocket',
    };
  } catch {
    return null;
  }
}
