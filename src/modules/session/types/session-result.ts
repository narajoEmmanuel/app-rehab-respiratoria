import type { LevelId } from '@/src/modules/levels/types/level-progress';
import type { SessionDataSource, SessionInputMode } from '@/src/modules/session/session-input-mode';
import type { SensorAttemptEvaluationStatus } from '@/src/modules/session/sensor-evaluation/sensor-attempt-evaluation-types';
import type { OfficialAttemptValidationSource } from '@/src/modules/session/sensor-evaluation/session-attempt-validation-types';

export type SessionResultStatus = 'completed' | 'interrupted';

export type SessionAttemptResult = {
  valid: boolean;
  holdMs: number;
  /** Volumen pico para agregados de sesión; en sensor = volumen oficial estimado. */
  peakVolume: number;
  inputMode?: SessionInputMode;
  dataSource?: SessionDataSource;
  officialVolumeMl?: number | null;
  sensorEstimatedVolumeMl?: number | null;
  sensorU95Ml?: number | null;
  sensorConfidenceLabel?: string | null;
  sensorVolumeReachedConservatively?: boolean;
  sensorAttemptStatus?: SensorAttemptEvaluationStatus | null;
};

export type SessionResult = {
  patientId: number;
  patientLevelId: number;
  levelId: LevelId;
  status: SessionResultStatus;
  validAttempts: number;
  invalidAttempts: number;
  totalAttempts: number;
  compliancePercent: number;
  maxVolumeMl: number;
  avgVolumeMl: number;
  avgHoldSeconds: number;
  completed: boolean;
  interrupted: boolean;
  perfect: boolean;
  attempts: SessionAttemptResult[];
  inputMode: SessionInputMode;
  dataSource: SessionDataSource;
  isPracticeSession: boolean;
  officialValidationSource?: OfficialAttemptValidationSource;
  maxSensorEstimatedVolumeMl?: number | null;
  maxSensorU95Ml?: number | null;
};
