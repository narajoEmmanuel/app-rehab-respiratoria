import type { SensorConnectionStatus, SensorReading } from '@/src/modules/device/types/sensor-reading';
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';
import {
  checkSensorReadingLive,
  describeSensorLiveBlockReason,
} from '@/src/modules/session/sensor/sensor-live-reading';

const VALUE_LOG_THROTTLE_MS = 1000;

let lastValueLogAt = 0;

export function logLevelSensorModeSelected(inputMode: SessionInputMode): void {
  console.log('LEVEL SENSOR MODE SELECTED', { inputMode });
}

export function logLevelSensorSessionStart(params: {
  sessionRunId: string | null;
  inputMode: SessionInputMode;
  calibrationId: string | null;
  levelId: string;
}): void {
  console.log('LEVEL SENSOR SESSION START', params);
}

export function logLevelSensorSubscribe(): void {
  console.log('LEVEL SENSOR SUBSCRIBE');
}

export function logLevelSensorUnsubscribe(): void {
  console.log('LEVEL SENSOR UNSUBSCRIBE');
}

export function logLevelSensorReadinessCheck(params: {
  inputMode: SessionInputMode;
  sensorStatus: SensorConnectionStatus;
  lastReading: SensorReading | null;
  receivedAtMs: number | null;
  sensorConnected: boolean;
  hasActiveCalibration: boolean;
  hasModel: boolean;
  blockReason: string | null;
}): void {
  const live = checkSensorReadingLive({
    lastReading: params.lastReading,
    sensorConnected: params.sensorConnected,
    receivedAtMs: params.receivedAtMs,
  });

  console.log('LEVEL SENSOR READINESS CHECK', {
    inputMode: params.inputMode,
    sensorStatus: params.sensorStatus,
    hasLastReading: params.lastReading != null,
    lastReading: params.lastReading,
    distanceMm: live.distanceMm,
    distanceValid: live.distanceValid,
    lastReadingAgeMs: live.lastReadingAgeMs,
    hasActiveCalibration: params.hasActiveCalibration,
    hasModel: params.hasModel,
    blockReason: params.blockReason,
    liveReadingReason: live.reason
      ? describeSensorLiveBlockReason(live.reason)
      : null,
  });
}

export function logLevelSensorValueUsed(params: {
  distanceMm: number | null;
  estimatedVolumeMl: number;
  targetVolumeMl: number;
  rabbitHeight: number;
}): void {
  const now = Date.now();
  if (now - lastValueLogAt < VALUE_LOG_THROTTLE_MS) return;
  lastValueLogAt = now;
  console.log('LEVEL SENSOR VALUE USED', params);
}

export function logLevelRenderWarning(params: {
  reason: string;
  sessionRunId?: string | null;
  phase?: string;
}): void {
  console.warn('LEVEL RENDER WARNING', params);
}
