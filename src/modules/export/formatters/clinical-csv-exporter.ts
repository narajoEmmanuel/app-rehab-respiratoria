/**
 * Purpose: Multi-section CSV for Excel / Power BI (UTF-8 BOM, CRLF).
 * Module: export
 */

import type { ClinicalExportSnapshot } from '@/src/modules/export/types/export-record';

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function latestAttemptIso(
  attempts: ClinicalExportSnapshot['sessions'][number]['attempts'],
): string | null {
  if (attempts.length === 0) return null;
  let latest = attempts[0].created_at;
  for (let i = 1; i < attempts.length; i += 1) {
    const t = attempts[i].created_at;
    if (t > latest) latest = t;
  }
  return latest;
}

function pushSection(lines: string[], title: string, header: string[], rows: string[][]): void {
  lines.push(title);
  lines.push(header.join(','));
  for (const row of rows) {
    lines.push(row.join(','));
  }
  lines.push('');
}

export function buildClinicalExportCsv(snapshot: ClinicalExportSnapshot): string {
  const lines: string[] = [];

  lines.push('RESPIRA_CLINICAL_EXPORT');
  lines.push(`export_version,${escapeCsvCell(snapshot.export_version)}`);
  lines.push(`exported_at,${escapeCsvCell(snapshot.exported_at)}`);
  lines.push('');

  const p = snapshot.patient;
  pushSection(
    lines,
    'PATIENT',
    [
      'paciente_id',
      'clave',
      'nombre_completo',
      'edad',
      'current_level_id',
      'racha_actual',
      'ultima_fecha_cumplida',
      'fecha_creacion',
    ],
    p
      ? [
          [
            escapeCsvCell(p.paciente_id),
            escapeCsvCell(p.clave),
            escapeCsvCell(p.nombre_completo),
            escapeCsvCell(p.edad),
            escapeCsvCell(p.current_level_id ?? ''),
            escapeCsvCell(p.racha_actual),
            escapeCsvCell(p.ultima_fecha_cumplida ?? ''),
            escapeCsvCell(p.fecha_creacion),
          ],
        ]
      : [],
  );

  pushSection(
    lines,
    'DIAGNOSTICS',
    [
      'diagnostic_id',
      'patient_id',
      'diagnostic_number',
      'diagnostic_date',
      'max_inspiratory_volume',
    ],
    snapshot.diagnostics.map((d) => [
      escapeCsvCell(d.diagnostic_id),
      escapeCsvCell(d.patient_id),
      escapeCsvCell(d.diagnostic_number),
      escapeCsvCell(d.diagnostic_date),
      escapeCsvCell(d.max_inspiratory_volume),
    ]),
  );

  pushSection(
    lines,
    'PATIENT_LEVELS',
    [
      'patient_level_id',
      'patient_id',
      'level_id',
      'diagnostic_id',
      'target_volume',
      'level_status',
      'perfect_sessions_completed',
      'sessions_completed_today',
      'last_session_date',
    ],
    snapshot.patient_levels.map((l) => [
      escapeCsvCell(l.patient_level_id),
      escapeCsvCell(l.patient_id),
      escapeCsvCell(l.level_id),
      escapeCsvCell(l.diagnostic_id),
      escapeCsvCell(l.target_volume),
      escapeCsvCell(l.level_status),
      escapeCsvCell(l.perfect_sessions_completed),
      escapeCsvCell(l.sessions_completed_today),
      escapeCsvCell(l.last_session_date ?? ''),
    ]),
  );

  const sessionRows: string[][] = [];
  for (const { session, attempts } of snapshot.sessions) {
    const startedAt = session.session_date;
    const completedAt = latestAttemptIso(attempts) ?? startedAt;
    const interrupted = session.interrupted === true;
    sessionRows.push([
      escapeCsvCell(session.session_id),
      escapeCsvCell(session.patient_id),
      escapeCsvCell(session.patient_level_id),
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
    ]);
  }

  pushSection(
    lines,
    'SESSIONS',
    [
      'session_id',
      'patient_id',
      'patient_level_id',
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
    ],
    sessionRows,
  );

  const attemptRows: string[][] = [];
  for (const { session, attempts } of snapshot.sessions) {
    for (const a of attempts) {
      attemptRows.push([
        escapeCsvCell(a.attempt_id),
        escapeCsvCell(a.session_id),
        escapeCsvCell(session.level_id),
        escapeCsvCell(a.hold_ms),
        escapeCsvCell(a.peak_volume),
        escapeCsvCell(a.valid),
        escapeCsvCell(a.created_at),
      ]);
    }
  }

  pushSection(
    lines,
    'ATTEMPTS',
    [
      'attempt_id',
      'session_id',
      'level_id',
      'hold_ms',
      'peak_volume_ml',
      'valid',
      'created_at',
    ],
    attemptRows,
  );

  const body = `${lines.join('\r\n')}\r\n`;
  return `\uFEFF${body}`;
}
