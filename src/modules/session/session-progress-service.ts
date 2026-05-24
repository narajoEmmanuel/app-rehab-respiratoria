import { getCurrentActiveLevel, getPatientLevels, savePatientLevels, ensurePatientLevelCatalog } from '@/src/modules/diagnostics/diagnostic-service';
import type { PatientLevelRecord } from '@/src/modules/diagnostics/types';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { updatePatientCurrentLevel } from '@/src/modules/patient/patient-service';
import { supabase } from '@/src/lib/supabase';
import {
  buildLevelUnlockDiagnosticSnapshot,
  logLevelUnlockDiagnostics,
} from '@/src/modules/session/level-unlock-diagnostics';
import {
  readAllAttempts,
  readAllSessions,
  writeAllAttempts,
  writeAllSessions,
} from '@/src/modules/session/storage/session-progress-repository';
import type { AttemptRecord, SessionRecord } from '@/src/modules/session/types/session-progress';
import type { SessionResult } from '@/src/modules/session/types/session-result';
import {
  lifetimeStatsForPatientLevelRow,
  todayStatsForPatientAndLevel,
  todayStatsForPatientLevelRow,
} from '@/src/modules/session/utils/today-session-stats';
import { getLocalDateKey } from '@/src/shared/utils/local-date-key';

const TARGET_ATTEMPTS = 10;
const TARGET_PERFECT_SESSIONS = 6;

function nextLevel(levelId: LevelId): LevelId | null {
  const levels: LevelId[] = ['level-1', 'level-2', 'level-3', 'level-4', 'level-5'];
  const index = levels.indexOf(levelId);
  if (index < 0 || index === levels.length - 1) return null;
  return levels[index + 1];
}

export async function getCurrentPatientLevel(patientId: number): Promise<PatientLevelRecord | null> {
  return getCurrentActiveLevel(patientId);
}

export async function createSession(
  patientId: number,
  patientLevelId: number,
  data: Omit<SessionRecord, 'session_id' | 'patient_id' | 'patient_level_id' | 'session_date'> & {
    session_date?: string;
  },
): Promise<SessionRecord> {
  const all = await readAllSessions();
  const session: SessionRecord = {
    session_id: all.length === 0 ? 1 : Math.max(...all.map((item) => item.session_id)) + 1,
    patient_id: patientId,
    patient_level_id: patientLevelId,
    session_date: data.session_date ?? new Date().toISOString(),
    ...data,
  };
  all.push(session);
  await writeAllSessions(all);
  return session;
}

export async function createAttempt(
  sessionId: number,
  data: Omit<AttemptRecord, 'attempt_id' | 'session_id' | 'created_at'>,
): Promise<AttemptRecord> {
  const all = await readAllAttempts();
  const attempt: AttemptRecord = {
    attempt_id: all.length === 0 ? 1 : Math.max(...all.map((item) => item.attempt_id)) + 1,
    session_id: sessionId,
    created_at: new Date().toISOString(),
    ...data,
  };
  all.push(attempt);
  await writeAllAttempts(all);
  return attempt;
}

export type SessionDetail = {
  session: SessionRecord;
  attempts: AttemptRecord[];
};

export async function getSessionDetail(sessionId: number): Promise<SessionDetail | null> {
  const sessions = await readAllSessions();
  const session = sessions.find((item) => item.session_id === sessionId) ?? null;
  if (!session) return null;
  const allAttempts = await readAllAttempts();
  const attempts = allAttempts.filter((item) => item.session_id === sessionId);
  return { session, attempts };
}

export async function persistSessionResult(result: SessionResult): Promise<SessionRecord> {
  const completed = result.completed;
  const interrupted = completed ? false : result.interrupted;
  const perfect = completed ? result.perfect : false;

  const savedSession = await createSession(result.patientId, result.patientLevelId, {
    level_id: result.levelId,
    valid_attempts: result.validAttempts,
    total_attempts: result.totalAttempts,
    invalid_attempts: result.invalidAttempts,
    compliance_percent: result.compliancePercent,
    max_volume: result.maxVolumeMl,
    avg_volume: result.avgVolumeMl,
    avg_hold_seconds: result.avgHoldSeconds,
    completed,
    perfect,
    interrupted,
    input_mode: result.inputMode,
    data_source: result.dataSource,
    is_practice_session: result.isPracticeSession,
    official_validation_source: result.officialValidationSource,
    max_sensor_estimated_volume_ml: result.maxSensorEstimatedVolumeMl ?? undefined,
    max_sensor_u95_ml: result.maxSensorU95Ml ?? undefined,
  });
  for (const attempt of result.attempts) {
    await createAttempt(savedSession.session_id, {
      hold_ms: attempt.holdMs,
      peak_volume: attempt.peakVolume,
      valid: attempt.valid,
      input_mode: attempt.inputMode,
      data_source: attempt.dataSource,
      official_volume_ml: attempt.officialVolumeMl ?? undefined,
      sensor_estimated_volume_ml: attempt.sensorEstimatedVolumeMl ?? undefined,
      sensor_u95_ml: attempt.sensorU95Ml ?? undefined,
      sensor_confidence_label: attempt.sensorConfidenceLabel ?? undefined,
      sensor_volume_reached_conservatively: attempt.sensorVolumeReachedConservatively,
      sensor_attempt_status: attempt.sensorAttemptStatus ?? undefined,
    });
  }

  if (result.isPracticeSession) {
    return savedSession;
  }

  await updatePatientLevelProgress(result.patientId, result.patientLevelId);
  await updateDailyProgress(result.patientId);
  await checkAndUnlockNextLevel(result.patientId, { afterOfficialSessionSave: true });
  return savedSession;
}

export async function updateDailyProgress(patientId: number): Promise<{ completedToday: number; remainingToday: number }> {
  const active = await getCurrentActiveLevel(patientId);
  const levelId = active?.level_id ?? 'level-1';
  const today = getLocalDateKey();
  const allSessions = await readAllSessions();
  const { completed: completedToday, perfect: perfectSessionsCompleted } = todayStatsForPatientAndLevel(
    allSessions,
    patientId,
    levelId,
    today,
  );
  if (supabase != null) {
    const dailyGoalCompleted = completedToday >= TARGET_PERFECT_SESSIONS;
    const { error } = await supabase.from('daily_progress').upsert(
      {
        patient_id: patientId,
        progress_date: today,
        sessions_completed: completedToday,
        perfect_sessions_completed: perfectSessionsCompleted,
        daily_goal_completed: dailyGoalCompleted,
      },
      { onConflict: 'patient_id,progress_date' },
    );
    if (error) throw error;
  }
  return { completedToday, remainingToday: Math.max(0, TARGET_PERFECT_SESSIONS - completedToday) };
}

export async function updatePatientLevelProgress(
  patientId: number,
  patientLevelId: number,
): Promise<PatientLevelRecord | null> {
  const levels = await getPatientLevels(patientId);
  const index = levels.findIndex((level) => level.patient_level_id === patientLevelId);
  if (index < 0) return null;

  const level = levels[index];
  const sessions = await readAllSessions();
  const levelSessions = sessions.filter((item) => item.patient_level_id === patientLevelId);
  const today = getLocalDateKey();
  const { perfect: lifetimePerfect } = lifetimeStatsForPatientLevelRow(sessions, patientLevelId);
  const { completed: sessionsCompletedToday } = todayStatsForPatientLevelRow(
    sessions,
    patientLevelId,
    today,
  );

  levels[index] = {
    ...level,
    perfect_sessions_completed: lifetimePerfect,
    sessions_completed_today: sessionsCompletedToday,
    last_session_date: levelSessions.length > 0 ? levelSessions[levelSessions.length - 1].session_date : level.last_session_date,
  };

  await savePatientLevels(levels);
  return levels[index];
}

export async function checkAndUnlockNextLevel(
  patientId: number,
  /** Sesión recién guardada: el desbloqueo solo debe evaluarse tras persistir una sesión oficial. */
  options?: { afterOfficialSessionSave?: boolean },
): Promise<void> {
  if (options?.afterOfficialSessionSave !== true) {
    if (__DEV__) {
      console.warn(
        '[level-unlock] checkAndUnlockNextLevel skipped: must run after official session save',
        { patientId },
      );
    }
    return;
  }

  /** Solo debe invocarse tras guardar una sesión oficial (persistSessionResult), no al abrir Terapia/Niveles. */
  await ensurePatientLevelCatalog(patientId);

  const levels = await getPatientLevels(patientId);
  const activeIndex = levels.findIndex((item) => item.level_status === 'active');
  if (activeIndex < 0) {
    if (__DEV__) {
      logLevelUnlockDiagnostics(await buildLevelUnlockDiagnosticSnapshot(patientId));
    }
    return;
  }

  const active = levels[activeIndex];
  const sessions = await readAllSessions();
  const { perfect: lifetimePerfect } = lifetimeStatsForPatientLevelRow(
    sessions,
    active.patient_level_id,
  );
  /** Desbloqueo: 6 sesiones perfectas terapéuticas acumuladas (sensor) en el nivel activo. */
  if (lifetimePerfect < TARGET_PERFECT_SESSIONS) {
    if (__DEV__) {
      logLevelUnlockDiagnostics(await buildLevelUnlockDiagnosticSnapshot(patientId));
    }
    return;
  }

  const nextLevelId = nextLevel(active.level_id);
  levels[activeIndex] = { ...active, level_status: 'completed' };

  if (nextLevelId) {
    const nextIndex = levels.findIndex((item) => item.level_id === nextLevelId);
    if (nextIndex >= 0) {
      levels[nextIndex] = { ...levels[nextIndex], level_status: 'active' };
      await updatePatientCurrentLevel(patientId, nextLevelId);
    } else if (__DEV__) {
      console.warn('[level-unlock] next level row missing after catalog ensure', {
        patientId,
        nextLevelId,
      });
    }
  } else {
    await updatePatientCurrentLevel(patientId, active.level_id);
  }

  await savePatientLevels(levels);

  if (__DEV__) {
    logLevelUnlockDiagnostics(await buildLevelUnlockDiagnosticSnapshot(patientId));
  }
}

export { TARGET_ATTEMPTS, TARGET_PERFECT_SESSIONS };
