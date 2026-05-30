/**
 * Motor Nivel 1: ascenso 1.5 s → sostén oficial 2 s (obstáculo) → resultado → descanso.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  createLevelOneAttemptRuntime,
  enterOfficialEvalPhase,
  evaluateLevelOneAttemptComplete,
  evaluateLevelOneAttemptRelease,
  LEVEL_ONE_ASCENT_MS,
  LEVEL_ONE_OFFICIAL_EVAL_MS,
  type LevelOneAttemptRuntime,
  type LevelOneFailReason,
  tickLevelOneRepetition,
} from '@/src/modules/session/engine/level-one/level-one-repetition-rules';
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';
import type {
  LevelOneProgress,
  LevelOneSessionProgress,
} from '@/src/modules/levels/types/level-progress';

const DEFAULT_REST_MS = 3000;
const PREP_MS = 3000;
const FAILED_EXHALE_MS = 2100;
const VALID_EXHALE_MS = 700;
const MAX_REPS = 10;
const HOLD_TICK_MS = 100;

export type LevelOnePhase =
  | 'not-started'
  | 'preparing'
  | 'ready'
  | 'inhaling'
  | 'hold-prep'
  | 'evaluating'
  | 'exhale'
  | 'resting'
  | 'session-complete'
  | 'interrupted'
  | 'level-complete';

export type OfficialAttemptReleasePayload = {
  heldMs: number;
  sustainMs: number;
  targetReached: boolean;
  peakNorm: number;
  liveFail: LevelOneFailReason | null;
};

export type OfficialAttemptReleaseResolution = {
  valid: boolean;
  failReason?: LevelOneFailReason | null;
};

type UseLevelOneGameParams = {
  progress: LevelOneProgress;
  onProgressChange: (updater: (prev: LevelOneProgress) => LevelOneProgress) => void;
  onAttemptResolved?: (payload: { valid: boolean; holdMs: number }) => void;
  getInspirationNorm?: () => number;
  sessionInputMode?: SessionInputMode;
  resolveOfficialAttemptOnRelease?: (
    payload: OfficialAttemptReleasePayload,
  ) => OfficialAttemptReleaseResolution;
  engineScopeKey?: string;
  /** Sustain duration during official eval — varies per level. */
  officialEvalMs?: number;
  /** Rest between repetitions — varies per level. */
  restMs?: number;
};

type AttemptFeedback = 'idle' | 'valid' | 'failed';

export function useLevelOneGame({
  progress,
  onProgressChange,
  onAttemptResolved,
  getInspirationNorm,
  sessionInputMode = 'sensor',
  resolveOfficialAttemptOnRelease,
  engineScopeKey,
  officialEvalMs = LEVEL_ONE_OFFICIAL_EVAL_MS,
  restMs = DEFAULT_REST_MS,
}: UseLevelOneGameParams) {
  const [phase, setPhase] = useState<LevelOnePhase>('not-started');
  const [countdownMs, setCountdownMs] = useState(PREP_MS);
  const [phaseCountdownMs, setPhaseCountdownMs] = useState(LEVEL_ONE_ASCENT_MS);
  const [holdMs, setHoldMs] = useState(0);
  const [clearMs, setClearMs] = useState(0);
  const [obstacleActive, setObstacleActive] = useState(false);
  const [everClearedObstacle, setEverClearedObstacle] = useState(false);
  const [attemptFeedback, setAttemptFeedback] = useState<AttemptFeedback>('idle');
  const [lastFailReason, setLastFailReason] = useState<LevelOneFailReason | null>(null);
  const [liveCrashSignal, setLiveCrashSignal] = useState(0);

  const holdStartRef = useRef<number | null>(null);
  const attemptRuntimeRef = useRef<LevelOneAttemptRuntime>(createLevelOneAttemptRuntime());
  const liveFailRef = useRef<LevelOneFailReason | null>(null);
  const attemptEndedSessionRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingPrepReadyRef = useRef(false);
  const pendingRestAdvanceRef = useRef(false);
  const attemptClosedRef = useRef(false);

  const currentSessionData = useMemo<LevelOneSessionProgress | undefined>(
    () => progress.sessions[progress.currentSession - 1],
    [progress.currentSession, progress.sessions],
  );

  const clearTimers = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (holdTickRef.current) {
      clearInterval(holdTickRef.current);
      holdTickRef.current = null;
    }
  }, []);

  const resetAttemptRuntime = useCallback(() => {
    attemptRuntimeRef.current = createLevelOneAttemptRuntime();
    liveFailRef.current = null;
    attemptClosedRef.current = false;
    setClearMs(0);
    setObstacleActive(false);
    setEverClearedObstacle(false);
    setLastFailReason(null);
    setPhaseCountdownMs(LEVEL_ONE_ASCENT_MS);
  }, []);

  const stopSession = useCallback(() => {
    clearTimers();
    holdStartRef.current = null;
    setHoldMs(0);
    resetAttemptRuntime();
    setAttemptFeedback('idle');
    attemptEndedSessionRef.current = false;
    setCountdownMs(PREP_MS);
    setPhase('not-started');
  }, [clearTimers, resetAttemptRuntime]);

  useLayoutEffect(() => {
    if (engineScopeKey === undefined) return;
    pendingPrepReadyRef.current = false;
    pendingRestAdvanceRef.current = false;
    stopSession();
  }, [engineScopeKey, stopSession]);

  const restartCurrentSession = useCallback(() => {
    clearTimers();
    holdStartRef.current = null;
    attemptEndedSessionRef.current = false;
    setAttemptFeedback('idle');
    setHoldMs(0);
    resetAttemptRuntime();
    setCountdownMs(PREP_MS);
    setPhase('preparing');
  }, [clearTimers, resetAttemptRuntime]);

  const startSession = useCallback(() => {
    if (phase === 'not-started') {
      restartCurrentSession();
    }
  }, [phase, restartCurrentSession]);

  const advanceRepetition = useCallback(() => {
    onProgressChange((prev) => {
      const sessionIndex = prev.currentSession - 1;
      const session = prev.sessions[sessionIndex];
      const sessionAttempts = session.validRepetitions + session.failedRepetitions;
      const sessionCompletedNow = sessionAttempts >= MAX_REPS;

      const sessions = [...prev.sessions];
      sessions[sessionIndex] = {
        ...session,
        completed: sessionCompletedNow,
      };

      if (!sessionCompletedNow) {
        return {
          ...prev,
          currentRepetition: sessionAttempts + 1,
          sessions,
        };
      }
      return {
        ...prev,
        sessions,
        currentRepetition: MAX_REPS,
      };
    });
  }, [onProgressChange]);

  const finishAttempt = useCallback(
    (valid: boolean, heldMs: number, failReason: LevelOneFailReason | null, triggerLiveCrash: boolean) => {
      onProgressChange((prev) => {
        const sessionIndex = prev.currentSession - 1;
        const session = prev.sessions[sessionIndex];
        const nextValid = session.validRepetitions + (valid ? 1 : 0);
        const nextFailed = session.failedRepetitions + (valid ? 0 : 1);
        const nextAttempts = nextValid + nextFailed;
        const sessionCompletedNow = nextAttempts >= MAX_REPS;
        const updatedSession: LevelOneSessionProgress = {
          ...session,
          validRepetitions: nextValid,
          failedRepetitions: nextFailed,
          completed: sessionCompletedNow,
        };

        const sessions = [...prev.sessions];
        sessions[sessionIndex] = updatedSession;
        attemptEndedSessionRef.current = sessionCompletedNow;

        return {
          ...prev,
          sessions,
          totalValid: prev.totalValid + (valid ? 1 : 0),
          totalFailed: prev.totalFailed + (valid ? 0 : 1),
        };
      });

      setObstacleActive(false);
      setLastFailReason(failReason);
      setAttemptFeedback(valid ? 'valid' : 'failed');
      setHoldMs(heldMs);
      if (triggerLiveCrash) {
        setLiveCrashSignal((n) => n + 1);
      }
      setPhase('exhale');
      onAttemptResolved?.({ valid, holdMs: heldMs });
    },
    [onAttemptResolved, onProgressChange],
  );

  const stopAttemptTick = useCallback(() => {
    holdStartRef.current = null;
    if (holdTickRef.current) {
      clearInterval(holdTickRef.current);
      holdTickRef.current = null;
    }
  }, []);

  const resolveAndCloseAttempt = useCallback(
    (heldMs: number, options?: { releasedDuringEval?: boolean; liveFailOverride?: LevelOneFailReason }) => {
      if (attemptClosedRef.current) {
        return;
      }
      attemptClosedRef.current = true;
      stopAttemptTick();

      const runtime = attemptRuntimeRef.current;
      const liveFail = options?.liveFailOverride ?? liveFailRef.current;

      const releaseEval =
        runtime.subPhase === 'official_eval' && !options?.releasedDuringEval
          ? evaluateLevelOneAttemptComplete({ runtime, liveFail, inputMode: sessionInputMode, officialEvalMs })
          : evaluateLevelOneAttemptRelease({
              runtime,
              liveFail,
              inputMode: sessionInputMode,
              releasedDuringEval: options?.releasedDuringEval,
              officialEvalMs,
            });

      const custom = resolveOfficialAttemptOnRelease?.({
        heldMs,
        sustainMs: runtime.clearMs,
        targetReached: runtime.everClearedObstacle,
        peakNorm: runtime.peakNorm,
        liveFail,
      });

      const valid = custom !== undefined ? custom.valid : releaseEval.valid;
      const failReason =
        custom?.failReason !== undefined
          ? custom.failReason
          : valid
            ? null
            : releaseEval.failReason;

      const shouldCrash =
        !valid &&
        (liveFail === 'hit_obstacle' ||
          liveFail === 'released_during_eval' ||
          options?.releasedDuringEval === true);

      finishAttempt(valid, heldMs, failReason ?? releaseEval.failReason, shouldCrash);
    },
    [finishAttempt, officialEvalMs, resolveOfficialAttemptOnRelease, sessionInputMode, stopAttemptTick],
  );

  const beginOfficialEval = useCallback(() => {
    attemptRuntimeRef.current = enterOfficialEvalPhase(attemptRuntimeRef.current);
    setPhase('evaluating');
    setPhaseCountdownMs(officialEvalMs);
    setObstacleActive(true);
  }, [officialEvalMs]);

  const runAttemptTick = useCallback(() => {
    if (attemptClosedRef.current) return;

    const startedAt = holdStartRef.current;
    if (!startedAt) return;

    const elapsed = Date.now() - startedAt;
    setHoldMs(elapsed);

    const norm = getInspirationNorm?.() ?? 0;
    const runtime = attemptRuntimeRef.current;

    if (runtime.subPhase === 'ascending') {
      const tick = tickLevelOneRepetition(runtime, norm, HOLD_TICK_MS);
      attemptRuntimeRef.current = tick.runtime;
      setPhaseCountdownMs(
        Math.max(0, LEVEL_ONE_ASCENT_MS - tick.runtime.subPhaseElapsedMs),
      );

      if (tick.shouldBeginOfficialEval) {
        beginOfficialEval();
        return;
      }
    } else if (runtime.subPhase === 'official_eval') {
      const tick = tickLevelOneRepetition(runtime, norm, HOLD_TICK_MS);
      attemptRuntimeRef.current = tick.runtime;
      setClearMs(tick.runtime.clearMs);
      setEverClearedObstacle(tick.runtime.everClearedObstacle);
      setPhaseCountdownMs(
        Math.max(0, officialEvalMs - tick.runtime.subPhaseElapsedMs),
      );

      if (tick.liveFail) {
        liveFailRef.current = tick.liveFail;
        setObstacleActive(false);
        resolveAndCloseAttempt(elapsed, { liveFailOverride: tick.liveFail });
        return;
      }

      if (tick.runtime.subPhaseElapsedMs >= officialEvalMs) {
        setObstacleActive(false);
        resolveAndCloseAttempt(elapsed);
      }
    }
  }, [
    beginOfficialEval,
    getInspirationNorm,
    officialEvalMs,
    resolveAndCloseAttempt,
  ]);

  const onInhaleStart = useCallback(() => {
    if (phase !== 'ready') {
      return;
    }

    setAttemptFeedback('idle');
    resetAttemptRuntime();
    setHoldMs(0);
    setPhase('inhaling');
    setObstacleActive(false);
    holdStartRef.current = Date.now();

    holdTickRef.current = setInterval(() => {
      runAttemptTick();
    }, HOLD_TICK_MS);
  }, [phase, resetAttemptRuntime, runAttemptTick]);

  const onInhaleEnd = useCallback(() => {
    if (phase !== 'inhaling' && phase !== 'evaluating') {
      return;
    }
    if (attemptClosedRef.current) {
      return;
    }

    const startedAt = holdStartRef.current;
    const elapsed = startedAt ? Date.now() - startedAt : 0;
    const currentPhase = phase;

    if (currentPhase === 'evaluating') {
      liveFailRef.current = 'released_during_eval';
      setObstacleActive(false);
      resolveAndCloseAttempt(elapsed, { releasedDuringEval: true });
      return;
    }

    resolveAndCloseAttempt(elapsed, { releasedDuringEval: false });
  }, [phase, resolveAndCloseAttempt]);

  useEffect(() => {
    if (phase !== 'preparing' || !pendingPrepReadyRef.current) {
      return;
    }
    pendingPrepReadyRef.current = false;
    setPhase('ready');
  }, [phase, countdownMs]);

  useEffect(() => {
    if (phase !== 'resting' || !pendingRestAdvanceRef.current) {
      return;
    }
    pendingRestAdvanceRef.current = false;
    advanceRepetition();
    setPhase('ready');
  }, [advanceRepetition, phase, countdownMs]);

  useEffect(() => {
    if (progress.levelCompleted) {
      setPhase('level-complete');
      setCountdownMs(0);
      clearTimers();
      return;
    }

    if (phase === 'not-started') {
      clearTimers();
      return;
    }

    if (phase === 'preparing') {
      setCountdownMs(PREP_MS);
      countdownRef.current = setInterval(() => {
        setCountdownMs((prev) => {
          const next = prev - 1000;
          if (next <= 0) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            pendingPrepReadyRef.current = true;
            return 0;
          }
          return next;
        });
      }, 1000);
    }

    if (phase === 'exhale') {
      const exhaleDelayMs = attemptFeedback === 'failed' ? FAILED_EXHALE_MS : VALID_EXHALE_MS;
      const timeout = setTimeout(() => {
        if (attemptEndedSessionRef.current) {
          attemptEndedSessionRef.current = false;
          setPhase('session-complete');
          return;
        }
        setPhase('resting');
        setCountdownMs(restMs);
      }, exhaleDelayMs);

      return () => clearTimeout(timeout);
    }

    if (phase === 'resting') {
      setObstacleActive(false);
      countdownRef.current = setInterval(() => {
        setCountdownMs((prev) => {
          const next = prev - 1000;
          if (next <= 0) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            pendingRestAdvanceRef.current = true;
            return 0;
          }
          return next;
        });
      }, 1000);
    }

    if (!progress.levelCompleted && currentSessionData?.completed && phase !== 'session-complete') {
      setPhase('session-complete');
    }

    if (!progress.levelCompleted && !currentSessionData?.completed && phase === 'session-complete') {
      setPhase('preparing');
    }

    return () => {
      if (phase === 'preparing' || phase === 'resting') {
        clearTimers();
      }
    };
  }, [
    attemptFeedback,
    clearTimers,
    currentSessionData?.completed,
    phase,
    progress,
    restMs,
  ]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const evalSecondsRemaining = Math.max(0, Math.ceil(phaseCountdownMs / 1000));
  const ascentMsRemaining =
    phase === 'inhaling' ? Math.max(0, LEVEL_ONE_ASCENT_MS - holdMs) : 0;
  const ascentSecondsRemaining =
    ascentMsRemaining > 0 ? Math.ceil(ascentMsRemaining / 500) / 2 : 0;
  const holdPrepSecondsRemaining = ascentSecondsRemaining;
  const sustainSecondsRemaining =
    phase === 'evaluating' ? evalSecondsRemaining : 0;
  const restSecondsRemaining = Math.max(0, Math.ceil(countdownMs / 1000));
  const prepSecondsRemaining = Math.max(0, Math.ceil(countdownMs / 1000));

  return {
    phase,
    holdMs,
    sustainMs: clearMs,
    clearMs,
    targetReached: everClearedObstacle,
    everClearedObstacle,
    obstacleActive,
    lastFailReason,
    attemptFeedback,
    liveCrashSignal,
    currentSessionData,
    holdSecondsRemaining: sustainSecondsRemaining,
    holdPrepSecondsRemaining,
    ascentSecondsRemaining,
    sustainSecondsRemaining,
    evalSecondsRemaining,
    restSecondsRemaining,
    prepSecondsRemaining,
    onInhaleStart,
    onInhaleEnd,
    startSession,
    stopSession,
    restartCurrentSession,
  };
}
