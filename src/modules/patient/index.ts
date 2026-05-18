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
  normalizePatientDisplayName,
  LOCAL_PATIENT_DISPLAY_NAME,
} from '@/src/modules/patient/patient-display';
export {
  deleteCurrentPatientLocalData,
  deletePatientLocalData,
  type DeletePatientLocalDataResult,
} from '@/src/modules/patient/patient-delete-service';
export {
  assertPatientFullyRemoved,
  verifyPatientFullyRemoved,
  type PatientDeletionVerification,
} from '@/src/modules/patient/patient-delete-verification';
export { allocateNextPatientId, bumpPatientIdSequenceFloor } from '@/src/modules/patient/patient-id-allocation';
export {
  createLocalPatientProfile,
  createPatient,
  generatePatientKey,
  getCurrentPatient,
  getPatientByClave,
  listLocalPatientProfiles,
  logoutPatient,
  normalizeClave,
  saveCurrentPatient,
  updatePatientCurrentLevel,
} from '@/src/modules/patient/patient-service';
export {
  PatientSessionProvider,
  usePatientSession,
} from '@/src/modules/patient/context/PatientSessionContext';
