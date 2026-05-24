/**
 * Reconcilia contadores en patient_levels desde SessionRecord (fuente de verdad).
 * - perfect_sessions_completed = perfectas terapéuticas acumuladas en el nivel.
 * - sessions_completed_today = completadas hoy (día calendario local).
 * No altera level_status ni desbloquea niveles.
 */
import type { PatientLevelRecord } from '@/src/modules/diagnostics/types';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import {
  lifetimeStatsForPatientLevelRow,
  todayStatsForPatientLevelRow,
} from '@/src/modules/session/utils/today-session-stats';

export type PatientLevelDailyReconciliationResult = {
  levels: PatientLevelRecord[];
  mutated: boolean;
  /** Filas cuyo perfect_sessions_completed almacenado no coincidía con sesiones. */
  progressRowsResynced: number;
};

export function reconcilePatientLevelDailyCounters(
  allLevels: PatientLevelRecord[],
  sessions: SessionRecord[],
  patientId: number,
  todayKey: string,
): PatientLevelDailyReconciliationResult {
  let mutated = false;
  let progressRowsResynced = 0;

  const levels = allLevels.map((item) => {
    if (item.patient_id !== patientId) return item;

    const lifetime = lifetimeStatsForPatientLevelRow(sessions, item.patient_level_id);
    const todayStats = todayStatsForPatientLevelRow(sessions, item.patient_level_id, todayKey);
    const storedPerfect = item.perfect_sessions_completed ?? 0;
    const storedCompletedToday = item.sessions_completed_today ?? 0;

    if (storedPerfect !== lifetime.perfect || storedCompletedToday !== todayStats.completed) {
      if (storedPerfect !== lifetime.perfect) {
        progressRowsResynced += 1;
        if (__DEV__) {
          console.log('[level-unlock] resynced perfect_sessions_completed from sessions', {
            patientId,
            patientLevelId: item.patient_level_id,
            levelId: item.level_id,
            storedPerfect,
            lifetimePerfect: lifetime.perfect,
          });
        }
      }
      mutated = true;
      return {
        ...item,
        perfect_sessions_completed: lifetime.perfect,
        sessions_completed_today: todayStats.completed,
      };
    }

    return item;
  });

  return { levels, mutated, progressRowsResynced };
}
