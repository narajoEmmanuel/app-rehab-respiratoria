/**
 * Reglas runner: inspiración libre hasta meta → sostén oficial 2 s (obstáculo) → resultado → descanso.
 */
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';
import { isTouchPracticeSession } from '@/src/modules/session/session-input-mode';

/** @deprecated Ya no fuerza transición; conservado por imports legacy. */
export const LEVEL_ONE_ASCENT_MS = 1500;
/** @deprecated Alias legacy. */
export const LEVEL_ONE_HOLD_PREP_MS = LEVEL_ONE_ASCENT_MS;
/** Aviso informativo tras inspirar sin alcanzar meta (sin penalización). */
export const LEVEL_ONE_INHALE_SOFT_HINT_MS = 60_000;
/** Evaluación oficial con obstáculo activo. */
export const LEVEL_ONE_OFFICIAL_EVAL_MS = 2000;
/** Descanso entre repeticiones runner (todos los niveles). */
export const RUNNER_REST_MS = 5000;
/** Cuenta atrás visual antes de cada repetición (no cuenta como intento). */
export const PRE_ATTEMPT_COUNTDOWN_MS = 3000;
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

/** Tiempo mínimo inspirando antes de mostrar «Sostén» (solo UI). */
export const LEVEL_ONE_MIN_INHALE_MS = 600;
/** Ventana máxima de inspiración para animación visual (sin fallo por tiempo). */
export const LEVEL_ONE_MAX_INHALE_MS = 60_000;

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
  /** Cuando volumeMl >= targetVolume (norm >= 1), iniciar los 2 s de sostén oficial. */
  shouldBeginOfficialEval: boolean;
  /** Tras 60 s sin meta: aviso suave informativo (sin fallo). */
  shouldShowInhaleSoftHint: boolean;
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
  let shouldShowInhaleSoftHint = false;

  if (subPhase === 'ascending') {
    if (isClearlyAboveObstacle(norm)) {
      shouldBeginOfficialEval = true;
    } else if (subPhaseElapsedMs >= LEVEL_ONE_INHALE_SOFT_HINT_MS) {
      shouldShowInhaleSoftHint = true;
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
    shouldShowInhaleSoftHint,
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
  officialEvalMs?: number;
}): LevelOneAttemptReleaseResult {
  const { runtime, liveFail, inputMode, officialEvalMs = LEVEL_ONE_OFFICIAL_EVAL_MS } = params;
  const practice = isTouchPracticeSession(inputMode);

  if (liveFail) {
    return resultFromFail(liveFail, runtime, practice, officialEvalMs);
  }

  if (!runtime.everClearedObstacle) {
    return resultFromFail('never_cleared_obstacle', runtime, practice, officialEvalMs);
  }

  const heldFullWindow =
    runtime.clearMs >= officialEvalMs &&
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

  return resultFromFail('insufficient_clear_time', runtime, practice, officialEvalMs);
}

/** Compatibilidad con validación al soltar / interrumpir. */
export function evaluateLevelOneAttemptRelease(params: {
  runtime: LevelOneAttemptRuntime;
  liveFail: LevelOneFailReason | null;
  inputMode: SessionInputMode;
  releasedDuringEval?: boolean;
  officialEvalMs?: number;
}): LevelOneAttemptReleaseResult {
  const { runtime, liveFail, inputMode, releasedDuringEval, officialEvalMs = LEVEL_ONE_OFFICIAL_EVAL_MS } = params;
  const practice = isTouchPracticeSession(inputMode);

  if (releasedDuringEval && !liveFail) {
    return resultFromFail('released_during_eval', runtime, practice, officialEvalMs);
  }

  if (runtime.subPhase !== 'official_eval') {
    if (liveFail) {
      return resultFromFail(liveFail, runtime, practice, officialEvalMs);
    }
    return resultFromFail('released_before_eval', runtime, practice, officialEvalMs);
  }

  return evaluateLevelOneAttemptComplete({ runtime, liveFail, inputMode, officialEvalMs });
}

function resultFromFail(
  fail: LevelOneFailReason,
  runtime: LevelOneAttemptRuntime,
  practice: boolean,
  officialEvalMs: number = LEVEL_ONE_OFFICIAL_EVAL_MS,
): LevelOneAttemptReleaseResult {
  const volumeReached = runtime.everClearedObstacle;
  const holdReached = runtime.clearMs >= officialEvalMs;
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
