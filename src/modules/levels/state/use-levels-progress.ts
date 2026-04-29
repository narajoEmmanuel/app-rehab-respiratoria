import { useCallback, useEffect, useState } from 'react';

import {
  loadLevelsProgress,
  saveLevelsProgress,
} from '@/src/modules/levels/storage/levels-progress-storage';
import {
  createInitialLevelsProgress,
  type LevelId,
  type LevelOneProgress,
  type LevelsProgress,
} from '@/src/modules/levels/types/level-progress';

export function useLevelsProgress() {
  const [progress, setProgress] = useState<LevelsProgress>(createInitialLevelsProgress());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      const persisted = await loadLevelsProgress();
      if (isActive) {
        setProgress(persisted);
        setIsLoading(false);
      }
    };
    load();
    return () => {
      isActive = false;
    };
  }, []);

  const updateProgress = useCallback((updater: (prev: LevelsProgress) => LevelsProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      void saveLevelsProgress(next);
      return next;
    });
  }, []);

  const selectLevel = useCallback(
    (levelId: LevelId) => {
      updateProgress((prev) => ({ ...prev, selectedLevelId: levelId }));
    },
    [updateProgress]
  );

  const updateLevelOne = useCallback(
    (updater: (prev: LevelOneProgress) => LevelOneProgress) => {
      updateProgress((prev) => {
        const levelOne = updater(prev.levelOne);
        const shouldUnlockLevel2 = levelOne.levelCompleted && levelOne.levelPerfect;
        const unlockedLevels = shouldUnlockLevel2
          ? Array.from(new Set([...prev.unlockedLevels, 'level-2' as LevelId]))
          : prev.unlockedLevels.filter((id) => id !== 'level-2');

        return {
          ...prev,
          levelOne,
          unlockedLevels,
        };
      });
    },
    [updateProgress]
  );

  const finalizeCurrentLevelOneSession = useCallback(() => {
    updateProgress((prev) => {
      const currentIndex = prev.levelOne.currentSession - 1;
      const currentSession = prev.levelOne.sessions[currentIndex];
      if (!currentSession || !currentSession.completed || currentSession.interrupted) {
        return prev;
      }

      const isLastSession = prev.levelOne.currentSession >= prev.levelOne.sessions.length;
      const levelCompleted = isLastSession;
      const levelPerfect = levelCompleted
        ? prev.levelOne.sessions.every(
            (session) =>
              session.completed &&
              !session.interrupted &&
              session.validRepetitions === 10 &&
              session.failedRepetitions === 0
          )
        : prev.levelOne.levelPerfect;

      const nextLevelOne = {
        ...prev.levelOne,
        currentSession: isLastSession ? prev.levelOne.currentSession : prev.levelOne.currentSession + 1,
        currentRepetition: 1,
        levelCompleted,
        levelPerfect,
      };

      const shouldUnlockLevel2 = nextLevelOne.levelCompleted && nextLevelOne.levelPerfect;
      const unlockedLevels = shouldUnlockLevel2
        ? Array.from(new Set([...prev.unlockedLevels, 'level-2' as LevelId]))
        : prev.unlockedLevels.filter((id) => id !== 'level-2');

      return {
        ...prev,
        levelOne: nextLevelOne,
        unlockedLevels,
      };
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
        unlockedLevels: prev.unlockedLevels.filter((id) => id !== 'level-2'),
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
        unlockedLevels: prev.unlockedLevels.filter((id) => id !== 'level-2'),
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
        unlockedLevels: prev.unlockedLevels.filter((id) => id !== 'level-2'),
      };
    });
  }, [updateProgress]);

  return {
    isLoading,
    progress,
    selectLevel,
    updateLevelOne,
    finalizeCurrentLevelOneSession,
    repeatCurrentLevelOneSession,
    resetInterruptedCurrentLevelOneSession,
    interruptCurrentLevelOneSession,
  };
}
