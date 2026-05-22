/**
 * Purpose: AsyncStorage persistence for levels progress (una copia por paciente).
 * Module: levels
 * Dependencies: async-storage, levels/types
 * Notes: Migración one-shot desde clave global legacy `rehab.levels.progress.v1`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createInitialLevelsProgress,
  type LevelsProgress,
} from '@/src/modules/levels/types/level-progress';

/** Clave antigua sin paciente; se migra una vez y se borra. */
const STORAGE_KEY_LEGACY = 'rehab.levels.progress.v1';

function storageKeyForPatient(patientId: number): string {
  return `rehab.levels.progress.v1.u${patientId}`;
}

function mergeParsed(parsed: Partial<LevelsProgress>): LevelsProgress {
  const base = createInitialLevelsProgress();

  return {
    ...base,
    ...parsed,
    levelOne: mergeLevelSlotProgress(base.levelOne, parsed.levelOne),
    levelTwo: mergeLevelSlotProgress(base.levelTwo, parsed.levelTwo ?? base.levelTwo),
  };
}

function mergeLevelSlotProgress(
  baseSlot: LevelsProgress['levelOne'],
  parsedSlot: Partial<LevelsProgress['levelOne']> | undefined,
): LevelsProgress['levelOne'] {
  return {
    ...baseSlot,
    ...parsedSlot,
    sessions:
      parsedSlot?.sessions && parsedSlot.sessions.length === 6
        ? parsedSlot.sessions.map((session, index) => ({
            ...baseSlot.sessions[index],
            ...session,
            interrupted: !!(session as { interrupted?: boolean }).interrupted,
          }))
        : baseSlot.sessions,
  };
}

export async function loadLevelsProgress(patientId: number): Promise<LevelsProgress> {
  const key = storageKeyForPatient(patientId);
  const raw = await AsyncStorage.getItem(key);
  if (raw) {
    try {
      return mergeParsed(JSON.parse(raw) as Partial<LevelsProgress>);
    } catch {
      return createInitialLevelsProgress();
    }
  }

  const legacy = await AsyncStorage.getItem(STORAGE_KEY_LEGACY);
  if (legacy) {
    try {
      const migrated = mergeParsed(JSON.parse(legacy) as Partial<LevelsProgress>);
      await AsyncStorage.setItem(key, JSON.stringify(migrated));
      await AsyncStorage.removeItem(STORAGE_KEY_LEGACY);
      return migrated;
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY_LEGACY);
    }
  }

  return createInitialLevelsProgress();
}

export async function saveLevelsProgress(patientId: number, progress: LevelsProgress): Promise<void> {
  await AsyncStorage.setItem(storageKeyForPatient(patientId), JSON.stringify(progress));
}

export async function clearLevelsProgress(patientId: number): Promise<void> {
  await AsyncStorage.removeItem(storageKeyForPatient(patientId));
}

export async function hasLevelsProgress(patientId: number): Promise<boolean> {
  const raw = await AsyncStorage.getItem(storageKeyForPatient(patientId));
  return raw != null && raw !== '';
}
