/**
 * Purpose: AsyncStorage keys for patient data (single source of truth for prefixes).
 * Module: patient
 * Dependencies: none
 */

export const PATIENT_STORAGE_KEYS = {
  patientsJson: '@rehab/patients_v1',
  currentPatientClave: '@rehab/current_patient_clave_v1',
  diagnosticsJson: '@rehab/diagnostics_v1',
  patientLevelsJson: '@rehab/patient_levels_v1',
  sessionsJson: '@rehab/sessions_v1',
  attemptsJson: '@rehab/attempts_v1',
  profilePreferencesJson: '@rehab/profile_preferences_v1',
} as const;
