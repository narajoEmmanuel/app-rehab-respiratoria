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
  loadLevelsProgress,
  saveLevelsProgress,
} from '@/src/modules/levels/storage/levels-progress-storage';
import {
  advanceLevelOneIfCurrentSessionCompleted,
  createInitialLevelsProgress,
  prepareLevelOneForNewSessionRun,
  type LevelId,
  type LevelOneProgress,
  type LevelsProgress,
} from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';

type LevelsProgressContextValue = {
  isLoading: boolean;
  progress: LevelsProgress;
  selectLevel: (levelId: LevelId) => void;
  updateLevelOne: (updater: (prev: LevelOneProgress) => LevelOneProgress) => void;
  finalizeCurrentLevelOneSession: () => void;
  /** Nueva partida / pantalla sesión: puntero correcto + slot actual en cero (no continúa a medias). */
  prepareFreshLevelOneSessionRun: () => void;
  repeatCurrentLevelOneSession: () => void;
  resetInterruptedCurrentLevelOneSession: () => void;
  interruptCurrentLevelOneSession: () => void;
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
      if (isActive) {
        setProgress(persisted);
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

  const updateLevelOne = useCallback(
    (updater: (prev: LevelOneProgress) => LevelOneProgress) => {
      updateProgress((prev) => {
        const levelOne = updater(prev.levelOne);
        return {
          ...prev,
          levelOne,
        };
      });
    },
    [updateProgress],
  );

  const finalizeCurrentLevelOneSession = useCallback(() => {
    updateProgress((prev) => {
      const nextLevelOne = advanceLevelOneIfCurrentSessionCompleted(prev.levelOne);
      if (nextLevelOne === prev.levelOne) return prev;
      return { ...prev, levelOne: nextLevelOne };
    });
  }, [updateProgress]);

  const prepareFreshLevelOneSessionRun = useCallback(() => {
    updateProgress((prev) => {
      const nextLevelOne = prepareLevelOneForNewSessionRun(prev.levelOne);
      if (nextLevelOne === prev.levelOne) return prev;
      return { ...prev, levelOne: nextLevelOne };
    });
  }, [updateProgress]);

  const repeatCurrentLevelOneSession = useCallback(() => {
    updateProgress((prev) => {
      const currentIndex = prev.levelOne.currentSession - 1;
      const currentSession = prev.levelOne.sessions[currentIndex];
      if (!currentSession) {
        return prev;
      }

      const sessions = [...prev.levelOne.sessions];
      sessions[currentIndex] = {
        ...currentSession,
        validRepetitions: 0,
        failedRepetitions: 0,
        completed: false,
        interrupted: false,
      };

      const nextLevelOne = {
        ...prev.levelOne,
        sessions,
        currentRepetition: 1,
        totalValid: prev.levelOne.totalValid - currentSession.validRepetitions,
        totalFailed: prev.levelOne.totalFailed - currentSession.failedRepetitions,
        levelCompleted: false,
        levelPerfect: false,
      };

      return {
        ...prev,
        levelOne: nextLevelOne,
      };
    });
  }, [updateProgress]);

  const resetInterruptedCurrentLevelOneSession = useCallback(() => {
    updateProgress((prev) => {
      const currentIndex = prev.levelOne.currentSession - 1;
      const currentSession = prev.levelOne.sessions[currentIndex];
      if (!currentSession || !currentSession.interrupted || currentSession.completed) {
        return prev;
      }

      const sessions = [...prev.levelOne.sessions];
      sessions[currentIndex] = {
        ...currentSession,
        validRepetitions: 0,
        failedRepetitions: 0,
        completed: false,
        interrupted: false,
      };

      const nextLevelOne = {
        ...prev.levelOne,
        sessions,
        currentRepetition: 1,
        totalValid: prev.levelOne.totalValid - currentSession.validRepetitions,
        totalFailed: prev.levelOne.totalFailed - currentSession.failedRepetitions,
        levelCompleted: false,
        levelPerfect: false,
      };

      return {
        ...prev,
        levelOne: nextLevelOne,
      };
    });
  }, [updateProgress]);

  const interruptCurrentLevelOneSession = useCallback(() => {
    updateProgress((prev) => {
      const currentIndex = prev.levelOne.currentSession - 1;
      const currentSession = prev.levelOne.sessions[currentIndex];
      if (!currentSession || currentSession.completed) {
        return prev;
      }

      const sessions = [...prev.levelOne.sessions];
      sessions[currentIndex] = {
        ...currentSession,
        completed: false,
        interrupted: true,
      };

      return {
        ...prev,
        levelOne: {
          ...prev.levelOne,
          sessions,
          levelCompleted: false,
          levelPerfect: false,
        },
      };
    });
  }, [updateProgress]);

  const value = useMemo(
    () => ({
      isLoading,
      progress,
      selectLevel,
      updateLevelOne,
      finalizeCurrentLevelOneSession,
      prepareFreshLevelOneSessionRun,
      repeatCurrentLevelOneSession,
      resetInterruptedCurrentLevelOneSession,
      interruptCurrentLevelOneSession,
    }),
    [
      isLoading,
      progress,
      selectLevel,
      updateLevelOne,
      finalizeCurrentLevelOneSession,
      prepareFreshLevelOneSessionRun,
      repeatCurrentLevelOneSession,
      resetInterruptedCurrentLevelOneSession,
      interruptCurrentLevelOneSession,
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
