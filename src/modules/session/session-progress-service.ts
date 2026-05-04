import { getCurrentActiveLevel, getPatientLevels, savePatientLevels } from '@/src/modules/diagnostics/diagnostic-service';
import type { PatientLevelRecord } from '@/src/modules/diagnostics/types';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { updatePatientCurrentLevel } from '@/src/modules/patient/patient-service';
import {
  readAllAttempts,
  readAllSessions,
  writeAllAttempts,
  writeAllSessions,
} from '@/src/modules/session/storage/session-progress-repository';
import type { AttemptRecord, SessionRecord } from '@/src/modules/session/types/session-progress';
import { getLocalDateKey, sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';

const TARGET_ATTEMPTS = 10;
const TARGET_PERFECT_SESSIONS = 6;

function nextLevel(levelId: LevelId): LevelId | null {
  const levels: LevelId[] = ['level-1', 'level-2', 'level-3', 'level-4', 'level-5'];
  const index = levels.indexOf(levelId);
  if (index < 0 || index === levels.length - 1) return null;
  return levels[index + 1];
}

export async function getTodaySessions(
  patientId: number,
  levelId?: string,
): Promise<SessionRecord[]> {
  const all = await readAllSessions();
  const today = getLocalDateKey();
  return all.filter((item) => {
    if (item.patient_id !== patientId) return false;
    if (levelId != null && item.level_id !== levelId) return false;
    return sessionRecordLocalDayKey(item.session_date) === today;
  });
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

export async function updateDailyProgress(patientId: number): Promise<{ completedToday: number; remainingToday: number }> {
  const active = await getCurrentActiveLevel(patientId);
  const levelId = active?.level_id ?? 'level-1';
  const todaySessions = await getTodaySessions(patientId, levelId);
  const completedToday = todaySessions.filter((item) => item.completed && item.interrupted !== true).length;
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
  const perfectSessionsCompleted = levelSessions.filter(
    (item) => item.perfect && item.completed && item.interrupted !== true,
  ).length;
  const sessionsCompletedToday = levelSessions.filter(
    (item) =>
      item.completed &&
      item.interrupted !== true &&
      sessionRecordLocalDayKey(item.session_date) === today,
  ).length;

  levels[index] = {
    ...level,
    perfect_sessions_completed: perfectSessionsCompleted,
    sessions_completed_today: sessionsCompletedToday,
    last_session_date: levelSessions.length > 0 ? levelSessions[levelSessions.length - 1].session_date : level.last_session_date,
  };

  await savePatientLevels(levels);
  return levels[index];
}

export async function checkAndUnlockNextLevel(patientId: number): Promise<void> {
  const levels = await getPatientLevels(patientId);
  const activeIndex = levels.findIndex((item) => item.level_status === 'active');
  if (activeIndex < 0) return;

  const active = levels[activeIndex];
  const sessions = await readAllSessions();
  const today = getLocalDateKey();
  const todayLevelSessions = sessions.filter(
    (item) =>
      item.patient_id === patientId &&
      item.patient_level_id === active.patient_level_id &&
      sessionRecordLocalDayKey(item.session_date) === today,
  );
  const completedToday = todayLevelSessions.filter(
    (item) => item.completed && item.interrupted !== true,
  ).length;
  const perfectToday = todayLevelSessions.filter(
    (item) => item.perfect && item.completed && item.interrupted !== true,
  ).length;
  if (completedToday < TARGET_PERFECT_SESSIONS || perfectToday < TARGET_PERFECT_SESSIONS) return;

  const nextLevelId = nextLevel(active.level_id);
  levels[activeIndex] = { ...active, level_status: 'completed' };

  if (nextLevelId) {
    const nextIndex = levels.findIndex((item) => item.level_id === nextLevelId);
    if (nextIndex >= 0) {
      levels[nextIndex] = { ...levels[nextIndex], level_status: 'active' };
      await updatePatientCurrentLevel(patientId, nextLevelId);
    }
  } else {
    await updatePatientCurrentLevel(patientId, active.level_id);
  }

  await savePatientLevels(levels);
}

export { TARGET_ATTEMPTS, TARGET_PERFECT_SESSIONS };
