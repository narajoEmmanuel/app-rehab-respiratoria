/**
 * Purpose: Gameplay presentation config per runner level (theme, obstacle, playable ids).
 * Module: session/levels
 * Notes: VIM target % lives in diagnostic LEVEL_FACTORS — not duplicated here.
 */

import type { LevelId } from '@/src/modules/levels/types/level-progress';
import type { GameVisualId } from '@/src/modules/session/games/game-types';

export type LevelGameTheme = 'forest' | 'desert' | 'snow';
export type LevelObstacleType = 'mountain' | 'pyramid' | 'snowball' | 'snowman';

export type RunnerGameLevelId = 'level-1' | 'level-2' | 'level-3';

export type LevelGameplayConfig = {
  levelId: RunnerGameLevelId;
  theme: LevelGameTheme;
  obstacleType: LevelObstacleType;
  gameVisualId: GameVisualId;
  title: string;
};

export const RUNNER_GAME_LEVEL_IDS: readonly RunnerGameLevelId[] = ['level-1', 'level-2', 'level-3'] as const;

const RUNNER_LEVEL_CONFIG: Record<RunnerGameLevelId, LevelGameplayConfig> = {
  'level-1': {
    levelId: 'level-1',
    theme: 'forest',
    obstacleType: 'mountain',
    gameVisualId: 'rabbit-runner-forest',
    title: 'Nivel 1',
  },
  'level-2': {
    levelId: 'level-2',
    theme: 'desert',
    obstacleType: 'pyramid',
    gameVisualId: 'rabbit-runner-desert',
    title: 'Nivel 2',
  },
  'level-3': {
    levelId: 'level-3',
    theme: 'snow',
    obstacleType: 'snowman',
    gameVisualId: 'rabbit-runner-snow',
    title: 'Nivel 3',
  },
};

export function isRunnerGameLevel(levelId: string): levelId is RunnerGameLevelId {
  return levelId === 'level-1' || levelId === 'level-2' || levelId === 'level-3';
}

export function getLevelGameplayConfig(levelId: string): LevelGameplayConfig | undefined {
  if (!isRunnerGameLevel(levelId)) return undefined;
  return RUNNER_LEVEL_CONFIG[levelId];
}
