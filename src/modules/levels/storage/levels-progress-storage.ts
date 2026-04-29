/**
 * Purpose: AsyncStorage persistence for levels progress.
 * Module: levels
 * Dependencies: async-storage, levels/types
 * Notes: Simple versioned payload for future migrations.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createInitialLevelsProgress,
  type LevelsProgress,
} from '@/src/modules/levels/types/level-progress';

const STORAGE_KEY = 'rehab.levels.progress.v1';

export async function loadLevelsProgress(): Promise<LevelsProgress> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialLevelsProgress();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LevelsProgress>;
    const base = createInitialLevelsProgress();

    return {
      ...base,
      ...parsed,
      levelOne: {
        ...base.levelOne,
        ...parsed.levelOne,
        sessions:
          parsed.levelOne?.sessions && parsed.levelOne.sessions.length === 6
            ? parsed.levelOne.sessions.map((session, index) => ({
                ...base.levelOne.sessions[index],
                ...session,
                interrupted: !!(session as { interrupted?: boolean }).interrupted,
              }))
            : base.levelOne.sessions,
      },
    };
  } catch {
    return createInitialLevelsProgress();
  }
}

export async function saveLevelsProgress(progress: LevelsProgress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
