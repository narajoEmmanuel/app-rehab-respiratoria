/**
 * Readiness de Nivel 1 con sensor: misma fuente que Diagnóstico (resolveDiagnosticCalibration).
 * No modifica calibración ni diagnóstico; solo consume la auditoría existente.
 */
import { resolveDiagnosticCalibration } from '@/src/modules/device/calibration/diagnostic-calibration-readiness';
import type { DiagnosticCalibrationBlockReason } from '@/src/modules/device/calibration/diagnostic-calibration-readiness';
import {
  evaluateDiagnosticSensorReadinessOnDemand,
  type DiagnosticSensorReadinessGate,
} from '@/src/modules/device/volume-estimation';
import type { SensorConnectionStatus, SensorReading } from '@/src/modules/device/types/sensor-reading';
import { logLevelSensorReadinessCheck } from '@/src/modules/session/sensor/level-sensor-debug';
import { checkSensorReadingLive } from '@/src/modules/session/sensor/sensor-live-reading';
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';

export type EvaluateLevelSensorReadinessParams = {
  inputMode?: SessionInputMode;
  sensorConnected: boolean;
  sensorStatus: SensorConnectionStatus;
  lastReading: SensorReading | null;
  receivedAtMs?: number | null;
  patientId?: number | null;
  spirometerDeviceId?: string;
  /** Si false, la calibración puede pasar sin lectura viva (p. ej. al montar la sesión). */
  requireLiveReading?: boolean;
};

export type LevelSensorReadinessResult = {
  canStart: boolean;
  gate: DiagnosticSensorReadinessGate;
  hasLiveReading: boolean;
  blockReason: DiagnosticCalibrationBlockReason | 'no_live_reading' | null;
  spirometerId: string | null;
  calibrationId: string | null;
};

function logDiagnosisReadiness(params: {
  patientId: number | null;
  spirometerId: string | null;
  calibrationId: string | null;
  hasActiveCalibration: boolean;
  hasModel: boolean;
  sensorStatus: SensorConnectionStatus;
  hasLiveReading: boolean;
  canStart: boolean;
  blockReason: string | null;
}): void {
  console.log('DIAGNOSIS READINESS', params);
}

function logLevelReadiness(params: {
  patientId: number | null;
  spirometerId: string | null;
  calibrationId: string | null;
  hasActiveCalibration: boolean;
  hasModel: boolean;
  sensorStatus: SensorConnectionStatus;
  hasLiveReading: boolean;
  blockReason: string | null;
}): void {
  console.log('LEVEL READINESS', params);
}

/**
 * Valida calibración activa igual que Diagnóstico (`resolveDiagnosticCalibration` + gate diagnóstico).
 */
export async function evaluateLevelSensorReadiness(
  params: EvaluateLevelSensorReadinessParams,
): Promise<LevelSensorReadinessResult> {
  const {
    inputMode = 'sensor',
    sensorConnected,
    sensorStatus,
    lastReading,
    receivedAtMs = null,
    patientId,
    spirometerDeviceId,
    requireLiveReading = true,
  } = params;

  const audit = await resolveDiagnosticCalibration({
    preferredSpirometerDeviceId: spirometerDeviceId,
    sensorConnected,
    patientId: patientId ?? null,
  });

  const liveCheck = checkSensorReadingLive({
    lastReading,
    sensorConnected,
    receivedAtMs,
  });
  const hasLiveReading = liveCheck.live;
  const spirometerId = audit.resolvedSpirometerId ?? audit.activeSpirometerId;
  const calibrationId = audit.activeModelId ?? audit.profileId;
  const hasActiveCalibration = audit.profileFound && audit.activeModelFound;
  const hasModel =
    audit.activeModelFound &&
    (audit.activeModelHasCurve || audit.modelCoefficientsAvailable);

  const diagnosisLog = {
    patientId: audit.patientId,
    spirometerId,
    calibrationId,
    hasActiveCalibration,
    hasModel,
    sensorStatus,
    hasLiveReading,
    canStart: audit.canStartDiagnostic,
    blockReason: audit.blockReason,
  };
  logDiagnosisReadiness(diagnosisLog);

  const gate = await evaluateDiagnosticSensorReadinessOnDemand({
    sensorConnected,
    patientId: patientId ?? null,
    spirometerDeviceId: spirometerDeviceId ?? audit.resolvedSpirometerId ?? undefined,
  });

  let blockReason: LevelSensorReadinessResult['blockReason'] = audit.blockReason;
  let canStart = gate.canStartDiagnostic;

  if (canStart && requireLiveReading && !hasLiveReading) {
    canStart = false;
    blockReason = 'no_live_reading';
  }

  const levelBlockReason = canStart ? null : (blockReason ?? gate.status);

  logLevelSensorReadinessCheck({
    inputMode,
    sensorStatus,
    lastReading,
    receivedAtMs,
    sensorConnected,
    hasActiveCalibration,
    hasModel,
    blockReason: levelBlockReason,
  });

  logLevelReadiness({
    patientId: audit.patientId,
    spirometerId,
    calibrationId,
    hasActiveCalibration,
    hasModel,
    sensorStatus,
    hasLiveReading,
    blockReason: levelBlockReason,
  });

  return {
    canStart,
    gate,
    hasLiveReading,
    blockReason: canStart ? null : blockReason,
    spirometerId,
    calibrationId,
  };
}
