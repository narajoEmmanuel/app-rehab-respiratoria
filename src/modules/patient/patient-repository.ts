/**
 * Purpose: Low-level persistence for the local `pacientes` collection.
 * Module: patient
 * Dependencies: AsyncStorage
 * Notes: Keeps JSON list; business rules live in patient-service.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { PATIENT_STORAGE_KEYS } from '@/src/modules/patient/storage-keys';
import type { PatientRecord } from '@/src/modules/patient/types';

function normalizeClave(clave: string): string {
  return clave.trim().toUpperCase();
}

export async function readAllPatients(): Promise<PatientRecord[]> {
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
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.patientsJson, JSON.stringify(patients));
}

export async function findPatientByClave(clave: string): Promise<PatientRecord | undefined> {
  const key = normalizeClave(clave);
  const all = await readAllPatients();
  return all.find((p) => p.clave.toUpperCase() === key);
}

export async function appendPatient(patient: PatientRecord): Promise<void> {
  const all = await readAllPatients();
  all.push(patient);
  await writeAllPatients(all);
}

export async function updatePatient(patientId: number, updater: (prev: PatientRecord) => PatientRecord): Promise<PatientRecord | null> {
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
