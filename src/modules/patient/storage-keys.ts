/**
 * Purpose: AsyncStorage keys for patient data (single source of truth for prefixes).
 * Module: patient
 * Dependencies: none
 */

export const PATIENT_STORAGE_KEYS = {
  patientsJson: '@rehab/patients_v1',
  currentPatientClave: '@rehab/current_patient_clave_v1',
} as const;
