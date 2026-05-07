import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/src/lib/supabase';
import { PATIENT_STORAGE_KEYS } from '@/src/modules/patient/storage-keys';
import type { AttemptRecord, SessionRecord } from '@/src/modules/session/types/session-progress';

export async function readAllSessions(): Promise<SessionRecord[]> {
  if (supabase != null) {
    const { data, error } = await supabase
      .from('sessions')
      .select(
        'session_id, patient_id, patient_level_id, level_id, session_date, valid_attempts, total_attempts, invalid_attempts, compliance_percent, max_volume, avg_volume, avg_hold_seconds, completed, perfect, interrupted',
      )
      .order('session_id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as SessionRecord[];
  }
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
  if (supabase != null) {
    const { error } = await supabase.from('sessions').upsert(rows, { onConflict: 'session_id' });
    if (error) throw error;
    return;
  }
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.sessionsJson, JSON.stringify(rows));
}

export async function readAllAttempts(): Promise<AttemptRecord[]> {
  if (supabase != null) {
    const { data, error } = await supabase
      .from('attempts')
      .select('attempt_id, session_id, hold_ms, peak_volume, valid, created_at')
      .order('attempt_id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as AttemptRecord[];
  }
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
  if (supabase != null) {
    const { error } = await supabase.from('attempts').upsert(rows, { onConflict: 'attempt_id' });
    if (error) throw error;
    return;
  }
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.attemptsJson, JSON.stringify(rows));
}
