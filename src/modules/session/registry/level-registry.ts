/**
 * Purpose: Central registry of level definitions for session routing/UI.
 * Module: session/registry
 * Dependencies: session/levels/level-config
 * Notes: Add new levels here without changing global navigation.
 */

import type { LevelDefinition } from '@/src/modules/session/levels/level-config';
import { getLevelGameplayConfig } from '@/src/modules/session/levels/level-gameplay-config';

const level1Gameplay = getLevelGameplayConfig('level-1')!;
const level2Gameplay = getLevelGameplayConfig('level-2')!;
const level3Gameplay = getLevelGameplayConfig('level-3')!;
const level4Gameplay = getLevelGameplayConfig('level-4')!;
const level5Gameplay = getLevelGameplayConfig('level-5')!;

const LEVELS: LevelDefinition[] = [
  {
    id: 'level-1',
    title: 'Nivel 1',
    difficulty: 'easy',
    gameVisualId: level1Gameplay.gameVisualId,
    theme: level1Gameplay.theme,
    obstacleType: level1Gameplay.obstacleType,
  },
  {
    id: 'level-2',
    title: 'Nivel 2',
    difficulty: 'medium',
    gameVisualId: level2Gameplay.gameVisualId,
    theme: level2Gameplay.theme,
    obstacleType: level2Gameplay.obstacleType,
  },
  {
    id: 'level-3',
    title: 'Nivel 3',
    difficulty: 'hard',
    gameVisualId: level3Gameplay.gameVisualId,
    theme: level3Gameplay.theme,
    obstacleType: level3Gameplay.obstacleType,
  },
  {
    id: 'level-4',
    title: 'Nivel 4',
    difficulty: 'hard',
    gameVisualId: level4Gameplay.gameVisualId,
    theme: level4Gameplay.theme,
    obstacleType: level4Gameplay.obstacleType,
  },
  {
    id: 'level-5',
    title: 'Nivel 5',
    difficulty: 'hard',
    gameVisualId: level5Gameplay.gameVisualId,
    theme: level5Gameplay.theme,
    obstacleType: level5Gameplay.obstacleType,
  },
];

export function listLevels(): LevelDefinition[] {
  return [...LEVELS];
}

export function getLevelById(levelId: string): LevelDefinition | undefined {
  return LEVELS.find((l) => l.id === levelId);
}

export const DEFAULT_SESSION_LEVEL_ID = 'level-1';
