/**
 * Purpose: Central registry of level definitions for session routing/UI.
 * Module: session/registry
 * Dependencies: session/levels/level-config
 * Notes: Add new levels here without changing global navigation.
 */

import type { LevelDefinition } from '@/src/modules/session/levels/level-config';

const LEVELS: LevelDefinition[] = [
  {
    id: 'level-1',
    title: 'Nivel 1',
    difficulty: 'easy',
    gameVisualId: 'monkey-jungle',
  },
  {
    id: 'level-2',
    title: 'Nivel 2',
    difficulty: 'medium',
    gameVisualId: 'visual-placeholder',
  },
  {
    id: 'level-3',
    title: 'Nivel 3',
    difficulty: 'hard',
    gameVisualId: 'visual-placeholder',
    comingSoon: true,
  },
  {
    id: 'level-4',
    title: 'Nivel 4',
    difficulty: 'hard',
    gameVisualId: 'visual-placeholder',
    comingSoon: true,
  },
  {
    id: 'level-5',
    title: 'Nivel 5',
    difficulty: 'hard',
    gameVisualId: 'visual-placeholder',
    comingSoon: true,
  },
];

export function listLevels(): LevelDefinition[] {
  return [...LEVELS];
}

export function getLevelById(levelId: string): LevelDefinition | undefined {
  return LEVELS.find((l) => l.id === levelId);
}

export const DEFAULT_SESSION_LEVEL_ID = 'level-1';
