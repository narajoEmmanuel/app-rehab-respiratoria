import {
  readAllAttempts,
  readAllSessions,
} from '@/src/modules/session/storage/session-progress-repository';
import type { AttemptRecord } from '@/src/modules/session/types/session-progress';

import type { ExportSessionWithAttempts, PatientExportData } from '@/src/modules/export/types/export-record';

export const EXPORT_FORMAT_VERSION = '1.0.0';

function attemptsBySessionId(attempts: AttemptRecord[]): Map<number, AttemptRecord[]> {
  const map = new Map<number, AttemptRecord[]>();
  for (const attempt of attempts) {
    const list = map.get(attempt.session_id);
    if (list) list.push(attempt);
    else map.set(attempt.session_id, [attempt]);
  }
  return map;
}

export async function getPatientExportData(patientId: number): Promise<PatientExportData> {
  const allSessions = await readAllSessions();
  const allAttempts = await readAllAttempts();
  const bySession = attemptsBySessionId(allAttempts);

  const patientSessions = allSessions
    .filter((s) => s.patient_id === patientId)
    .sort((a, b) => a.session_id - b.session_id);

  const sessions: ExportSessionWithAttempts[] = patientSessions.map((session) => {
    const attempts = (bySession.get(session.session_id) ?? []).sort((a, b) => a.attempt_id - b.attempt_id);
    return { session, attempts };
  });

  return {
    export_version: EXPORT_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    patient_id: patientId,
    sessions,
  };
}
