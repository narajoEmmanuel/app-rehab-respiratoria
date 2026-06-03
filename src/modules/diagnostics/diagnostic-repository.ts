import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCloudSupabaseClient, isCloudDataStoreEnabled } from '@/src/lib/cloud-data-store';
import { PATIENT_STORAGE_KEYS } from '@/src/modules/patient/storage-keys';

import type { DiagnosticRecord, PatientLevelRecord } from './types';

/** Columnas aceptadas por Supabase `diagnostics` (sin attempts/metadata). */
type CloudDiagnosticRow = Pick<
  DiagnosticRecord,
  | 'diagnostic_id'
  | 'patient_id'
  | 'diagnostic_number'
  | 'diagnostic_date'
  | 'max_inspiratory_volume'
>;

function toCloudDiagnosticRow(row: DiagnosticRecord): CloudDiagnosticRow {
  return {
    diagnostic_id: row.diagnostic_id,
    patient_id: row.patient_id,
    diagnostic_number: row.diagnostic_number,
    diagnostic_date: row.diagnostic_date,
    max_inspiratory_volume: row.max_inspiratory_volume,
  };
}

/** Intentos y metadatos Fase 2 viven en AsyncStorage; cloud solo sincroniza VIM base. */
function mergeDiagnosticLocalExtensions(
  cloudRow: DiagnosticRecord,
  localRow: DiagnosticRecord | undefined,
): DiagnosticRecord {
  if (!localRow) return cloudRow;
  return {
    ...cloudRow,
    attempts: localRow.attempts ?? cloudRow.attempts,
    valid_attempts_count: localRow.valid_attempts_count ?? cloudRow.valid_attempts_count,
    vim_source: localRow.vim_source ?? cloudRow.vim_source,
    consistency_summary: localRow.consistency_summary ?? cloudRow.consistency_summary,
    input_mode: localRow.input_mode ?? cloudRow.input_mode,
  };
}

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
  const local = await readDiagnosticsFromLocalStorage();
  if (!isCloudDataStoreEnabled()) {
    return local;
  }
  try {
    const { data, error } = await getCloudSupabaseClient()
      .from('diagnostics')
      .select('diagnostic_id, patient_id, diagnostic_number, diagnostic_date, max_inspiratory_volume')
      .order('diagnostic_id', { ascending: true });
    if (error) {
      console.warn('[diagnostics] cloud read failed, using local', error);
      return local;
    }
    const cloud = (data ?? []) as DiagnosticRecord[];
    const localById = new Map(local.map((row) => [row.diagnostic_id, row]));
    const cloudIds = new Set(cloud.map((row) => row.diagnostic_id));
    const mergedCloud = cloud.map((row) =>
      mergeDiagnosticLocalExtensions(row, localById.get(row.diagnostic_id)),
    );
    const localOnly = local.filter((row) => !cloudIds.has(row.diagnostic_id));
    return [...mergedCloud, ...localOnly];
  } catch (error) {
    console.warn('[diagnostics] cloud read failed, using local', error);
    return local;
  }
}

export async function writeAllDiagnostics(rows: DiagnosticRecord[]): Promise<void> {
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.diagnosticsJson, JSON.stringify(rows));
  if (!isCloudDataStoreEnabled()) return;
  try {
    const cloudRows = rows.map(toCloudDiagnosticRow);
    const { error } = await getCloudSupabaseClient()
      .from('diagnostics')
      .upsert(cloudRows, { onConflict: 'diagnostic_id' });
    if (error) console.warn('[diagnostics] cloud write failed', error);
  } catch (error) {
    console.warn('[diagnostics] cloud write failed', error);
  }
}

export async function readAllPatientLevels(): Promise<PatientLevelRecord[]> {
  if (!isCloudDataStoreEnabled()) {
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
  if (!isCloudDataStoreEnabled()) return;
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
