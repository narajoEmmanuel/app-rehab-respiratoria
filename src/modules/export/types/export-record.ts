import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import type { CalibrationModelKind } from '@/src/modules/device/calibration/calibration-model-types';
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';
import type { DiagnosticRecord, PatientLevelRecord } from '@/src/modules/diagnostics/types';
import type { PatientRecord } from '@/src/modules/patient/types';
import type { AttemptRecord, SessionRecord } from '@/src/modules/session/types/session-progress';

export type ExportSessionWithAttempts = {
  session: SessionRecord;
  attempts: AttemptRecord[];
};

export type PatientExportData = {
  export_version: string;
  exported_at: string;
  patient_id: number;
  sessions: ExportSessionWithAttempts[];
};

export type CalibrationExportModelMetrics = {
  r2: number | null;
  rmse_ml: number | null;
  mae_ml: number | null;
  max_abs_error_ml: number | null;
};

export type CalibrationExportBlock = {
  calibration_profile_id: string | null;
  calibration_profile_active: CalibrationProfile | null;
  active_model_id: string | null;
  model_kind: CalibrationModelKind | null;
  model_metrics: CalibrationExportModelMetrics | null;
  calibration_models: ActiveCalibrationModel | null;
  calibration_exported_at: string;
};

/** Snapshot completo para exportación clínica local (CSV / JSON). */
export type ClinicalExportSnapshot = {
  export_version: string;
  export_schema_version: string;
  app_version: string;
  /** Reservado para futuras versiones con firmware ESP32 reportando versión. */
  firmware_version: string | null;
  exported_at: string;
  patient: PatientRecord | null;
  diagnostics: DiagnosticRecord[];
  patient_levels: PatientLevelRecord[];
  sessions: ExportSessionWithAttempts[];
  calibration?: CalibrationExportBlock;
};
