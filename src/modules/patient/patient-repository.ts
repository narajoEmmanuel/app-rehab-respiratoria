/**
 * Purpose: Low-level persistence for the local `pacientes` collection.
 * Module: patient
 * Dependencies: AsyncStorage
 * Notes: Keeps JSON list; business rules live in patient-service.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/src/lib/supabase';
import { PATIENT_STORAGE_KEYS } from '@/src/modules/patient/storage-keys';
import type { PatientRecord } from '@/src/modules/patient/types';
import { getErrorMessage } from '@/src/shared/utils/get-error-message';

function normalizeClave(clave: string): string {
  return clave.trim().toUpperCase();
}

/** Solo usa Supabase cuando el build tiene auth en la nube explícitamente activada. */
function isCloudPatientStoreEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_CLOUD_AUTH === 'true' && supabase != null;
}

function throwRepositoryError(context: string, error: unknown): never {
  console.error(`[ERROR DETALLE] ${context}`, error);
  throw new Error(`${context}: ${getErrorMessage(error)}`);
}

function getCloudSupabaseClient() {
  if (!isCloudPatientStoreEnabled() || supabase == null) {
    throw new Error('Supabase no está disponible en este modo.');
  }
  return supabase;
}

export async function readAllPatients(): Promise<PatientRecord[]> {
  if (isCloudPatientStoreEnabled()) {
    const client = getCloudSupabaseClient();
    const { data, error } = await client
      .from('patients')
      .select(
        'patient_id, unique_code, name, age, current_level_id, streak_count, last_completed_date, registration_date',
      )
      .order('patient_id', { ascending: true });
    if (error) throwRepositoryError('No se pudieron leer los pacientes', error);
    return (data ?? []).map((item) => ({
      paciente_id: item.patient_id,
      clave: item.unique_code,
      nombre_completo: item.name,
      edad: item.age,
      current_level_id: item.current_level_id,
      racha_actual: item.streak_count ?? 0,
      ultima_fecha_cumplida: item.last_completed_date ?? null,
      fecha_creacion: item.registration_date,
    }));
  }
  const raw = await AsyncStorage.getItem(PATIENT_STORAGE_KEYS.patientsJson);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as PatientRecord[]).map((item) => ({
      ...item,
      current_level_id: item.current_level_id ?? null,
    }));
  } catch {
    return [];
  }
}

export async function writeAllPatients(patients: PatientRecord[]): Promise<void> {
  if (isCloudPatientStoreEnabled()) {
    const payload = patients.map((item) => ({
      patient_id: item.paciente_id,
      unique_code: item.clave,
      name: item.nombre_completo,
      age: item.edad,
      registration_date: item.fecha_creacion,
      current_level_id: item.current_level_id,
      status: 'active',
      streak_count: item.racha_actual,
      last_completed_date: item.ultima_fecha_cumplida,
    }));
    const { error } = await getCloudSupabaseClient().from('patients').upsert(payload, { onConflict: 'patient_id' });
    if (error) throwRepositoryError('No se pudieron guardar los pacientes', error);
    return;
  }
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.patientsJson, JSON.stringify(patients));
}

export async function readPatientById(patientId: number): Promise<PatientRecord | null> {
  if (isCloudPatientStoreEnabled()) {
    const { data, error } = await getCloudSupabaseClient()
      .from('patients')
      .select(
        'patient_id, unique_code, name, age, current_level_id, streak_count, last_completed_date, registration_date',
      )
      .eq('patient_id', patientId)
      .maybeSingle();
    if (error) throwRepositoryError('No se pudo leer el paciente', error);
    if (!data) return null;
    return {
      paciente_id: data.patient_id,
      clave: data.unique_code,
      nombre_completo: data.name,
      edad: data.age,
      current_level_id: data.current_level_id,
      racha_actual: data.streak_count ?? 0,
      ultima_fecha_cumplida: data.last_completed_date ?? null,
      fecha_creacion: data.registration_date,
    };
  }
  const all = await readAllPatients();
  return all.find((item) => item.paciente_id === patientId) ?? null;
}

export async function findPatientByClave(clave: string): Promise<PatientRecord | undefined> {
  const key = normalizeClave(clave);
  if (isCloudPatientStoreEnabled()) {
    const { data, error } = await getCloudSupabaseClient()
      .from('patients')
      .select(
        'patient_id, unique_code, name, age, current_level_id, streak_count, last_completed_date, registration_date',
      )
      .eq('unique_code', key)
      .maybeSingle();
    if (error) throwRepositoryError('No se pudo buscar el paciente por clave', error);
    if (!data) return undefined;
    return {
      paciente_id: data.patient_id,
      clave: data.unique_code,
      nombre_completo: data.name,
      edad: data.age,
      current_level_id: data.current_level_id,
      racha_actual: data.streak_count ?? 0,
      ultima_fecha_cumplida: data.last_completed_date ?? null,
      fecha_creacion: data.registration_date,
    };
  }
  const all = await readAllPatients();
  return all.find((p) => p.clave.toUpperCase() === key);
}

export async function appendPatient(patient: PatientRecord): Promise<void> {
  if (isCloudPatientStoreEnabled()) {
    const { error } = await getCloudSupabaseClient().from('patients').insert({
      patient_id: patient.paciente_id,
      unique_code: patient.clave,
      name: patient.nombre_completo,
      age: patient.edad,
      registration_date: patient.fecha_creacion,
      current_level_id: patient.current_level_id,
      status: 'active',
      streak_count: patient.racha_actual,
      last_completed_date: patient.ultima_fecha_cumplida,
    });
    if (error) throwRepositoryError('No se pudo crear el paciente', error);
    return;
  }
  const all = await readAllPatients();
  all.push(patient);
  await writeAllPatients(all);
}

export async function updatePatient(patientId: number, updater: (prev: PatientRecord) => PatientRecord): Promise<PatientRecord | null> {
  if (isCloudPatientStoreEnabled()) {
    const { data, error } = await getCloudSupabaseClient()
      .from('patients')
      .select(
        'patient_id, unique_code, name, age, current_level_id, streak_count, last_completed_date, registration_date',
      )
      .eq('patient_id', patientId)
      .maybeSingle();
    if (error) throwRepositoryError('No se pudo leer el paciente para actualizar', error);
    if (!data) return null;
    const current: PatientRecord = {
      paciente_id: data.patient_id,
      clave: data.unique_code,
      nombre_completo: data.name,
      edad: data.age,
      current_level_id: data.current_level_id,
      racha_actual: data.streak_count ?? 0,
      ultima_fecha_cumplida: data.last_completed_date ?? null,
      fecha_creacion: data.registration_date,
    };
    const next = updater(current);
    const { error: updateError } = await getCloudSupabaseClient()
      .from('patients')
      .update({
        unique_code: next.clave,
        name: next.nombre_completo,
        age: next.edad,
        registration_date: next.fecha_creacion,
        current_level_id: next.current_level_id,
        streak_count: next.racha_actual,
        last_completed_date: next.ultima_fecha_cumplida,
      })
      .eq('patient_id', patientId);
    if (updateError) throwRepositoryError('No se pudo actualizar el paciente', updateError);
    return next;
  }
  const all = await readAllPatients();
  const index = all.findIndex((item) => item.paciente_id === patientId);
  if (index < 0) return null;
  const next = updater(all[index]);
  all[index] = next;
  await writeAllPatients(all);
  return next;
}

export async function readCurrentClave(): Promise<string | null> {
  return AsyncStorage.getItem(PATIENT_STORAGE_KEYS.currentPatientClave);
}

export async function writeCurrentClave(clave: string): Promise<void> {
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.currentPatientClave, normalizeClave(clave));
}

export async function clearCurrentClave(): Promise<void> {
  await AsyncStorage.removeItem(PATIENT_STORAGE_KEYS.currentPatientClave);
}

export { normalizeClave };
