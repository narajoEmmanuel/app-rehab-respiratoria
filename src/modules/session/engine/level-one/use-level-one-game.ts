/**
 * Purpose: Level 1 gameplay engine for touch-simulated breathing.
 * Module: session/engine/level-one
 * Dependencies: react, levels/types
 * Notes: Pure gameplay transitions with UI-agnostic state.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  LevelOneProgress,
  LevelOneSessionProgress,
} from '@/src/modules/levels/types/level-progress';

const REQUIRED_HOLD_MS = 5000;
const REST_MS = 5000;
const PREP_MS = 5000;
const MAX_REPS = 10;
export type LevelOnePhase =
  | 'not-started'
  | 'preparing'
  | 'ready'
  | 'holding'
  | 'exhale'
  | 'resting'
  | 'session-complete'
  | 'interrupted'
  | 'level-complete';

type UseLevelOneGameParams = {
  progress: LevelOneProgress;
  onProgressChange: (updater: (prev: LevelOneProgress) => LevelOneProgress) => void;
};

type AttemptFeedback = 'idle' | 'valid' | 'failed';

export function useLevelOneGame({ progress, onProgressChange }: UseLevelOneGameParams) {
  const [phase, setPhase] = useState<LevelOnePhase>('not-started');
  const [countdownMs, setCountdownMs] = useState(PREP_MS);
  const [holdMs, setHoldMs] = useState(0);
  const [attemptFeedback, setAttemptFeedback] = useState<AttemptFeedback>('idle');

  const holdStartRef = useRef<number | null>(null);
  const attemptEndedSessionRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentSessionData = useMemo<LevelOneSessionProgress | undefined>(
    () => progress.sessions[progress.currentSession - 1],
    [progress.currentSession, progress.sessions]
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

  const stopSession = useCallback(() => {
    clearTimers();
    holdStartRef.current = null;
    setHoldMs(0);
    setAttemptFeedback('idle');
    attemptEndedSessionRef.current = false;
    setCountdownMs(PREP_MS);
    setPhase('not-started');
  }, [clearTimers]);

  const restartCurrentSession = useCallback(() => {
    clearTimers();
    holdStartRef.current = null;
    attemptEndedSessionRef.current = false;
    setAttemptFeedback('idle');
    setHoldMs(0);
    setCountdownMs(PREP_MS);
    setPhase('preparing');
  }, [clearTimers]);

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

  const closeAttempt = useCallback(
    (valid: boolean, heldMs: number) => {
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
        attemptEndedSessionRef.current =
          sessionCompletedNow;

        return {
          ...prev,
          sessions,
          totalValid: prev.totalValid + (valid ? 1 : 0),
          totalFailed: prev.totalFailed + (valid ? 0 : 1),
        };
      });

      setAttemptFeedback(valid ? 'valid' : 'failed');
      setHoldMs(heldMs);
      setPhase('exhale');
    },
    [onProgressChange]
  );

  const onInhaleStart = useCallback(() => {
    if (phase !== 'ready') {
      return;
    }

    setAttemptFeedback('idle');
    setHoldMs(0);
    setPhase('holding');
    holdStartRef.current = Date.now();

    holdTickRef.current = setInterval(() => {
      const startedAt = holdStartRef.current;
      if (!startedAt) {
        return;
      }
      const elapsed = Date.now() - startedAt;
      setHoldMs(elapsed);
    }, 100);
  }, [phase]);

  const onInhaleEnd = useCallback(() => {
    if (phase !== 'holding') {
      return;
    }

    const startedAt = holdStartRef.current;
    const elapsed = startedAt ? Date.now() - startedAt : 0;
    holdStartRef.current = null;

    if (holdTickRef.current) {
      clearInterval(holdTickRef.current);
      holdTickRef.current = null;
    }

    closeAttempt(elapsed >= REQUIRED_HOLD_MS, elapsed);
  }, [closeAttempt, phase]);

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
            setPhase('ready');
            return 0;
          }
          return next;
        });
      }, 1000);
    }

    if (phase === 'exhale') {
      const timeout = setTimeout(() => {
        if (attemptEndedSessionRef.current) {
          attemptEndedSessionRef.current = false;
          setPhase('session-complete');
          return;
        }
        setPhase('resting');
        setCountdownMs(REST_MS);
      }, 700);

      return () => clearTimeout(timeout);
    }

    if (phase === 'resting') {
      countdownRef.current = setInterval(() => {
        setCountdownMs((prev) => {
          const next = prev - 1000;
          if (next <= 0) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            advanceRepetition();
            setPhase('ready');
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
    advanceRepetition,
    clearTimers,
    currentSessionData?.completed,
    phase,
    progress,
    restartCurrentSession,
  ]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const holdSecondsRemaining = Math.max(0, Math.ceil((REQUIRED_HOLD_MS - holdMs) / 1000));
  const restSecondsRemaining = Math.max(0, Math.ceil(countdownMs / 1000));
  const prepSecondsRemaining = Math.max(0, Math.ceil(countdownMs / 1000));

  return {
    phase,
    holdMs,
    attemptFeedback,
    currentSessionData,
    holdSecondsRemaining,
    restSecondsRemaining,
    prepSecondsRemaining,
    onInhaleStart,
    onInhaleEnd,
    startSession,
    stopSession,
    restartCurrentSession,
  };
}
