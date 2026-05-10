/**
 * Purpose: Stable local-only patient for offline_sensor_test mode (ESP32 / no internet).
 * Module: patient
 */
import { createDiagnostic, generatePatientLevels } from '@/src/modules/diagnostics/diagnostic-service';
import { appendPatient, findPatientByClave } from '@/src/modules/patient/patient-repository';
import type { PatientRecord } from '@/src/modules/patient/types';

export const OFFLINE_SENSOR_TEST_CLAVE = 'LOCAL_SENSOR_TEST';

/** Fixed id reserved for the offline test patient (local storage only in offline mode). */
const OFFLINE_SENSOR_TEST_PACIENTE_ID = 900001;

const OFFLINE_DEFAULT: Omit<PatientRecord, 'fecha_creacion'> = {
  paciente_id: OFFLINE_SENSOR_TEST_PACIENTE_ID,
  clave: OFFLINE_SENSOR_TEST_CLAVE,
  nombre_completo: 'Paciente local de prueba',
  edad: 30,
  current_level_id: 'level-1',
  racha_actual: 0,
  ultima_fecha_cumplida: null,
};

/**
 * Ensures the offline test patient exists in local patient storage and returns it.
 * Call only after `offline_sensor_test` mode is persisted so repositories skip Supabase.
 */
export async function ensureOfflineSensorTestPatient(): Promise<PatientRecord> {
  const existing = await findPatientByClave(OFFLINE_SENSOR_TEST_CLAVE);
  if (existing) {
    return existing;
  }
  const now = new Date().toISOString();
  const row: PatientRecord = {
    ...OFFLINE_DEFAULT,
    fecha_creacion: now,
  };
  await appendPatient(row);
  const diag = await createDiagnostic(OFFLINE_SENSOR_TEST_PACIENTE_ID, 1500);
  await generatePatientLevels(OFFLINE_SENSOR_TEST_PACIENTE_ID, diag.diagnostic_id, 1500);
  return row;
}
