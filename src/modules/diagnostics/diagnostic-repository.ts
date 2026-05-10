import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/src/lib/supabase';
import { shouldUseCloudData } from '@/src/modules/app-mode/should-use-cloud-data';
import { PATIENT_STORAGE_KEYS } from '@/src/modules/patient/storage-keys';

import type { DiagnosticRecord, PatientLevelRecord } from './types';

export async function readAllDiagnostics(): Promise<DiagnosticRecord[]> {
  if ((await shouldUseCloudData()) && supabase != null) {
    const { data, error } = await supabase
      .from('diagnostics')
      .select('diagnostic_id, patient_id, diagnostic_number, diagnostic_date, max_inspiratory_volume')
      .order('diagnostic_id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as DiagnosticRecord[];
  }
  const raw = await AsyncStorage.getItem(PATIENT_STORAGE_KEYS.diagnosticsJson);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DiagnosticRecord[]) : [];
  } catch {
    return [];
  }
}

export async function writeAllDiagnostics(rows: DiagnosticRecord[]): Promise<void> {
  if ((await shouldUseCloudData()) && supabase != null) {
    const { error } = await supabase.from('diagnostics').upsert(rows, { onConflict: 'diagnostic_id' });
    if (error) throw error;
    return;
  }
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.diagnosticsJson, JSON.stringify(rows));
}

export async function readAllPatientLevels(): Promise<PatientLevelRecord[]> {
  if ((await shouldUseCloudData()) && supabase != null) {
    const { data, error } = await supabase
      .from('patient_levels')
      .select(
        'patient_level_id, patient_id, level_id, diagnostic_id, target_volume, level_status, perfect_sessions_completed, sessions_completed_today, last_session_date',
      )
      .order('patient_level_id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as PatientLevelRecord[];
  }
  const raw = await AsyncStorage.getItem(PATIENT_STORAGE_KEYS.patientLevelsJson);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PatientLevelRecord[]) : [];
  } catch {
    return [];
  }
}

export async function writeAllPatientLevels(rows: PatientLevelRecord[]): Promise<void> {
  if ((await shouldUseCloudData()) && supabase != null) {
    const patientIds = [...new Set(rows.map((item) => item.patient_id))];
    for (const patientId of patientIds) {
      const { error: deleteError } = await supabase.from('patient_levels').delete().eq('patient_id', patientId);
      if (deleteError) throw deleteError;
      const subset = rows.filter((item) => item.patient_id === patientId);
      if (subset.length > 0) {
        const { error: insertError } = await supabase.from('patient_levels').insert(subset);
        if (insertError) throw insertError;
      }
    }
    return;
  }
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.patientLevelsJson, JSON.stringify(rows));
}
