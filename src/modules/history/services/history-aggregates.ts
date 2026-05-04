/**
 * Purpose: Pure aggregations for patient history (sessions + attempts + level snapshot).
 * Module: history
 */
import type { LevelOneProgress } from '@/src/modules/levels/types/level-progress';
import type { AttemptRecord, SessionRecord } from '@/src/modules/session/types/session-progress';
import { addDaysLocal, getLocalDateKey, sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';

export const LEVEL1_DAILY_GOAL = 6;

export type CalendarDayKind = 'none' | 'perfect' | 'good' | 'incomplete' | 'interrupted';

export type DayAggregate = {
  dateKey: string;
  sessions: SessionRecord[];
  completedCount: number;
  perfectCount: number;
  interruptedCount: number;
  validRepetitionsSum: number;
  improveRepetitionsSum: number;
  bestHoldSeconds: number | null;
  /** Máx. mL del día (sesiones + picos de intentos); null si no hay dato útil. */
  maxVolumeMl: number | null;
  calendarKind: CalendarDayKind;
  statusLabel: string;
};

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

/** Legacy rows: interrupted omitted → false */
export function withLegacySessionDefaults(s: SessionRecord): SessionRecord {
  return {
    ...s,
    interrupted: s.interrupted === true ? true : false,
  };
}

/** @deprecated Use sessionRecordLocalDayKey from @/src/shared/utils/local-date-key */
export const sessionDayKey = sessionRecordLocalDayKey;

export function classifyCalendarDay(sessions: SessionRecord[]): CalendarDayKind {
  if (sessions.length === 0) return 'none';
  const norm = sessions.map(withLegacySessionDefaults);
  if (norm.some((s) => s.interrupted === true && !s.completed)) return 'interrupted';

  const completed = norm.filter((s) => s.completed);
  const perfectCompleted = completed.filter((s) => s.perfect);

  const sixPerfectDay =
    completed.length >= LEVEL1_DAILY_GOAL &&
    perfectCompleted.length >= LEVEL1_DAILY_GOAL &&
    perfectCompleted.length === completed.length;

  if (sixPerfectDay) return 'perfect';

  const hasFailures =
    norm.some((s) => (s.invalid_attempts ?? 0) > 0) || completed.some((s) => !s.perfect);

  if (hasFailures && completed.length > 0) return 'incomplete';

  if (perfectCompleted.length >= 1 || completed.length >= 2) return 'good';

  if (completed.length === 1) return 'good';

  return 'incomplete';
}

export function calendarKindLabel(kind: CalendarDayKind): string {
  switch (kind) {
    case 'perfect':
      return 'Día perfecto';
    case 'good':
      return 'Buen avance';
    case 'incomplete':
      return 'Día incompleto';
    case 'interrupted':
      return 'Sesión interrumpida';
    default:
      return 'Sin actividad';
  }
}

export function buildDayAggregate(dateKey: string, sessions: SessionRecord[]): DayAggregate {
  const norm = sessions.map(withLegacySessionDefaults);
  const completed = norm.filter((s) => s.completed);
  const perfectCount = completed.filter((s) => s.perfect).length;
  const interruptedCount = norm.filter((s) => s.interrupted === true && !s.completed).length;
  const validRepetitionsSum = norm.reduce((acc, s) => acc + (s.valid_attempts ?? 0), 0);
  const improveRepetitionsSum = norm.reduce((acc, s) => acc + (s.invalid_attempts ?? 0), 0);
  const calendarKind = classifyCalendarDay(norm);
  return {
    dateKey,
    sessions: norm,
    completedCount: completed.length,
    perfectCount,
    interruptedCount,
    validRepetitionsSum,
    improveRepetitionsSum,
    bestHoldSeconds: null,
    maxVolumeMl: null,
    calendarKind,
    statusLabel: calendarKindLabel(calendarKind),
  };
}

export function attachBestHoldSeconds(
  aggregate: DayAggregate,
  attemptsBySessionId: Map<number, AttemptRecord[]>,
): DayAggregate {
  let maxMs = 0;
  let anyHold = false;
  let maxVol = 0;
  for (const s of aggregate.sessions) {
    const sessionMax = typeof s.max_volume === 'number' && !Number.isNaN(s.max_volume) ? s.max_volume : 0;
    if (sessionMax > maxVol) maxVol = sessionMax;

    const rows = attemptsBySessionId.get(s.session_id) ?? [];
    for (const a of rows) {
      anyHold = true;
      if (a.hold_ms > maxMs) maxMs = a.hold_ms;
      const peak = typeof a.peak_volume === 'number' && !Number.isNaN(a.peak_volume) ? a.peak_volume : 0;
      if (peak > maxVol) maxVol = peak;
    }
  }
  return {
    ...aggregate,
    bestHoldSeconds: anyHold ? maxMs / 1000 : null,
    maxVolumeMl: maxVol > 0 ? Math.round(maxVol) : null,
  };
}

export function groupSessionsByDay(
  sessions: SessionRecord[],
  patientId: number,
  levelId: 'level-1',
): Map<string, SessionRecord[]> {
  const map = new Map<string, SessionRecord[]>();
  for (const raw of sessions) {
    if (raw.patient_id !== patientId || raw.level_id !== levelId) continue;
    const key = sessionRecordLocalDayKey(raw.session_date);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(raw);
    map.set(key, list);
  }
  return map;
}

export function buildAttemptsBySessionId(attempts: AttemptRecord[]): Map<number, AttemptRecord[]> {
  const m = new Map<number, AttemptRecord[]>();
  for (const a of attempts) {
    const list = m.get(a.session_id) ?? [];
    list.push(a);
    m.set(a.session_id, list);
  }
  return m;
}

export function computeStreakDays(dayKeysWithActivity: Set<string>, todayKey: string): number {
  let start = todayKey;
  if (!dayKeysWithActivity.has(start)) {
    start = addDaysLocal(todayKey, -1);
  }
  if (!dayKeysWithActivity.has(start)) return 0;

  let streak = 0;
  let cursor = start;
  for (let i = 0; i < 4000; i++) {
    if (dayKeysWithActivity.has(cursor)) {
      streak++;
      cursor = addDaysLocal(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

export function levelOnePerfectSlotsForUnlock(levelOne: LevelOneProgress): number {
  return levelOne.sessions.filter(
    (s) =>
      s.completed &&
      !s.interrupted &&
      s.validRepetitions === 10 &&
      s.failedRepetitions === 0,
  ).length;
}

export function globalMaxHoldSecondsForPatient(
  sessions: SessionRecord[],
  attempts: AttemptRecord[],
  patientId: number,
  levelId: 'level-1',
): number | null {
  const sessionIds = new Set(
    sessions.filter((s) => s.patient_id === patientId && s.level_id === levelId).map((s) => s.session_id),
  );
  let maxMs = 0;
  let any = false;
  for (const a of attempts) {
    if (!sessionIds.has(a.session_id)) continue;
    any = true;
    if (a.hold_ms > maxMs) maxMs = a.hold_ms;
  }
  return any ? maxMs / 1000 : null;
}

export function countCompletedToday(
  sessions: SessionRecord[],
  patientId: number,
  levelId: 'level-1',
  todayKey: string,
): number {
  return sessions.filter(
    (s) =>
      s.patient_id === patientId &&
      s.level_id === levelId &&
      s.completed &&
      s.interrupted !== true &&
      sessionRecordLocalDayKey(s.session_date) === todayKey,
  ).length;
}

export function buildAchievements(input: {
  sessions: SessionRecord[];
  patientId: number;
  levelId: 'level-1';
  levelOne: LevelOneProgress;
  streakDays: number;
}): AchievementDef[] {
  const { sessions, patientId, levelId, levelOne, streakDays } = input;
  const mine = sessions
    .filter((s) => s.patient_id === patientId && s.level_id === levelId)
    .map(withLegacySessionDefaults);

  const firstCompleted = mine.some((s) => s.completed);
  const activityDays = new Set<string>();
  for (const s of mine) {
    const k = sessionRecordLocalDayKey(s.session_date);
    if (k) activityDays.add(k);
  }
  const firstDayActivity = activityDays.size >= 1;
  const perfectTotal = mine.filter((s) => s.completed && s.perfect).length;
  const threePerfect = perfectTotal >= 3;

  const slotsPerfect = levelOnePerfectSlotsForUnlock(levelOne);
  const hasLevelActivity =
    mine.length > 0 ||
    levelOne.sessions.some(
      (s) => s.completed || s.interrupted || s.validRepetitions > 0 || s.failedRepetitions > 0,
    );
  const levelStillUnfinished = !levelOne.levelCompleted || slotsPerfect < LEVEL1_DAILY_GOAL;

  const constancia = streakDays >= 3;

  return [
    {
      id: 'first-session',
      title: 'Primera sesión completada',
      description: 'Guardaste tu primera sesión con éxito.',
      unlocked: firstCompleted,
    },
    {
      id: 'first-day',
      title: 'Primer día con actividad',
      description: 'Empezaste a registrar tu práctica.',
      unlocked: firstDayActivity,
    },
    {
      id: 'three-perfect',
      title: '3 sesiones perfectas',
      description: 'Tres sesiones con todas las repeticiones válidas.',
      unlocked: threePerfect,
    },
    {
      id: 'level-progress',
      title: 'Nivel 1 en progreso',
      description: 'Sigues avanzando en tu plan respiratorio.',
      unlocked: hasLevelActivity && levelStillUnfinished,
    },
    {
      id: 'streak',
      title: 'Constancia diaria',
      description: 'Varios días seguidos con práctica registrada.',
      unlocked: constancia,
    },
  ];
}

export function dayDetailMotivation(aggregate: DayAggregate): string {
  switch (aggregate.calendarKind) {
    case 'perfect':
      return 'Un día redondo: tu esfuerzo se nota.';
    case 'good':
      return 'Buen trabajo: cada sesión fortalece tu respiración.';
    case 'incomplete':
      return 'Seguimos en movimiento: la constancia es tu mejor aliada.';
    case 'interrupted':
      return 'A veces hay pausas, y está bien. Puedes retomar cuando quieras.';
    default:
      return 'Cada práctica suma a tu recuperación.';
  }
}

export function pickMotivationalLine(input: {
  completedToday: number;
  streakDays: number;
  calendarKind: CalendarDayKind | null;
}): string {
  const { completedToday, streakDays, calendarKind } = input;
  if (calendarKind === 'perfect') {
    return '¡Qué gran día! Tu respiración lo notará.';
  }
  if (completedToday >= LEVEL1_DAILY_GOAL) {
    return 'Cumpliste tu meta del día. ¡Sigue así!';
  }
  if (completedToday > 0) {
    return 'Estás cerca de completar tu meta del día.';
  }
  if (streakDays >= 3) {
    return 'Vas muy bien, sigue cuidando tu respiración.';
  }
  return 'Cada práctica suma a tu recuperación.';
}

export function monthGridDates(year: number, monthIndex0: number): (string | null)[] {
  const first = new Date(year, monthIndex0, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(getLocalDateKey(new Date(year, monthIndex0, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatDisplayDateEs(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
