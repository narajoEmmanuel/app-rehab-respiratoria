import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCloudSupabaseClient, useCloudDataStore } from '@/src/lib/cloud-data-store';
import { PATIENT_STORAGE_KEYS } from '@/src/modules/patient/storage-keys';
import type { AttemptRecord, SessionRecord } from '@/src/modules/session/types/session-progress';

async function readSessionsFromLocalStorage(): Promise<SessionRecord[]> {
  const raw = await AsyncStorage.getItem(PATIENT_STORAGE_KEYS.sessionsJson);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

async function readAttemptsFromLocalStorage(): Promise<AttemptRecord[]> {
  const raw = await AsyncStorage.getItem(PATIENT_STORAGE_KEYS.attemptsJson);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AttemptRecord[]) : [];
  } catch {
    return [];
  }
}

export async function readAllSessions(): Promise<SessionRecord[]> {
  if (!useCloudDataStore()) {
    return readSessionsFromLocalStorage();
  }
  try {
    const { data, error } = await getCloudSupabaseClient()
      .from('sessions')
      .select(
        'session_id, patient_id, patient_level_id, level_id, session_date, valid_attempts, total_attempts, invalid_attempts, compliance_percent, max_volume, avg_volume, avg_hold_seconds, completed, perfect, interrupted, input_mode, data_source, is_practice_session, official_validation_source, max_sensor_estimated_volume_ml, max_sensor_u95_ml, calibration_profile_id, active_model_id, model_kind, spirometer_device_id, calibration_created_at, calibration_updated_at',
      )
      .order('session_id', { ascending: true });
    if (error) {
      console.warn('[HISTORY] Network ignored:', error);
      return readSessionsFromLocalStorage();
    }
    return (data ?? []) as SessionRecord[];
  } catch (error) {
    console.warn('[HISTORY] Network ignored:', error);
    return readSessionsFromLocalStorage();
  }
}

export async function writeAllSessions(rows: SessionRecord[]): Promise<void> {
  if (!useCloudDataStore()) {
    await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.sessionsJson, JSON.stringify(rows));
    return;
  }
  try {
    const { error } = await getCloudSupabaseClient()
      .from('sessions')
      .upsert(rows, { onConflict: 'session_id' });
    if (error) {
      console.warn('[session-progress] cloud sessions write failed', error);
    }
  } catch (error) {
    console.warn('[session-progress] cloud sessions write failed', error);
  }
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.sessionsJson, JSON.stringify(rows));
}

export async function readAllAttempts(): Promise<AttemptRecord[]> {
  if (!useCloudDataStore()) {
    return readAttemptsFromLocalStorage();
  }
  try {
    const { data, error } = await getCloudSupabaseClient()
      .from('attempts')
      .select(
        'attempt_id, session_id, hold_ms, peak_volume, valid, created_at, input_mode, data_source, official_volume_ml, sensor_estimated_volume_ml, sensor_u95_ml, sensor_confidence_label, sensor_volume_reached_conservatively, sensor_attempt_status, distance_mm, raw_distance_mm, filtered_distance_mm, in_calibrated_range, clamped, calibration_profile_id, active_model_id, model_kind',
      )
      .order('attempt_id', { ascending: true });
    if (error) {
      console.warn('[HISTORY] Network ignored:', error);
      return readAttemptsFromLocalStorage();
    }
    return (data ?? []) as AttemptRecord[];
  } catch (error) {
    console.warn('[HISTORY] Network ignored:', error);
    return readAttemptsFromLocalStorage();
  }
}

export async function writeAllAttempts(rows: AttemptRecord[]): Promise<void> {
  if (!useCloudDataStore()) {
    await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.attemptsJson, JSON.stringify(rows));
    return;
  }
  try {
    const { error } = await getCloudSupabaseClient()
      .from('attempts')
      .upsert(rows, { onConflict: 'attempt_id' });
    if (error) {
      console.warn('[session-progress] cloud attempts write failed', error);
    }
  } catch (error) {
    console.warn('[session-progress] cloud attempts write failed', error);
  }
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.attemptsJson, JSON.stringify(rows));
}
