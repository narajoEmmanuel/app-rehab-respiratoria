import type { LevelId } from '@/src/modules/levels/types/level-progress';
import {
  buildSessionPersistenceFields,
  dataSourceForInputMode,
  DEFAULT_SESSION_INPUT_MODE,
  type SessionInputMode,
} from '@/src/modules/session/session-input-mode';
import { TARGET_ATTEMPTS } from '@/src/modules/session/session-progress-service';
import type { SessionAttemptResult, SessionResult, SessionResultStatus } from '@/src/modules/session/types/session-result';

export type BuildSessionResultParams = {
  patientId: number;
  patientLevelId: number;
  levelId: LevelId;
  status: SessionResultStatus;
  validAttempts: number;
  invalidAttempts: number;
  attemptsRuntime: SessionAttemptResult[];
  inputMode?: SessionInputMode;
};

export function buildSessionResult(params: BuildSessionResultParams): SessionResult {
  const {
    patientId,
    patientLevelId,
    levelId,
    status,
    validAttempts,
    invalidAttempts,
    attemptsRuntime,
    inputMode = DEFAULT_SESSION_INPUT_MODE,
  } = params;

  const persistence = buildSessionPersistenceFields(inputMode);
  const totalAttempts = validAttempts + invalidAttempts;
  const compliancePercent =
    totalAttempts > 0 ? Math.round((validAttempts / TARGET_ATTEMPTS) * 100) : 0;

  const attemptVolume = (a: (typeof attemptsRuntime)[number]) =>
    a.officialVolumeMl ?? a.peakVolume;

  const maxVolumeMl =
    attemptsRuntime.length > 0 ? Math.max(...attemptsRuntime.map(attemptVolume)) : 0;
  const avgVolumeMl =
    attemptsRuntime.length > 0
      ? Math.round(
          attemptsRuntime.reduce((sum, a) => sum + attemptVolume(a), 0) / attemptsRuntime.length,
        )
      : 0;

  const sensorVolumes = attemptsRuntime
    .map((a) => a.sensorEstimatedVolumeMl)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const sensorU95Values = attemptsRuntime
    .map((a) => a.sensorU95Ml)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const maxSensorEstimatedVolumeMl =
    sensorVolumes.length > 0 ? Math.max(...sensorVolumes) : null;
  const maxSensorU95Ml = sensorU95Values.length > 0 ? Math.max(...sensorU95Values) : null;
  const avgHoldSeconds =
    attemptsRuntime.length > 0
      ? attemptsRuntime.reduce((sum, a) => sum + a.holdMs, 0) / attemptsRuntime.length / 1000
      : 0;

  const completed = status === 'completed';
  const interrupted = status === 'interrupted';
  const perfect =
    completed &&
    validAttempts === TARGET_ATTEMPTS &&
    totalAttempts === TARGET_ATTEMPTS;

  return {
    patientId,
    patientLevelId,
    levelId,
    status,
    validAttempts,
    invalidAttempts,
    totalAttempts,
    compliancePercent,
    maxVolumeMl,
    avgVolumeMl,
    avgHoldSeconds,
    completed,
    interrupted,
    perfect,
    attempts: attemptsRuntime,
    inputMode: persistence.input_mode,
    dataSource: persistence.data_source,
    isPracticeSession: persistence.is_practice_session,
    officialValidationSource: dataSourceForInputMode(inputMode),
    maxSensorEstimatedVolumeMl:
      inputMode === 'sensor' ? maxSensorEstimatedVolumeMl : null,
    maxSensorU95Ml: inputMode === 'sensor' ? maxSensorU95Ml : null,
  };
}
