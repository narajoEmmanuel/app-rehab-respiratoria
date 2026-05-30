/**
 * Purpose: Public API for local patients (clave PAC###, sesión actual).
 * Module: patient
 * Dependencies: patient-repository
 */

import { allocateNextPatientId } from '@/src/modules/patient/patient-id-allocation';
import {
  appendPatient,
  clearCurrentClave,
  findPatientByClave,
  normalizeClave,
  readAllPatients,
  readCurrentClave,
  updatePatient,
  writeCurrentClave,
} from '@/src/modules/patient/patient-repository';
import {
  isLegacyPatientDisplayName,
  LOCAL_PATIENT_DISPLAY_NAME,
} from '@/src/modules/patient/patient-display';
import type { PatientRecord } from '@/src/modules/patient/types';
import type { LevelId } from '@/src/modules/levels/types/level-progress';

const PAC_REGEX = /^PAC(\d+)$/i;

/**
 * Calcula la siguiente clave PAC001, PAC002… según pacientes existentes.
 */
export async function generatePatientKey(): Promise<string> {
  const patients = await readAllPatients();
  let max = 0;
  for (const p of patients) {
    const m = PAC_REGEX.exec(p.clave.trim());
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  const next = max + 1;
  return `PAC${String(next).padStart(3, '0')}`;
}

export async function getPatientByClave(clave: string): Promise<PatientRecord | null> {
  const found = await findPatientByClave(clave);
  return found ?? null;
}

export async function getPatientByCode(code: string): Promise<PatientRecord | null> {
  return getPatientByClave(code);
}

/**
 * Registro local: AsyncStorage únicamente (no Supabase, calibración ni sensor).
 * Deja al paciente como activo en la sesión local.
 */
export async function createPatientLocal(nombreCompleto: string, edad: number): Promise<PatientRecord> {
  const trimmedName = nombreCompleto.trim();
  if (trimmedName.length < 2) {
    throw new Error('Indica un nombre de al menos 2 caracteres.');
  }
  if (!Number.isFinite(edad) || edad < 1 || edad > 120) {
    throw new Error('Indica una edad entre 1 y 120 años.');
  }

  const nextId = await allocateNextPatientId();
  const clave = await generatePatientKey();
  const now = new Date().toISOString();

  const row: PatientRecord = {
    paciente_id: nextId,
    clave,
    nombre_completo: trimmedName,
    edad,
    current_level_id: null,
    racha_actual: 0,
    ultima_fecha_cumplida: null,
    fecha_creacion: now,
  };

  await appendPatient(row);
  await writeCurrentClave(row.clave);
  return row;
}

export async function createPatient(nombreCompleto: string, edad: number): Promise<PatientRecord> {
  return createPatientLocal(nombreCompleto, edad);
}

export async function saveCurrentPatient(patient: PatientRecord): Promise<void> {
  await writeCurrentClave(patient.clave);
}

async function persistLegacyDisplayNameMigration(patient: PatientRecord): Promise<PatientRecord> {
  if (!isLegacyPatientDisplayName(patient.nombre_completo)) {
    return patient;
  }
  const updated =
    (await updatePatient(patient.paciente_id, (prev) => ({
      ...prev,
      nombre_completo: LOCAL_PATIENT_DISPLAY_NAME,
    }))) ?? patient;
  return updated;
}

export async function getCurrentPatient(): Promise<PatientRecord | null> {
  const clave = await readCurrentClave();
  if (!clave) return null;
  const found = await getPatientByClave(clave);
  if (!found) {
    await clearCurrentClave();
    return null;
  }
  return persistLegacyDisplayNameMigration(found);
}

export async function listLocalPatientProfiles(): Promise<PatientRecord[]> {
  const patients = await readAllPatients();
  return [...patients].sort((a, b) => Date.parse(b.fecha_creacion) - Date.parse(a.fecha_creacion));
}

/** Crea un perfil local nuevo y lo deja como paciente actual (solo por acción explícita del usuario). */
export async function createLocalPatientProfile(): Promise<PatientRecord> {
  const row = await createPatient(LOCAL_PATIENT_DISPLAY_NAME, LOCAL_PROTOTYPE_AGE);
  await saveCurrentPatient(row);
  return row;
}

export async function logoutPatient(): Promise<void> {
  await clearCurrentClave();
}

const LOCAL_PROTOTYPE_AGE = 30;

/**
 * @deprecated No usar en bootstrap. Preferir createLocalPatientProfile() tras acción del usuario.
 */
export async function ensureLocalPrototypePatientRecord(): Promise<PatientRecord> {
  return createLocalPatientProfile();
}

export async function updatePatientCurrentLevel(patientId: number, levelId: LevelId): Promise<PatientRecord | null> {
  return updatePatient(patientId, (prev) => ({ ...prev, current_level_id: levelId }));
}

export { normalizeClave };
