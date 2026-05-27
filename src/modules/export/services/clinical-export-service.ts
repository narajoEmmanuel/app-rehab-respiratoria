/**
 * Purpose: Aggregate patient, diagnostics, levels and sessions for clinical export.
 * Module: export
 */

import Constants from 'expo-constants';

import { readAllDiagnostics, readAllPatientLevels } from '@/src/modules/diagnostics/diagnostic-repository';
import { loadActiveVolumeEstimationContext } from '@/src/modules/device/volume-estimation/volume-estimation-service';
import { readPatientById } from '@/src/modules/patient/patient-repository';

import type { CalibrationExportBlock, ClinicalExportSnapshot } from '@/src/modules/export/types/export-record';
import { getPatientExportData } from '@/src/modules/export/services/session-export-service';

export const CLINICAL_EXPORT_FORMAT_VERSION = '2.3.0';
export const CLINICAL_EXPORT_SCHEMA_VERSION = '1.0.0';

function getAppVersion(): string {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '';
}

async function loadCalibrationExportBlock(): Promise<CalibrationExportBlock> {
  try {
    const loaded = await loadActiveVolumeEstimationContext();
    const model = loaded.activeModel ?? null;
    return {
      calibration_profile_id: loaded.calibrationProfile?.id ?? null,
      calibration_profile_active: loaded.calibrationProfile ?? null,
      active_model_id: model?.id ?? null,
      model_kind: model?.modelKind ?? null,
      model_metrics: model?.recommendedModel?.metrics
        ? {
            r2: model.recommendedModel.metrics.rSquared,
            rmse_ml: model.recommendedModel.metrics.rmseMl,
            mae_ml: model.recommendedModel.metrics.maeMl,
            max_abs_error_ml: model.recommendedModel.metrics.maxAbsErrorMl,
          }
        : null,
      calibration_models: model,
      calibration_exported_at: new Date().toISOString(),
    };
  } catch {
    return {
      calibration_profile_id: null,
      calibration_profile_active: null,
      active_model_id: null,
      model_kind: null,
      model_metrics: null,
      calibration_models: null,
      calibration_exported_at: new Date().toISOString(),
    };
  }
}

function extractLatestFirmwareVersion(
  sessions: { session: { firmware_version?: string | null } }[],
): string | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const fw = sessions[i].session.firmware_version;
    if (fw) return fw;
  }
  return null;
}

export async function getClinicalExportSnapshot(patientId: number): Promise<ClinicalExportSnapshot> {
  const [patient, allDiagnostics, allLevels, sessionBundle, calibration] = await Promise.all([
    readPatientById(patientId),
    readAllDiagnostics(),
    readAllPatientLevels(),
    getPatientExportData(patientId),
    loadCalibrationExportBlock(),
  ]);

  const firmwareVersion = extractLatestFirmwareVersion(sessionBundle.sessions);

  return {
    export_version: CLINICAL_EXPORT_FORMAT_VERSION,
    export_schema_version: CLINICAL_EXPORT_SCHEMA_VERSION,
    app_version: getAppVersion(),
    firmware_version: firmwareVersion,
    exported_at: new Date().toISOString(),
    patient,
    diagnostics: allDiagnostics.filter((d) => d.patient_id === patientId),
    patient_levels: allLevels.filter((l) => l.patient_id === patientId),
    sessions: sessionBundle.sessions,
    calibration,
  };
}
