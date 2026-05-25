/**
 * Progreso de niveles: un solo estado en memoria por árbol React + persistencia por paciente.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  clearLevelOneActiveRun,
  loadLevelOneActiveRun,
} from '@/src/modules/levels/storage/level-one-active-run-storage';
import {
  loadLevelsProgress,
  saveLevelsProgress,
} from '@/src/modules/levels/storage/levels-progress-storage';
import {
  advanceLevelOneIfCurrentSessionCompleted,
  createInitialLevelsProgress,
  discardInProgressLevelOneRun,
  getRunnerLevelProgress,
  isRunnerGameLevel,
  prepareLevelOneForNewSessionRun,
  setRunnerLevelProgress,
  type LevelId,
  type LevelOneProgress,
  type LevelsProgress,
  type RunnerGameLevelId,
} from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';

type LevelsProgressContextValue = {
  isLoading: boolean;
  progress: LevelsProgress;
  selectLevel: (levelId: LevelId) => void;
  updateLevelOne: (updater: (prev: LevelOneProgress) => LevelOneProgress) => void;
  updateRunnerLevel: (
    levelId: RunnerGameLevelId,
    updater: (prev: LevelOneProgress) => LevelOneProgress,
  ) => void;
  finalizeCurrentLevelOneSession: () => void;
  finalizeRunnerLevelSession: (levelId: RunnerGameLevelId) => void;
  /** Nueva partida / pantalla sesión: puntero correcto + slot actual en cero (no continúa a medias). */
  prepareFreshLevelOneSessionRun: () => void;
  prepareFreshRunnerLevelSessionRun: (levelId: RunnerGameLevelId) => void;
  /** Descarta reps/interrupción del slot actual sin tocar historial clínico. */
  discardInProgressLevelOneRun: () => void;
  discardInProgressRunnerLevelRun: (levelId: RunnerGameLevelId) => void;
  /** Borra la marca de partida activa en AsyncStorage (salida limpia). */
  clearLevelOneActiveRunMarker: () => Promise<void>;
  repeatCurrentLevelOneSession: () => void;
  repeatCurrentRunnerLevelSession: (levelId: RunnerGameLevelId) => void;
  resetInterruptedCurrentLevelOneSession: () => void;
  resetInterruptedCurrentRunnerLevelSession: (levelId: RunnerGameLevelId) => void;
  interruptCurrentLevelOneSession: () => void;
  interruptCurrentRunnerLevelSession: (levelId: RunnerGameLevelId) => void;
};

const LevelsProgressContext = createContext<LevelsProgressContextValue | null>(null);

export function LevelsProgressProvider({ children }: { children: React.ReactNode }) {
  const { patient } = usePatientSession();
  const patientId = patient?.paciente_id ?? null;
  const patientScopeKey =
    patient != null ? `${patient.paciente_id}:${patient.clave}` : null;

  const [progress, setProgress] = useState<LevelsProgress>(createInitialLevelsProgress());
  const [isLoading, setIsLoading] = useState(true);

  const patientIdRef = useRef(patientId);
  patientIdRef.current = patientId;

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (patientId == null) {
        if (!isActive) return;
        setProgress(createInitialLevelsProgress());
        setIsLoading(false);
        patientIdRef.current = null;
        return;
      }
      setIsLoading(true);
      const persisted = await loadLevelsProgress(patientId);
      const activeRun = await loadLevelOneActiveRun(patientId);
      let merged = persisted;
      if (activeRun != null && isRunnerGameLevel(activeRun.levelId)) {
        const slot = getRunnerLevelProgress(persisted, activeRun.levelId);
        const cleared = discardInProgressLevelOneRun(slot);
        if (cleared !== slot) {
          merged = setRunnerLevelProgress(persisted, activeRun.levelId, cleared);
        }
      }
      if (activeRun != null) {
        await clearLevelOneActiveRun(patientId);
        if (merged !== persisted) {
          await saveLevelsProgress(patientId, merged);
        }
      }
      if (isActive) {
        setProgress(merged);
        setIsLoading(false);
      }
    };
    void load();
    return () => {
      isActive = false;
    };
  }, [patientScopeKey, patientId]);

  const updateProgress = useCallback((updater: (prev: LevelsProgress) => LevelsProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      const id = patientIdRef.current;
      if (id != null) {
        void saveLevelsProgress(id, next);
      }
      return next;
    });
  }, []);

  const selectLevel = useCallback(
    (levelId: LevelId) => {
      updateProgress((prev) => ({ ...prev, selectedLevelId: levelId }));
    },
    [updateProgress],
  );

  const updateRunnerLevel = useCallback(
    (levelId: RunnerGameLevelId, updater: (prev: LevelOneProgress) => LevelOneProgress) => {
      updateProgress((prev) => {
        const current = getRunnerLevelProgress(prev, levelId);
        const next = updater(current);
        if (next === current) return prev;
        return setRunnerLevelProgress(prev, levelId, next);
      });
    },
    [updateProgress],
  );

  const updateLevelOne = useCallback(
    (updater: (prev: LevelOneProgress) => LevelOneProgress) => {
      updateRunnerLevel('level-1', updater);
    },
    [updateRunnerLevel],
  );

  const finalizeRunnerLevelSession = useCallback(
    (levelId: RunnerGameLevelId) => {
      updateProgress((prev) => {
        const current = getRunnerLevelProgress(prev, levelId);
        const next = advanceLevelOneIfCurrentSessionCompleted(current);
        if (next === current) return prev;
        return setRunnerLevelProgress(prev, levelId, next);
      });
    },
    [updateProgress],
  );

  const finalizeCurrentLevelOneSession = useCallback(() => {
    finalizeRunnerLevelSession('level-1');
  }, [finalizeRunnerLevelSession]);

  const prepareFreshRunnerLevelSessionRun = useCallback(
    (levelId: RunnerGameLevelId) => {
      updateProgress((prev) => {
        const current = getRunnerLevelProgress(prev, levelId);
        const next = prepareLevelOneForNewSessionRun(current);
        if (next === current) return prev;
        return setRunnerLevelProgress(prev, levelId, next);
      });
    },
    [updateProgress],
  );

  const prepareFreshLevelOneSessionRun = useCallback(() => {
    prepareFreshRunnerLevelSessionRun('level-1');
  }, [prepareFreshRunnerLevelSessionRun]);

  const discardInProgressRunnerLevelRun = useCallback(
    (levelId: RunnerGameLevelId) => {
      updateProgress((prev) => {
        const current = getRunnerLevelProgress(prev, levelId);
        const next = discardInProgressLevelOneRun(current);
        if (next === current) return prev;
        return setRunnerLevelProgress(prev, levelId, next);
      });
    },
    [updateProgress],
  );

  const discardInProgressLevelOneRunState = useCallback(() => {
    discardInProgressRunnerLevelRun('level-1');
  }, [discardInProgressRunnerLevelRun]);

  const clearLevelOneActiveRunMarker = useCallback(async () => {
    const id = patientIdRef.current;
    if (id == null) return;
    await clearLevelOneActiveRun(id);
  }, []);

  const repeatCurrentRunnerLevelSession = useCallback(
    (levelId: RunnerGameLevelId) => {
      updateProgress((prev) => {
        const slot = getRunnerLevelProgress(prev, levelId);
        const currentIndex = slot.currentSession - 1;
        const currentSession = slot.sessions[currentIndex];
        if (!currentSession) {
          return prev;
        }

        const sessions = [...slot.sessions];
        sessions[currentIndex] = {
          ...currentSession,
          validRepetitions: 0,
          failedRepetitions: 0,
          completed: false,
          interrupted: false,
        };

        const nextSlot = {
          ...slot,
          sessions,
          currentRepetition: 1,
          totalValid: slot.totalValid - currentSession.validRepetitions,
          totalFailed: slot.totalFailed - currentSession.failedRepetitions,
          levelCompleted: false,
          levelPerfect: false,
        };

        return setRunnerLevelProgress(prev, levelId, nextSlot);
      });
    },
    [updateProgress],
  );

  const repeatCurrentLevelOneSession = useCallback(() => {
    repeatCurrentRunnerLevelSession('level-1');
  }, [repeatCurrentRunnerLevelSession]);

  const resetInterruptedCurrentRunnerLevelSession = useCallback(
    (levelId: RunnerGameLevelId) => {
      updateProgress((prev) => {
        const slot = getRunnerLevelProgress(prev, levelId);
        const currentIndex = slot.currentSession - 1;
        const currentSession = slot.sessions[currentIndex];
        if (!currentSession || !currentSession.interrupted || currentSession.completed) {
          return prev;
        }

        const sessions = [...slot.sessions];
        sessions[currentIndex] = {
          ...currentSession,
          validRepetitions: 0,
          failedRepetitions: 0,
          completed: false,
          interrupted: false,
        };

        const nextSlot = {
          ...slot,
          sessions,
          currentRepetition: 1,
          totalValid: slot.totalValid - currentSession.validRepetitions,
          totalFailed: slot.totalFailed - currentSession.failedRepetitions,
          levelCompleted: false,
          levelPerfect: false,
        };

        return setRunnerLevelProgress(prev, levelId, nextSlot);
      });
    },
    [updateProgress],
  );

  const resetInterruptedCurrentLevelOneSession = useCallback(() => {
    resetInterruptedCurrentRunnerLevelSession('level-1');
  }, [resetInterruptedCurrentRunnerLevelSession]);

  const interruptCurrentRunnerLevelSession = useCallback(
    (levelId: RunnerGameLevelId) => {
      updateProgress((prev) => {
        const slot = getRunnerLevelProgress(prev, levelId);
        const currentIndex = slot.currentSession - 1;
        const currentSession = slot.sessions[currentIndex];
        if (!currentSession || currentSession.completed) {
          return prev;
        }

        const sessions = [...slot.sessions];
        sessions[currentIndex] = {
          ...currentSession,
          completed: false,
          interrupted: true,
        };

        return setRunnerLevelProgress(prev, levelId, {
          ...slot,
          sessions,
          levelCompleted: false,
          levelPerfect: false,
        });
      });
    },
    [updateProgress],
  );

  const interruptCurrentLevelOneSession = useCallback(() => {
    interruptCurrentRunnerLevelSession('level-1');
  }, [interruptCurrentRunnerLevelSession]);

  const value = useMemo(
    () => ({
      isLoading,
      progress,
      selectLevel,
      updateLevelOne,
      updateRunnerLevel,
      finalizeCurrentLevelOneSession,
      finalizeRunnerLevelSession,
      prepareFreshLevelOneSessionRun,
      prepareFreshRunnerLevelSessionRun,
      discardInProgressLevelOneRun: discardInProgressLevelOneRunState,
      discardInProgressRunnerLevelRun,
      clearLevelOneActiveRunMarker,
      repeatCurrentLevelOneSession,
      repeatCurrentRunnerLevelSession,
      resetInterruptedCurrentLevelOneSession,
      resetInterruptedCurrentRunnerLevelSession,
      interruptCurrentLevelOneSession,
      interruptCurrentRunnerLevelSession,
    }),
    [
      isLoading,
      progress,
      selectLevel,
      updateLevelOne,
      updateRunnerLevel,
      finalizeCurrentLevelOneSession,
      finalizeRunnerLevelSession,
      prepareFreshLevelOneSessionRun,
      prepareFreshRunnerLevelSessionRun,
      discardInProgressLevelOneRunState,
      discardInProgressRunnerLevelRun,
      clearLevelOneActiveRunMarker,
      repeatCurrentLevelOneSession,
      repeatCurrentRunnerLevelSession,
      resetInterruptedCurrentLevelOneSession,
      resetInterruptedCurrentRunnerLevelSession,
      interruptCurrentLevelOneSession,
      interruptCurrentRunnerLevelSession,
    ],
  );

  return <LevelsProgressContext.Provider value={value}>{children}</LevelsProgressContext.Provider>;
}

export function useLevelsProgress(): LevelsProgressContextValue {
  const ctx = useContext(LevelsProgressContext);
  if (ctx == null) {
    throw new Error('useLevelsProgress must be used within LevelsProgressProvider');
  }
  return ctx;
}
