/**
 * Purpose: Aggregate patient, diagnostics, levels and sessions for clinical export.
 * Module: export
 */

import { readAllDiagnostics, readAllPatientLevels } from '@/src/modules/diagnostics/diagnostic-repository';
import { loadActiveVolumeEstimationContext } from '@/src/modules/device/volume-estimation/volume-estimation-service';
import { readPatientById } from '@/src/modules/patient/patient-repository';

import type { CalibrationExportBlock, ClinicalExportSnapshot } from '@/src/modules/export/types/export-record';
import { getPatientExportData } from '@/src/modules/export/services/session-export-service';

export const CLINICAL_EXPORT_FORMAT_VERSION = '2.2.0';

async function loadCalibrationExportBlock(): Promise<CalibrationExportBlock> {
  try {
    const loaded = await loadActiveVolumeEstimationContext();
    return {
      calibration_profile_active: loaded.calibrationProfile ?? null,
      calibration_models: loaded.activeModel ?? null,
      calibration_exported_at: new Date().toISOString(),
    };
  } catch {
    return {
      calibration_profile_active: null,
      calibration_models: null,
      calibration_exported_at: new Date().toISOString(),
    };
  }
}

export async function getClinicalExportSnapshot(patientId: number): Promise<ClinicalExportSnapshot> {
  const [patient, allDiagnostics, allLevels, sessionBundle, calibration] = await Promise.all([
    readPatientById(patientId),
    readAllDiagnostics(),
    readAllPatientLevels(),
    getPatientExportData(patientId),
    loadCalibrationExportBlock(),
  ]);

  return {
    export_version: CLINICAL_EXPORT_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    patient,
    diagnostics: allDiagnostics.filter((d) => d.patient_id === patientId),
    patient_levels: allLevels.filter((l) => l.patient_id === patientId),
    sessions: sessionBundle.sessions,
    calibration,
  };
}
