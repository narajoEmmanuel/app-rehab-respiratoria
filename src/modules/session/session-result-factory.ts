import type { LevelId } from '@/src/modules/levels/types/level-progress';
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
  } = params;

  const totalAttempts = validAttempts + invalidAttempts;
  const compliancePercent =
    totalAttempts > 0 ? Math.round((validAttempts / TARGET_ATTEMPTS) * 100) : 0;

  const maxVolumeMl =
    attemptsRuntime.length > 0 ? Math.max(...attemptsRuntime.map((a) => a.peakVolume)) : 0;
  const avgVolumeMl =
    attemptsRuntime.length > 0
      ? Math.round(
          attemptsRuntime.reduce((sum, a) => sum + a.peakVolume, 0) / attemptsRuntime.length,
        )
      : 0;
  const avgHoldSeconds =
    attemptsRuntime.length > 0
      ? attemptsRuntime.reduce((sum, a) => sum + a.holdMs, 0) / attemptsRuntime.length / 1000
      : 0;

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
    completed: status === 'completed',
    interrupted: status === 'interrupted',
    perfect:
      status === 'completed' &&
      validAttempts === TARGET_ATTEMPTS &&
      totalAttempts >= TARGET_ATTEMPTS,
    attempts: attemptsRuntime,
  };
}
