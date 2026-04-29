/**
 * Purpose: Barrel exports for the patient module.
 * Module: patient
 */

export type {
  IntentoRecord,
  PatientRecord,
  PlanSemanalRecord,
  ProgresoDiarioRecord,
  SesionProgramadaRecord,
  SesionRealizadaRecord,
} from '@/src/modules/patient/types';
export { PATIENT_STORAGE_KEYS } from '@/src/modules/patient/storage-keys';
export {
  createPatient,
  generatePatientKey,
  getCurrentPatient,
  getPatientByClave,
  logoutPatient,
  normalizeClave,
  saveCurrentPatient,
  updatePatientCurrentLevel,
} from '@/src/modules/patient/patient-service';
export {
  PatientSessionProvider,
  usePatientSession,
} from '@/src/modules/patient/context/PatientSessionContext';
