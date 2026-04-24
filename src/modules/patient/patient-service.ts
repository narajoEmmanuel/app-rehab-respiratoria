/**
 * Purpose: Public API for local patients (clave PAC###, sesión actual).
 * Module: patient
 * Dependencies: patient-repository
 */

import {
  appendPatient,
  clearCurrentClave,
  findPatientByClave,
  normalizeClave,
  readAllPatients,
  readCurrentClave,
  writeCurrentClave,
} from '@/src/modules/patient/patient-repository';
import type { PatientRecord } from '@/src/modules/patient/types';

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

export async function createPatient(nombreCompleto: string, edad: number): Promise<PatientRecord> {
  const trimmedName = nombreCompleto.trim();
  const patients = await readAllPatients();
  const nextId =
    patients.length === 0 ? 1 : Math.max(...patients.map((p) => p.paciente_id)) + 1;
  const clave = await generatePatientKey();
  const now = new Date().toISOString();

  const row: PatientRecord = {
    paciente_id: nextId,
    clave,
    nombre_completo: trimmedName,
    edad,
    racha_actual: 0,
    ultima_fecha_cumplida: null,
    fecha_creacion: now,
  };

  await appendPatient(row);
  return row;
}

export async function saveCurrentPatient(patient: PatientRecord): Promise<void> {
  await writeCurrentClave(patient.clave);
}

export async function getCurrentPatient(): Promise<PatientRecord | null> {
  const clave = await readCurrentClave();
  if (!clave) return null;
  return getPatientByClave(clave);
}

export async function logoutPatient(): Promise<void> {
  await clearCurrentClave();
}

export { normalizeClave };
