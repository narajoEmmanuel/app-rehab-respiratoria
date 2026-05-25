/**
 * Purpose: Single source of truth for runner game level identifiers.
 * Module: levels
 * Notes: Canonical definition — other modules re-export or import from here.
 */

export type RunnerGameLevelId = 'level-1' | 'level-2' | 'level-3' | 'level-4' | 'level-5';

export const RUNNER_GAME_LEVEL_IDS: readonly RunnerGameLevelId[] = [
  'level-1',
  'level-2',
  'level-3',
  'level-4',
  'level-5',
] as const;

export function isRunnerGameLevel(levelId: string): levelId is RunnerGameLevelId {
  return (
    levelId === 'level-1' ||
    levelId === 'level-2' ||
    levelId === 'level-3' ||
    levelId === 'level-4' ||
    levelId === 'level-5'
  );
}
