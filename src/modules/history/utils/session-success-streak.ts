import { isTherapeuticSessionRecord } from '@/src/modules/session/session-record-classification';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';

export type SuccessfulSessionStreakResult = {
  currentStreak: number;
  lastSuccessfulSessionDate?: string;
  totalSuccessfulSessions: number;
};

function sessionDateMs(session: SessionRecord): number {
  const parsed = Date.parse(session.session_date);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortSessionsByDateDesc(sessions: SessionRecord[]): SessionRecord[] {
  return [...sessions].sort((a, b) => sessionDateMs(b) - sessionDateMs(a));
}

/** Sesión terapéutica oficial con sensor, completada, no interrumpida y perfecta. */
export function isSuccessfulTherapeuticSession(session: SessionRecord): boolean {
  if (!isTherapeuticSessionRecord(session)) return false;
  return (
    session.completed === true &&
    session.perfect === true &&
    session.interrupted !== true
  );
}

/**
 * Racha de sesiones exitosas consecutivas (solo lectura, sin persistir).
 * Orden: sesiones terapéuticas por fecha descendente; la más reciente debe ser exitosa
 * para que currentStreak > 0.
 */
export function computeSuccessfulSessionStreak(
  sessions: SessionRecord[],
): SuccessfulSessionStreakResult {
  const successfulSessions = sessions.filter(isSuccessfulTherapeuticSession);
  const totalSuccessfulSessions = successfulSessions.length;

  const sortedSuccessful = sortSessionsByDateDesc(successfulSessions);
  const lastSuccessfulSessionDate = sortedSuccessful[0]?.session_date;

  const therapeuticByDate = sortSessionsByDateDesc(sessions.filter(isTherapeuticSessionRecord));

  if (therapeuticByDate.length === 0) {
    return {
      currentStreak: 0,
      totalSuccessfulSessions,
      lastSuccessfulSessionDate,
    };
  }

  const mostRecentTherapeutic = therapeuticByDate[0];
  if (!isSuccessfulTherapeuticSession(mostRecentTherapeutic)) {
    return {
      currentStreak: 0,
      totalSuccessfulSessions,
      lastSuccessfulSessionDate,
    };
  }

  let currentStreak = 0;
  for (const session of therapeuticByDate) {
    if (isSuccessfulTherapeuticSession(session)) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    totalSuccessfulSessions,
    lastSuccessfulSessionDate,
  };
}
