/**
 * Reglas Nivel 1: ascenso libre → prep «Sostén» (2 s) → evaluación con obstáculo (3 s).
 */
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';
import { isTouchPracticeSession } from '@/src/modules/session/session-input-mode';

/** Tiempo para subir a la meta antes del sostén oficial (sin obstáculo). */
export const LEVEL_ONE_ASCENT_MS = 2000;
/** @deprecated Alias: ascenso 2 s (no es fase extra de prep). */
export const LEVEL_ONE_HOLD_PREP_MS = LEVEL_ONE_ASCENT_MS;
/** Evaluación oficial con obstáculo activo. */
export const LEVEL_ONE_OFFICIAL_EVAL_MS = 3000;
/** Alias clínico / HUD. */
export const LEVEL_ONE_REQUIRED_SUSTAIN_MS = LEVEL_ONE_OFFICIAL_EVAL_MS;

/** Cima del obstáculo / línea visual de meta (norm 1). */
export const LEVEL_ONE_OBSTACLE_TOP_NORM = 1;
/** Alias usado por la vista (línea «Meta»). */
export const LEVEL_ONE_OBSTACLE_CLEARANCE_NORM = LEVEL_ONE_OBSTACLE_TOP_NORM;
/** Por encima de la línea «Meta» (norm 1) cuenta tiempo válido. */
export const LEVEL_ONE_CLEAR_MIN_NORM = 1;
/** Por debajo de esto = toca o atraviesa el obstáculo → fallo inmediato. */
export const LEVEL_ONE_FAIL_MAX_NORM = 0.995;
/** Sin tolerancia: tocar el obstáculo falla al instante. */
export const LEVEL_ONE_HIT_GRACE_MS = 0;

/** Tiempo mínimo inspirando antes de mostrar «Sostén». */
export const LEVEL_ONE_MIN_INHALE_MS = 600;
/** Subida máxima antes de forzar fase «Sostén». */
export const LEVEL_ONE_MAX_INHALE_MS = 4000;

export type LevelOneAttemptSubPhase = 'ascending' | 'hold_prep' | 'official_eval';

export type LevelOneFailReason =
  | 'hit_obstacle'
  | 'released_during_eval'
  | 'never_cleared_obstacle'
  | 'insufficient_clear_time'
  | 'released_before_eval';

export type LevelOneAttemptRuntime = {
  subPhase: LevelOneAttemptSubPhase;
  totalElapsedMs: number;
  subPhaseElapsedMs: number;
  /** Tiempo por encima del obstáculo durante official_eval. */
  clearMs: number;
  belowClearMs: number;
  peakNorm: number;
  everClearedObstacle: boolean;
};

export function createLevelOneAttemptRuntime(): LevelOneAttemptRuntime {
  return {
    subPhase: 'ascending',
    totalElapsedMs: 0,
    subPhaseElapsedMs: 0,
    clearMs: 0,
    belowClearMs: 0,
    peakNorm: 0,
    everClearedObstacle: false,
  };
}

export function computeInspirationNorm(params: {
  displayVolumeMl: number;
  targetVolumeMl: number;
  holdMs: number;
  requiredSustainMs?: number;
}): number {
  const {
    displayVolumeMl,
    targetVolumeMl,
    holdMs,
    requiredSustainMs = LEVEL_ONE_OFFICIAL_EVAL_MS,
  } = params;
  if (targetVolumeMl > 0 && displayVolumeMl > 0) {
    return displayVolumeMl / targetVolumeMl;
  }
  return holdMs / requiredSustainMs;
}

/** Claramente por encima de la cima del obstáculo. */
export function isClearlyAboveObstacle(inspirationNorm: number): boolean {
  return inspirationNorm >= LEVEL_ONE_CLEAR_MIN_NORM;
}

/** Toca, atraviesa o queda debajo de la meta/obstáculo. */
export function isAtOrBelowObstacle(inspirationNorm: number): boolean {
  return inspirationNorm <= LEVEL_ONE_FAIL_MAX_NORM;
}

export function isAboveObstacle(inspirationNorm: number): boolean {
  return isClearlyAboveObstacle(inspirationNorm);
}

export type LevelOneRepetitionTickResult = {
  runtime: LevelOneAttemptRuntime;
  liveFail: LevelOneFailReason | null;
  /** Tras 2 s de ascenso, iniciar de inmediato los 3 s de sostén oficial. */
  shouldBeginOfficialEval: boolean;
};

export function tickLevelOneRepetition(
  runtime: LevelOneAttemptRuntime,
  inspirationNorm: number,
  deltaMs: number,
): LevelOneRepetitionTickResult {
  const norm = Math.max(0, inspirationNorm);
  const peakNorm = Math.max(runtime.peakNorm, norm);
  const totalElapsedMs = runtime.totalElapsedMs + deltaMs;
  const subPhase = runtime.subPhase;
  const subPhaseElapsedMs = runtime.subPhaseElapsedMs + deltaMs;
  let clearMs = runtime.clearMs;
  let belowClearMs = runtime.belowClearMs;
  let everClearedObstacle = runtime.everClearedObstacle;
  let liveFail: LevelOneFailReason | null = null;
  let shouldBeginOfficialEval = false;

  if (subPhase === 'ascending') {
    if (subPhaseElapsedMs >= LEVEL_ONE_ASCENT_MS) {
      shouldBeginOfficialEval = true;
    }
  } else if (subPhase === 'official_eval') {
    if (isClearlyAboveObstacle(norm)) {
      clearMs += deltaMs;
      belowClearMs = 0;
      everClearedObstacle = true;
    } else {
      liveFail = 'hit_obstacle';
    }
  }

  return {
    runtime: {
      subPhase,
      totalElapsedMs,
      subPhaseElapsedMs,
      clearMs,
      belowClearMs,
      peakNorm,
      everClearedObstacle,
    },
    liveFail,
    shouldBeginOfficialEval,
  };
}

export function enterOfficialEvalPhase(runtime: LevelOneAttemptRuntime): LevelOneAttemptRuntime {
  return {
    ...runtime,
    subPhase: 'official_eval',
    subPhaseElapsedMs: 0,
    clearMs: 0,
    belowClearMs: 0,
  };
}

export type LevelOneAttemptReleaseResult = {
  valid: boolean;
  failReason: LevelOneFailReason | null;
  volumeReached: boolean;
  holdReached: boolean;
  reason: string;
};

export function evaluateLevelOneAttemptComplete(params: {
  runtime: LevelOneAttemptRuntime;
  liveFail: LevelOneFailReason | null;
  inputMode: SessionInputMode;
}): LevelOneAttemptReleaseResult {
  const { runtime, liveFail, inputMode } = params;
  const practice = isTouchPracticeSession(inputMode);

  if (liveFail) {
    return resultFromFail(liveFail, runtime, practice);
  }

  if (!runtime.everClearedObstacle) {
    return resultFromFail('never_cleared_obstacle', runtime, practice);
  }

  const heldFullWindow =
    runtime.clearMs >= LEVEL_ONE_OFFICIAL_EVAL_MS &&
    runtime.peakNorm >= LEVEL_ONE_CLEAR_MIN_NORM;

  if (heldFullWindow) {
    return {
      valid: true,
      failReason: null,
      volumeReached: true,
      holdReached: true,
      reason: practice
        ? 'Superaste el obstáculo y sostuviste la meta (práctica).'
        : 'Superaste el obstáculo y sostuviste la meta (sensor).',
    };
  }

  return resultFromFail('insufficient_clear_time', runtime, practice);
}

/** Compatibilidad con validación al soltar / interrumpir. */
export function evaluateLevelOneAttemptRelease(params: {
  runtime: LevelOneAttemptRuntime;
  liveFail: LevelOneFailReason | null;
  inputMode: SessionInputMode;
  releasedDuringEval?: boolean;
}): LevelOneAttemptReleaseResult {
  const { runtime, liveFail, inputMode, releasedDuringEval } = params;

  if (releasedDuringEval && !liveFail) {
    return resultFromFail('released_during_eval', runtime, isTouchPracticeSession(inputMode));
  }

  if (runtime.subPhase !== 'official_eval') {
    if (liveFail) {
      return resultFromFail(liveFail, runtime, isTouchPracticeSession(inputMode));
    }
    return resultFromFail('released_before_eval', runtime, isTouchPracticeSession(inputMode));
  }

  return evaluateLevelOneAttemptComplete({ runtime, liveFail, inputMode });
}

function resultFromFail(
  fail: LevelOneFailReason,
  runtime: LevelOneAttemptRuntime,
  practice: boolean,
): LevelOneAttemptReleaseResult {
  const volumeReached = runtime.everClearedObstacle;
  const holdReached = runtime.clearMs >= LEVEL_ONE_OFFICIAL_EVAL_MS;
  const mode = practice ? 'práctica' : 'sensor';

  const messages: Record<LevelOneFailReason, string> = {
    hit_obstacle: `Chocaste con el obstáculo: mantente por encima de la meta (${mode}).`,
    released_during_eval: `Suelta solo después de superar el obstáculo (${mode}).`,
    never_cleared_obstacle: `No alcanzaste la altura del obstáculo (${mode}).`,
    insufficient_clear_time: `Casi: sostén por encima del obstáculo un poco más (${mode}).`,
    released_before_eval: `Mantén presionado hasta terminar la evaluación (${mode}).`,
  };

  return {
    valid: false,
    failReason: fail,
    volumeReached,
    holdReached,
    reason: messages[fail],
  };
}

export function failReasonUiLabel(fail: LevelOneFailReason | null): string {
  switch (fail) {
    case 'hit_obstacle':
      return 'Choque con el obstáculo';
    case 'released_during_eval':
      return 'Soltaste durante el obstáculo';
    case 'never_cleared_obstacle':
      return 'No superaste la meta';
    case 'insufficient_clear_time':
      return 'Tiempo insuficiente arriba';
    case 'released_before_eval':
      return 'Soltaste demasiado pronto';
    default:
      return '';
  }
}
