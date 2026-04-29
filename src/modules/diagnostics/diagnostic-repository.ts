import AsyncStorage from '@react-native-async-storage/async-storage';

import { PATIENT_STORAGE_KEYS } from '@/src/modules/patient/storage-keys';

import type { DiagnosticRecord, PatientLevelRecord } from './types';

export async function readAllDiagnostics(): Promise<DiagnosticRecord[]> {
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
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.diagnosticsJson, JSON.stringify(rows));
}

export async function readAllPatientLevels(): Promise<PatientLevelRecord[]> {
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
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.patientLevelsJson, JSON.stringify(rows));
}
