import type { ExportSessionWithAttempts, PatientExportData } from '@/src/modules/export/types/export-record';

const CSV_HEADER = [
  'session_id',
  'patient_id',
  'level_id',
  'started_at',
  'completed_at',
  'completed',
  'interrupted',
  'perfect',
  'valid_attempts',
  'invalid_attempts',
  'total_attempts',
  'compliance_percent',
  'max_volume_ml',
  'avg_volume_ml',
  'avg_hold_seconds',
] as const;

function escapeCsvCell(value: string | number | boolean): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function latestAttemptIso(attempts: ExportSessionWithAttempts['attempts']): string | null {
  if (attempts.length === 0) return null;
  let latest = attempts[0].created_at;
  for (let i = 1; i < attempts.length; i += 1) {
    const t = attempts[i].created_at;
    if (t > latest) latest = t;
  }
  return latest;
}

export function buildSessionExportCsv(data: PatientExportData): string {
  const lines: string[] = [CSV_HEADER.join(',')];

  for (const { session, attempts } of data.sessions) {
    const startedAt = session.session_date;
    const completedAt = latestAttemptIso(attempts) ?? startedAt;
    const interrupted = session.interrupted === true;

    const row = [
      escapeCsvCell(session.session_id),
      escapeCsvCell(session.patient_id),
      escapeCsvCell(session.level_id),
      escapeCsvCell(startedAt),
      escapeCsvCell(completedAt),
      escapeCsvCell(session.completed),
      escapeCsvCell(interrupted),
      escapeCsvCell(session.perfect),
      escapeCsvCell(session.valid_attempts),
      escapeCsvCell(session.invalid_attempts),
      escapeCsvCell(session.total_attempts),
      escapeCsvCell(session.compliance_percent),
      escapeCsvCell(session.max_volume),
      escapeCsvCell(session.avg_volume),
      escapeCsvCell(session.avg_hold_seconds),
    ];
    lines.push(row.join(','));
  }

  return `${lines.join('\r\n')}\r\n`;
}
