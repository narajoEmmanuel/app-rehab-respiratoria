/**
 * Asignación monotónica de paciente_id local (nunca reutiliza IDs eliminados).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { readAllPatients } from '@/src/modules/patient/patient-repository';
import { PATIENT_STORAGE_KEYS } from '@/src/modules/patient/storage-keys';

function parseSequenceValue(raw: string | null): number {
  if (raw == null || raw === '') return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function readPatientIdSequence(): Promise<number> {
  const raw = await AsyncStorage.getItem(PATIENT_STORAGE_KEYS.patientIdSequence);
  return parseSequenceValue(raw);
}

async function writePatientIdSequence(value: number): Promise<void> {
  await AsyncStorage.setItem(PATIENT_STORAGE_KEYS.patientIdSequence, String(value));
}

/** Garantiza que el siguiente ID asignado sea estrictamente mayor que `minId`. */
export async function bumpPatientIdSequenceFloor(minId: number): Promise<void> {
  if (!Number.isFinite(minId) || minId < 0) return;
  const current = await readPatientIdSequence();
  const nextFloor = Math.max(current, Math.floor(minId));
  await writePatientIdSequence(nextFloor);
}

/**
 * Siguiente paciente_id local: max(secuencia persistida, max en lista) + 1.
 * La secuencia no decrece al eliminar pacientes.
 */
export async function allocateNextPatientId(): Promise<number> {
  const patients = await readAllPatients();
  const maxFromList =
    patients.length === 0 ? 0 : Math.max(...patients.map((p) => p.paciente_id));

  const seq = await readPatientIdSequence();
  const next = Math.max(seq, maxFromList) + 1;
  await writePatientIdSequence(next);
  return next;
}
