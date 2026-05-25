/**
 * Purpose: Mechanical difficulty parameters per runner level.
 * Module: session/levels
 * Notes: Controls hold duration, rest, and volume multiplier.
 *        Repetitions and sessions stay constant to preserve historial/unlock.
 */

import type { RunnerGameLevelId } from '@/src/modules/levels/types/runner-levels';
import { isRunnerGameLevel } from '@/src/modules/levels/types/runner-levels';

export type LevelDifficultyConfig = {
  /** Multiplier applied to the patient's diagnostic target volume. */
  targetVolumeMultiplier: number;
  /** Duration (ms) the patient must sustain above the obstacle during official eval. */
  requiredHoldMs: number;
  /** Rest period between repetitions (ms). */
  restMs: number;
  /** Fixed at 10 — do not change without updating unlock/historial. */
  repetitionsPerSession: number;
  /** Fixed at 6 — do not change without updating unlock logic. */
  sessionsToCompleteLevel: number;
  /** Short clinical description shown on the level card. */
  description: string;
};

const LEVEL_DIFFICULTY: Record<RunnerGameLevelId, LevelDifficultyConfig> = {
  'level-1': {
    targetVolumeMultiplier: 1.0,
    requiredHoldMs: 3000,
    restMs: 3000,
    repetitionsPerSession: 10,
    sessionsToCompleteLevel: 6,
    description: 'Respiración guiada inicial',
  },
  'level-2': {
    targetVolumeMultiplier: 1.05,
    requiredHoldMs: 3000,
    restMs: 2800,
    repetitionsPerSession: 10,
    sessionsToCompleteLevel: 6,
    description: 'Control del volumen',
  },
  'level-3': {
    targetVolumeMultiplier: 1.1,
    requiredHoldMs: 3500,
    restMs: 2800,
    repetitionsPerSession: 10,
    sessionsToCompleteLevel: 6,
    description: 'Sostén respiratorio',
  },
  'level-4': {
    targetVolumeMultiplier: 1.15,
    requiredHoldMs: 3500,
    restMs: 2500,
    repetitionsPerSession: 10,
    sessionsToCompleteLevel: 6,
    description: 'Precisión y constancia',
  },
  'level-5': {
    targetVolumeMultiplier: 1.2,
    requiredHoldMs: 4000,
    restMs: 2500,
    repetitionsPerSession: 10,
    sessionsToCompleteLevel: 6,
    description: 'Dominio avanzado',
  },
};

const FALLBACK_CONFIG = LEVEL_DIFFICULTY['level-1'];

export function getLevelDifficultyConfig(levelId: string): LevelDifficultyConfig {
  if (isRunnerGameLevel(levelId)) {
    return LEVEL_DIFFICULTY[levelId];
  }
  return FALLBACK_CONFIG;
}
