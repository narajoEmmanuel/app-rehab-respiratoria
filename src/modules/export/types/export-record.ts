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

/** Snapshot completo para exportación clínica local (CSV / JSON). */
export type ClinicalExportSnapshot = {
  export_version: string;
  exported_at: string;
  patient: PatientRecord | null;
  diagnostics: DiagnosticRecord[];
  patient_levels: PatientLevelRecord[];
  sessions: ExportSessionWithAttempts[];
};
