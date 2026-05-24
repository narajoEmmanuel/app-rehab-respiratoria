/**
 * Conteos del día a partir de SessionRecord (fuente única para historial, niveles y desbloqueo).
 */
import { isTherapeuticSessionRecord } from '@/src/modules/session/session-record-classification';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';

function isCompletedSession(s: SessionRecord): boolean {
  return isTherapeuticSessionRecord(s) && s.completed && s.interrupted !== true;
}

/** Sesiones terapéuticas completadas (todas las fechas) — progreso acumulado y desbloqueo. */
export function lifetimeStatsForPatientLevelRow(
  sessions: SessionRecord[],
  patientLevelId: number,
): TodaySessionStats {
  const levelSessions = sessions.filter((s) => s.patient_level_id === patientLevelId);
  const completed = levelSessions.filter(isCompletedSession);
  return {
    completed: completed.length,
    perfect: completed.filter((s) => s.perfect).length,
  };
}

export type TodaySessionStats = {
  completed: number;
  perfect: number;
};

/** Por fila de paciente-nivel (mismo criterio que updatePatientLevelProgress / perfect_sessions_completed). */
export function todayStatsForPatientLevelRow(
  sessions: SessionRecord[],
  patientLevelId: number,
  dayKey: string,
): TodaySessionStats {
  const daySessions = sessions.filter(
    (s) => s.patient_level_id === patientLevelId && sessionRecordLocalDayKey(s.session_date) === dayKey,
  );
  const completed = daySessions.filter(isCompletedSession);
  return {
    completed: completed.length,
    perfect: completed.filter((s) => s.perfect).length,
  };
}

/** Por paciente + level_id (historial / home con nivel activo). */
export function todayStatsForPatientAndLevel(
  sessions: SessionRecord[],
  patientId: number,
  levelId: string,
  dayKey: string,
): TodaySessionStats {
  const daySessions = sessions.filter(
    (s) =>
      s.patient_id === patientId &&
      s.level_id === levelId &&
      sessionRecordLocalDayKey(s.session_date) === dayKey,
  );
  const completed = daySessions.filter(isCompletedSession);
  return {
    completed: completed.length,
    perfect: completed.filter((s) => s.perfect).length,
  };
}
