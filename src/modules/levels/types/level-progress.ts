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

export type LevelsProgress = {
  selectedLevelId: LevelId;
  unlockedLevels: LevelId[];
  levelOne: LevelOneProgress;
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
  };
}
