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
