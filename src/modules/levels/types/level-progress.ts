/**
 * Purpose: Persistent progress models for levels and unlock state.
 * Module: levels
 * Dependencies: none
 * Notes: Keep this file storage-friendly and easy to migrate.
 */

export type LevelId = 'level-1' | 'level-2' | 'level-3' | 'level-4' | 'level-5';

export type LevelOneSessionProgress = {
  sessionNumber: number;
  validRepetitions: number;
  failedRepetitions: number;
  completed: boolean;
  interrupted: boolean;
};

export type LevelOneProgress = {
  currentSession: number;
  currentRepetition: number;
  totalValid: number;
  totalFailed: number;
  sessions: LevelOneSessionProgress[];
  levelCompleted: boolean;
  levelPerfect: boolean;
};

export type RunnerGameLevelId = 'level-1' | 'level-2';

export const RUNNER_GAME_LEVEL_IDS: readonly RunnerGameLevelId[] = ['level-1', 'level-2'] as const;

export function isRunnerGameLevel(levelId: LevelId): levelId is RunnerGameLevelId {
  return levelId === 'level-1' || levelId === 'level-2';
}

export function getRunnerLevelProgress(
  progress: LevelsProgress,
  levelId: RunnerGameLevelId,
): LevelOneProgress {
  return levelId === 'level-2' ? progress.levelTwo : progress.levelOne;
}

export function setRunnerLevelProgress(
  progress: LevelsProgress,
  levelId: RunnerGameLevelId,
  slot: LevelOneProgress,
): LevelsProgress {
  return levelId === 'level-2' ? { ...progress, levelTwo: slot } : { ...progress, levelOne: slot };
}

export type LevelsProgress = {
  selectedLevelId: LevelId;
  unlockedLevels: LevelId[];
  levelOne: LevelOneProgress;
  levelTwo: LevelOneProgress;
};

export function createInitialLevelOneProgress(): LevelOneProgress {
  return {
    currentSession: 1,
    currentRepetition: 1,
    totalValid: 0,
    totalFailed: 0,
    sessions: Array.from({ length: 6 }, (_, index) => ({
      sessionNumber: index + 1,
      validRepetitions: 0,
      failedRepetitions: 0,
      completed: false,
      interrupted: false,
    })),
    levelCompleted: false,
    levelPerfect: false,
  };
}

export function createInitialLevelsProgress(): LevelsProgress {
  return {
    selectedLevelId: 'level-1',
    unlockedLevels: ['level-1'],
    levelOne: createInitialLevelOneProgress(),
    levelTwo: createInitialLevelOneProgress(),
  };
}

/** Avanza el índice de sesión si el slot actual ya quedó completado (misma regla que al pulsar Continuar). */
export function advanceLevelOneIfCurrentSessionCompleted(levelOne: LevelOneProgress): LevelOneProgress {
  const currentIndex = levelOne.currentSession - 1;
  const currentSession = levelOne.sessions[currentIndex];
  if (!currentSession || !currentSession.completed || currentSession.interrupted) {
    return levelOne;
  }

  const isLastSession = levelOne.currentSession >= levelOne.sessions.length;
  const levelCompleted = isLastSession;
  const levelPerfect = levelCompleted
    ? levelOne.sessions.every(
        (session) =>
          session.completed &&
          !session.interrupted &&
          session.validRepetitions === 10 &&
          session.failedRepetitions === 0,
      )
    : levelOne.levelPerfect;

  return {
    ...levelOne,
    currentSession: isLastSession ? levelOne.currentSession : levelOne.currentSession + 1,
    currentRepetition: 1,
    levelCompleted,
    levelPerfect,
  };
}

/**
 * Deja `currentSession` en el primer slot jugable: salta slots ya completados.
 * No mueve si el slot actual está interrumpido sin completar (reintento misma sesión).
 */
export function ensureLevelOnePointsAtPlayableSession(levelOne: LevelOneProgress): LevelOneProgress {
  let next = levelOne;
  for (let guard = 0; guard < 8; guard++) {
    if (next.levelCompleted) return next;
    const currentIndex = next.currentSession - 1;
    const slot = next.sessions[currentIndex];
    if (!slot) return next;
    if (slot.interrupted && !slot.completed) return next;
    if (!slot.completed) return next;
    const advanced = advanceLevelOneIfCurrentSessionCompleted(next);
    if (advanced.currentSession === next.currentSession && advanced.levelCompleted === next.levelCompleted) {
      return next;
    }
    next = advanced;
  }
  return next;
}

/**
 * Limpia intentos del slot actual para empezar una partida nueva (sesión a medias, interrumpida o marcada rara).
 * No modifica si el nivel ya está marcado como completado (las 6 sesiones cerradas).
 */
export function resetCurrentLevelSessionSlotForNewRun(levelOne: LevelOneProgress): LevelOneProgress {
  if (levelOne.levelCompleted) return levelOne;
  const currentIndex = levelOne.currentSession - 1;
  const slot = levelOne.sessions[currentIndex];
  if (!slot) return levelOne;
  if (
    slot.validRepetitions === 0 &&
    slot.failedRepetitions === 0 &&
    !slot.completed &&
    !slot.interrupted
  ) {
    return levelOne;
  }

  const sessions = [...levelOne.sessions];
  sessions[currentIndex] = {
    ...slot,
    validRepetitions: 0,
    failedRepetitions: 0,
    completed: false,
    interrupted: false,
  };

  return {
    ...levelOne,
    sessions,
    currentRepetition: 1,
    totalValid: levelOne.totalValid - slot.validRepetitions,
    totalFailed: levelOne.totalFailed - slot.failedRepetitions,
    levelCompleted: false,
    levelPerfect: false,
  };
}

/** Antes de jugar: puntero al primer hueco no completado + slot actual en cero. */
export function prepareLevelOneForNewSessionRun(levelOne: LevelOneProgress): LevelOneProgress {
  if (levelOne.levelCompleted) return levelOne;
  const ensured = ensureLevelOnePointsAtPlayableSession(levelOne);
  return resetCurrentLevelSessionSlotForNewRun(ensured);
}

/**
 * Descarta progreso temporal del slot actual (reps a medias, interrumpida, puntero de rep).
 * No borra sesiones completadas del nivel ni totales de sesiones ya cerradas en otros slots.
 */
export function discardInProgressLevelOneRun(levelOne: LevelOneProgress): LevelOneProgress {
  if (levelOne.levelCompleted) return levelOne;
  return resetCurrentLevelSessionSlotForNewRun(
    ensureLevelOnePointsAtPlayableSession(levelOne),
  );
}
