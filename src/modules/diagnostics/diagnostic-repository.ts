import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCloudSupabaseClient, useCloudDataStore } from '@/src/lib/cloud-data-store';
import { PATIENT_STORAGE_KEYS } from '@/src/modules/patient/storage-keys';

import type { DiagnosticRecord, PatientLevelRecord } from './types';

async function readDiagnosticsFromLocalStorage(): Promise<DiagnosticRecord[]> {
  const raw = await AsyncStorage.getItem(PATIENT_STORAGE_KEYS.diagnosticsJson);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DiagnosticRecord[]) : [];
  } catch {
    return [];
  }
}

async function readPatientLevelsFromLocalStorage(): Promise<PatientLevelRecord[]> {
  const raw = await AsyncStorage.getItem(PATIENT_STORAGE_KEYS.patientLevelsJson);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PatientLevelRecord[]) : [];
  } catch {
    return [];
  }
}

export async function readAllDiagnostics(): Promise<DiagnosticRecord[]> {
  if (!useCloudDataStore()) {
    return readDiagnosticsFromLocalStorage();
  }
  try {
    const { data, error } = await getCloudSupabaseClient()
      .from('diagnostics')
      .select('diagnostic_id, patient_id, diagnostic_number, diagnostic_date, max_inspiratory_volume')
      .order('diagnostic_id', { ascending: true });
    if (error) {
      console.warn('[diagnostics] cloud read failed, using local', error);
      return readDiagnosticsFromLocalStorage();
    }
    return (data ?? []) as DiagnosticRecord[];
  } catch (error) {
    console.warn('[diagnostics] cloud read failed, using local', error);
    return readDiagnosticsFromLocalStorage();
  }
}

export async function writeAllDiagnostics(rows: DiagnosticRecord[]): Promise<void> {
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.diagnosticsJson, JSON.stringify(rows));
  if (!useCloudDataStore()) return;
  try {
    const { error } = await getCloudSupabaseClient()
      .from('diagnostics')
      .upsert(rows, { onConflict: 'diagnostic_id' });
    if (error) console.warn('[diagnostics] cloud write failed', error);
  } catch (error) {
    console.warn('[diagnostics] cloud write failed', error);
  }
}

export async function readAllPatientLevels(): Promise<PatientLevelRecord[]> {
  if (!useCloudDataStore()) {
    return readPatientLevelsFromLocalStorage();
  }
  try {
    const { data, error } = await getCloudSupabaseClient()
      .from('patient_levels')
      .select(
        'patient_level_id, patient_id, level_id, diagnostic_id, target_volume, level_status, perfect_sessions_completed, sessions_completed_today, last_session_date',
      )
      .order('patient_level_id', { ascending: true });
    if (error) {
      console.warn('[HISTORY] Network ignored:', error);
      return readPatientLevelsFromLocalStorage();
    }
    return (data ?? []) as PatientLevelRecord[];
  } catch (error) {
    console.warn('[HISTORY] Network ignored:', error);
    return readPatientLevelsFromLocalStorage();
  }
}

export async function writeAllPatientLevels(rows: PatientLevelRecord[]): Promise<void> {
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.patientLevelsJson, JSON.stringify(rows));
  if (!useCloudDataStore()) return;
  try {
    const patientIds = [...new Set(rows.map((item) => item.patient_id))];
    const client = getCloudSupabaseClient();
    for (const patientId of patientIds) {
      const { error: deleteError } = await client.from('patient_levels').delete().eq('patient_id', patientId);
      if (deleteError) {
        console.warn('[patient_levels] cloud delete failed', deleteError);
        continue;
      }
      const subset = rows.filter((item) => item.patient_id === patientId);
      if (subset.length > 0) {
        const { error: insertError } = await client.from('patient_levels').insert(subset);
        if (insertError) console.warn('[patient_levels] cloud insert failed', insertError);
      }
    }
  } catch (error) {
    console.warn('[patient_levels] cloud write failed', error);
  }
}
