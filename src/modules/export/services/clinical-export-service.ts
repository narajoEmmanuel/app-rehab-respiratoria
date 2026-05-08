/**
 * Purpose: Aggregate patient, diagnostics, levels and sessions for clinical export.
 * Module: export
 */

import { readAllDiagnostics, readAllPatientLevels } from '@/src/modules/diagnostics/diagnostic-repository';
import { readPatientById } from '@/src/modules/patient/patient-repository';

import type { ClinicalExportSnapshot } from '@/src/modules/export/types/export-record';
import { getPatientExportData } from '@/src/modules/export/services/session-export-service';

export const CLINICAL_EXPORT_FORMAT_VERSION = '2.0.0';

export async function getClinicalExportSnapshot(patientId: number): Promise<ClinicalExportSnapshot> {
  const [patient, allDiagnostics, allLevels, sessionBundle] = await Promise.all([
    readPatientById(patientId),
    readAllDiagnostics(),
    readAllPatientLevels(),
    getPatientExportData(patientId),
  ]);

  return {
    export_version: CLINICAL_EXPORT_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    patient,
    diagnostics: allDiagnostics.filter((d) => d.patient_id === patientId),
    patient_levels: allLevels.filter((l) => l.patient_id === patientId),
    sessions: sessionBundle.sessions,
  };
}
