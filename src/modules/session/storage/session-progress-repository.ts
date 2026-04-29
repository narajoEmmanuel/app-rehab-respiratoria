import AsyncStorage from '@react-native-async-storage/async-storage';

import { PATIENT_STORAGE_KEYS } from '@/src/modules/patient/storage-keys';
import type { AttemptRecord, SessionRecord } from '@/src/modules/session/types/session-progress';

export async function readAllSessions(): Promise<SessionRecord[]> {
  const raw = await AsyncStorage.getItem(PATIENT_STORAGE_KEYS.sessionsJson);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

export async function writeAllSessions(rows: SessionRecord[]): Promise<void> {
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.sessionsJson, JSON.stringify(rows));
}

export async function readAllAttempts(): Promise<AttemptRecord[]> {
  const raw = await AsyncStorage.getItem(PATIENT_STORAGE_KEYS.attemptsJson);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AttemptRecord[]) : [];
  } catch {
    return [];
  }
}

export async function writeAllAttempts(rows: AttemptRecord[]): Promise<void> {
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.attemptsJson, JSON.stringify(rows));
}
