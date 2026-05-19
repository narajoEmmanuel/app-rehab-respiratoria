/**
 * Estado efímero de una partida de Nivel 1 en curso (no es historial clínico).
 * Sirve para detectar cierres abruptos y descartar progreso temporal al reabrir la app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LevelId } from '@/src/modules/levels/types/level-progress';
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';

export const LEVEL_ONE_ACTIVE_RUN_STORAGE_PREFIX = 'rehab.levels.level_one_active_run.v1.u';

export type LevelOneActiveRunSnapshot = {
  sessionRunId: string;
  levelId: LevelId;
  inputMode: SessionInputMode;
  updatedAt: number;
};

function storageKeyForPatient(patientId: number): string {
  return `${LEVEL_ONE_ACTIVE_RUN_STORAGE_PREFIX}${patientId}`;
}

export async function loadLevelOneActiveRun(
  patientId: number,
): Promise<LevelOneActiveRunSnapshot | null> {
  const raw = await AsyncStorage.getItem(storageKeyForPatient(patientId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LevelOneActiveRunSnapshot>;
    if (
      typeof parsed.sessionRunId !== 'string' ||
      typeof parsed.levelId !== 'string' ||
      typeof parsed.inputMode !== 'string' ||
      typeof parsed.updatedAt !== 'number'
    ) {
      return null;
    }
    return {
      sessionRunId: parsed.sessionRunId,
      levelId: parsed.levelId as LevelId,
      inputMode: parsed.inputMode as SessionInputMode,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function saveLevelOneActiveRun(
  patientId: number,
  snapshot: LevelOneActiveRunSnapshot,
): Promise<void> {
  await AsyncStorage.setItem(storageKeyForPatient(patientId), JSON.stringify(snapshot));
}

export async function clearLevelOneActiveRun(patientId: number): Promise<void> {
  await AsyncStorage.removeItem(storageKeyForPatient(patientId));
}

/** Lista claves de partida activa (depuración / migraciones). */
export async function listLevelOneActiveRunStorageKeys(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((key) => key.startsWith(LEVEL_ONE_ACTIVE_RUN_STORAGE_PREFIX));
}
