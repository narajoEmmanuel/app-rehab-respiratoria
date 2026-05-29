/**
 * Purpose: Mechanical difficulty parameters per runner level.
 * Module: session/levels
 * Notes: Controls hold duration, rest, and volume multiplier.
 *        Repetitions and sessions stay constant to preserve historial/unlock.
 */

import type { RunnerGameLevelId } from '@/src/modules/levels/types/runner-levels';
import { isRunnerGameLevel } from '@/src/modules/levels/types/runner-levels';
import { LEVEL_ONE_OFFICIAL_EVAL_MS } from '@/src/modules/session/engine/level-one/level-one-repetition-rules';

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

export type LevelDisplayMeta = {
  humanName: string;
  purpose: string;
};

const LEVEL_DISPLAY_META: Record<RunnerGameLevelId, LevelDisplayMeta> = {
  'level-1': {
    humanName: 'Inicio suave',
    purpose: 'Familiarizarte con el ritmo y completar respiraciones controladas.',
  },
  'level-2': {
    humanName: 'Control del volumen',
    purpose: 'Mantener una inspiración más estable dentro de tu meta.',
  },
  'level-3': {
    humanName: 'Sostén respiratorio',
    purpose: 'Practicar mantener el volumen durante unos segundos.',
  },
  'level-4': {
    humanName: 'Precisión y constancia',
    purpose: 'Repetir el ejercicio con mejor estabilidad entre intentos.',
  },
  'level-5': {
    humanName: 'Dominio avanzado',
    purpose: 'Completar sesiones con mayor control y consistencia.',
  },
};

const FALLBACK_DISPLAY_META: LevelDisplayMeta = LEVEL_DISPLAY_META['level-1'];

export function getLevelDisplayMeta(levelId: string): LevelDisplayMeta {
  if (isRunnerGameLevel(levelId)) {
    return LEVEL_DISPLAY_META[levelId];
  }
  return FALLBACK_DISPLAY_META;
}

const LEVEL_DIFFICULTY: Record<RunnerGameLevelId, LevelDifficultyConfig> = {
  'level-1': {
    targetVolumeMultiplier: 1.0,
    requiredHoldMs: LEVEL_ONE_OFFICIAL_EVAL_MS,
    restMs: 3000,
    repetitionsPerSession: 10,
    sessionsToCompleteLevel: 6,
    description: 'Respiración guiada inicial',
  },
  'level-2': {
    targetVolumeMultiplier: 1.05,
    requiredHoldMs: LEVEL_ONE_OFFICIAL_EVAL_MS,
    restMs: 2800,
    repetitionsPerSession: 10,
    sessionsToCompleteLevel: 6,
    description: 'Control del volumen',
  },
  'level-3': {
    targetVolumeMultiplier: 1.1,
    requiredHoldMs: LEVEL_ONE_OFFICIAL_EVAL_MS,
    restMs: 2800,
    repetitionsPerSession: 10,
    sessionsToCompleteLevel: 6,
    description: 'Sostén respiratorio',
  },
  'level-4': {
    targetVolumeMultiplier: 1.15,
    requiredHoldMs: LEVEL_ONE_OFFICIAL_EVAL_MS,
    restMs: 2500,
    repetitionsPerSession: 10,
    sessionsToCompleteLevel: 6,
    description: 'Precisión y constancia',
  },
  'level-5': {
    targetVolumeMultiplier: 1.2,
    requiredHoldMs: LEVEL_ONE_OFFICIAL_EVAL_MS,
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
