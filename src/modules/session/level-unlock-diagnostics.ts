/**
 * TEMP diagnostics for level unlock (dev only). Does not alter patient data.
 */
import { getPatientLevels } from '@/src/modules/diagnostics/diagnostic-service';
import type { PatientLevelRecord, PatientLevelStatus } from '@/src/modules/diagnostics/types';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { getLevelById } from '@/src/modules/session/registry/level-registry';
import { readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import {
  lifetimeStatsForPatientLevelRow,
  todayStatsForPatientLevelRow,
} from '@/src/modules/session/utils/today-session-stats';
import { getLocalDateKey } from '@/src/shared/utils/local-date-key';

/** Must match TARGET_PERFECT_SESSIONS in session-progress-service. */
const UNLOCK_PERFECT_SESSIONS = 6;

export type LevelUnlockDiagnosticSnapshot = {
  patientId: number;
  activeLevelId: LevelId | null;
  activeLevelStatus: PatientLevelStatus | null;
  lifetimePerfectOnActive: number;
  todayPerfectOnActive: number;
  targetPerfectSessions: number;
  /** True when lifetime perfect count on the active level meets the unlock threshold. */
  unlockWouldFire: boolean;
  nextLevelId: LevelId | null;
  nextLevelStatus: PatientLevelStatus | null;
  nextLevelComingSoon: boolean;
  level3LifetimePerfect: number;
  level4Status: PatientLevelStatus | null;
  level4UiLockedReason: string | null;
  patientLevelRowCount: number;
  patientLevelIds: LevelId[];
};

function uiLockedReason(
  row: PatientLevelRecord | undefined,
  comingSoon: boolean | undefined,
): string | null {
  if (comingSoon) return 'comingSoon in level registry';
  if (!row) return 'missing patient_levels row';
  if (row.level_status === 'locked') return 'patient_levels.level_status === locked';
  return null;
}

export async function buildLevelUnlockDiagnosticSnapshot(
  patientId: number,
): Promise<LevelUnlockDiagnosticSnapshot> {
  const levels = await getPatientLevels(patientId);
  const sessions = await readAllSessions();
  const today = getLocalDateKey();
  const active = levels.find((row) => row.level_status === 'active') ?? null;
  const level3 = levels.find((row) => row.level_id === 'level-3');
  const level4 = levels.find((row) => row.level_id === 'level-4');
  const level4Registry = getLevelById('level-4');

  const lifetimeActive = active
    ? lifetimeStatsForPatientLevelRow(sessions, active.patient_level_id)
    : { completed: 0, perfect: 0 };
  const todayActive = active
    ? todayStatsForPatientLevelRow(sessions, active.patient_level_id, today)
    : { completed: 0, perfect: 0 };

  const nextLevelId =
    active?.level_id === 'level-1'
      ? 'level-2'
      : active?.level_id === 'level-2'
        ? 'level-3'
        : active?.level_id === 'level-3'
          ? 'level-4'
          : active?.level_id === 'level-4'
            ? 'level-5'
            : null;

  const nextRow = nextLevelId ? levels.find((row) => row.level_id === nextLevelId) : undefined;

  return {
    patientId,
    activeLevelId: active?.level_id ?? null,
    activeLevelStatus: active?.level_status ?? null,
    lifetimePerfectOnActive: lifetimeActive.perfect,
    todayPerfectOnActive: todayActive.perfect,
    targetPerfectSessions: UNLOCK_PERFECT_SESSIONS,
    unlockWouldFire: lifetimeActive.perfect >= UNLOCK_PERFECT_SESSIONS && active != null,
    nextLevelId,
    nextLevelStatus: nextRow?.level_status ?? null,
    nextLevelComingSoon: level4Registry?.comingSoon === true,
    level3LifetimePerfect: level3
      ? lifetimeStatsForPatientLevelRow(sessions, level3.patient_level_id).perfect
      : 0,
    level4Status: level4?.level_status ?? null,
    level4UiLockedReason: uiLockedReason(level4, level4Registry?.comingSoon),
    patientLevelRowCount: levels.length,
    patientLevelIds: levels.map((row) => row.level_id),
  };
}

export function logLevelUnlockDiagnostics(snapshot: LevelUnlockDiagnosticSnapshot): void {
  if (!__DEV__) return;
  console.log('[level-unlock]', JSON.stringify(snapshot, null, 2));
}
