/**
 * Purpose: Single clinical CSV — daily_summary + session_summary rows (UTF-8 BOM, CRLF).
 * Module: export
 * Notes: Intentos de evaluación inicial alimentan diagnostic_*; mejor intento = válido oficial (misma regla que UI).
 */

import { LEVEL1_DAILY_GOAL } from '@/src/modules/history/services/history-aggregates';
import { normalizePatientDisplayName } from '@/src/modules/patient/patient-display';
import type { ClinicalExportSnapshot } from '@/src/modules/export/types/export-record';
import { resolveBestAttemptPeakVolumeMl } from '@/src/modules/diagnostics/diagnostic-evaluation-display-utils';
import { DEFAULT_DIAGNOSTIC_INPUT_MODE } from '@/src/modules/diagnostics/diagnostic-input-mode';
import type { DiagnosticRecord } from '@/src/modules/diagnostics/types';
import {
  attemptClassificationExportFields,
  classificationExportFields,
  isTherapeuticSessionRecord,
  resolveSessionClassification,
} from '@/src/modules/session/session-record-classification';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { addDaysLocal, sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function nivelEtiqueta(levelId: string): string {
  const m = /^level-(\d+)$/.exec(levelId);
  return m ? `Nivel ${m[1]}` : levelId;
}

function siNo(v: boolean): string {
  return v ? 'sí' : 'no';
}

function latestVimMl(snapshot: ClinicalExportSnapshot): string {
  if (snapshot.diagnostics.length === 0) return '';
  const sorted = [...snapshot.diagnostics].sort(
    (a, b) => Date.parse(b.diagnostic_date) - Date.parse(a.diagnostic_date),
  );
  return String(sorted[0]?.max_inspiratory_volume ?? '');
}

function diagnosticBestAttemptMl(diagnostic: DiagnosticRecord): string {
  const inputMode = diagnostic.input_mode ?? DEFAULT_DIAGNOSTIC_INPUT_MODE;
  const bestPeak = resolveBestAttemptPeakVolumeMl(diagnostic.attempts, inputMode);
  if (bestPeak != null) return String(bestPeak);
  return String(diagnostic.max_inspiratory_volume);
}

function diagnosticAttemptsJson(diagnostic: DiagnosticRecord): string {
  if (!diagnostic.attempts || diagnostic.attempts.length === 0) return '';
  try {
    return JSON.stringify(
      diagnostic.attempts.map((a) => ({
        attempt_number: a.attempt_number,
        peak_volume_ml: a.peak_volume_ml,
        valid: a.valid,
        had_live_signal: a.had_live_signal,
        signal_lost_during_attempt: a.signal_lost_during_attempt,
      })),
    );
  } catch {
    return '';
  }
}

function fillDiagnosticExportFields(
  row: Record<(typeof HEADER)[number], string>,
  diagnostic: DiagnosticRecord,
): void {
  row.diagnostic_attempts_json = diagnosticAttemptsJson(diagnostic);
  row.diagnostic_valid_attempts_count =
    diagnostic.valid_attempts_count != null
      ? String(diagnostic.valid_attempts_count)
      : '';
  row.diagnostic_consistency_label =
    diagnostic.consistency_summary?.display_label ?? '';
  row.diagnostic_consistency_cv_percent =
    diagnostic.consistency_summary?.coefficient_of_variation_percent != null
      ? String(diagnostic.consistency_summary.coefficient_of_variation_percent)
      : '';
  row.diagnostic_best_attempt_ml = diagnosticBestAttemptMl(diagnostic);
}

/** Max hold duration (s) from attempts only — internal aggregation. */
function maxHoldSecondsFromAttempts(
  attempts: ClinicalExportSnapshot['sessions'][number]['attempts'],
): number {
  if (attempts.length === 0) return 0;
  let maxMs = 0;
  for (const a of attempts) {
    if (a.hold_ms > maxMs) maxMs = a.hold_ms;
  }
  return maxMs / 1000;
}

function horaLocalDesdeIso(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function computeSessionIndexByDay(
  sessions: ClinicalExportSnapshot['sessions'],
): Map<number, number> {
  const sorted = [...sessions].sort((a, b) => {
    const ta = Date.parse(a.session.session_date);
    const tb = Date.parse(b.session.session_date);
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
    return a.session.session_id - b.session.session_id;
  });
  const map = new Map<number, number>();
  const countsByDay = new Map<string, number>();
  for (const item of sorted) {
    const day = sessionRecordLocalDayKey(item.session.session_date) ?? 'desconocido';
    const next = (countsByDay.get(day) ?? 0) + 1;
    countsByDay.set(day, next);
    map.set(item.session.session_id, next);
  }
  return map;
}

function streakEndingOnDay(dayKey: string, activityDays: ReadonlySet<string>): number {
  let n = 0;
  let d = dayKey;
  while (activityDays.has(d)) {
    n += 1;
    d = addDaysLocal(d, -1);
  }
  return n;
}

const HEADER: readonly string[] = [
  'row_type',
  'patient_code',
  'patient_name',
  'age',
  'vim_actual',
  'fecha',
  'hora',
  'nivel_activo',
  'nivel',
  'sesiones_realizadas',
  'sesiones_perfectas',
  'meta_diaria_cumplida',
  'sesion_numero_dia',
  'reps_totales',
  'reps_validas',
  'reps_invalidas',
  'cumplimiento_promedio',
  'cumplimiento_porcentaje',
  'volumen_maximo_dia',
  'volumen_promedio_dia',
  'tiempo_promedio_dia',
  'racha',
  'sesion_perfecta',
  'volumen_maximo',
  'volumen_promedio',
  'tiempo_maximo',
  'tiempo_promedio',
  'input_mode',
  'data_source',
  'is_practice_session',
  'official_validation_source',
  'max_sensor_estimated_volume_ml',
  'max_sensor_u95_ml',
  'therapeutic_sessions_count',
  'practice_sessions_count',
  'sensor_sessions_count',
  'unclassified_sessions_count',
  'official_volume_ml',
  'sensor_estimated_volume_ml',
  'sensor_u95_ml',
  'sensor_confidence_label',
  'sensor_volume_reached_conservatively',
  'sensor_attempt_status',
  'diagnostic_attempts_json',
  'diagnostic_valid_attempts_count',
  'diagnostic_consistency_label',
  'diagnostic_consistency_cv_percent',
  'diagnostic_best_attempt_ml',
] as const;

function isTherapeuticExportSession(session: SessionRecord): boolean {
  return isTherapeuticSessionRecord(session);
}

function countSessionsByClassification(list: ClinicalExportSnapshot['sessions']): {
  therapeutic_sessions_count: number;
  practice_sessions_count: number;
  sensor_sessions_count: number;
  unclassified_sessions_count: number;
  max_sensor_estimated_volume_ml: number;
  max_sensor_u95_ml: number;
} {
  let therapeutic = 0;
  let practice = 0;
  let sensor = 0;
  let unclassified = 0;
  let maxEst = 0;
  let maxU95 = 0;

  for (const { session } of list) {
    const c = resolveSessionClassification(session);
    if (!c.isClassified) unclassified += 1;
    else if (c.isPracticeSession) practice += 1;
    else if (c.inputMode === 'sensor') sensor += 1;

    if (
      isTherapeuticExportSession(session) &&
      session.completed &&
      session.interrupted !== true
    ) {
      therapeutic += 1;
    }

    const est = session.max_sensor_estimated_volume_ml;
    const u95 = session.max_sensor_u95_ml;
    if (typeof est === 'number' && !Number.isNaN(est)) maxEst = Math.max(maxEst, est);
    if (typeof u95 === 'number' && !Number.isNaN(u95)) maxU95 = Math.max(maxU95, u95);
  }

  return {
    therapeutic_sessions_count: therapeutic,
    practice_sessions_count: practice,
    sensor_sessions_count: sensor,
    unclassified_sessions_count: unclassified,
    max_sensor_estimated_volume_ml: maxEst,
    max_sensor_u95_ml: maxU95,
  };
}

function emptyRow(): Record<(typeof HEADER)[number], string> {
  const row = {} as Record<(typeof HEADER)[number], string>;
  for (const k of HEADER) row[k] = '';
  return row;
}

function rowToCsvLine(row: Record<(typeof HEADER)[number], string>): string {
  return HEADER.map((k) => escapeCsvCell(row[k])).join(',');
}

export function buildClinicalReportCsv(snapshot: ClinicalExportSnapshot): string {
  const lines: string[] = [];
  lines.push('RESPIRA_REPORTE_CLINICO');
  lines.push(`export_version,${escapeCsvCell(snapshot.export_version)}`);
  lines.push(`exported_at,${escapeCsvCell(snapshot.exported_at)}`);
  lines.push(HEADER.join(','));

  const p = snapshot.patient;
  const patientCode = p?.clave ?? '';
  const patientName = p?.nombre_completo != null ? normalizePatientDisplayName(p.nombre_completo) : '';
  const age = p != null ? String(p.edad) : '';
  const vimActual = latestVimMl(snapshot);

  const sortedDiagnostics = [...snapshot.diagnostics].sort(
    (a, b) => Date.parse(a.diagnostic_date) - Date.parse(b.diagnostic_date),
  );
  for (const diagnostic of sortedDiagnostics) {
    const dr = emptyRow();
    dr.row_type = 'diagnostic_summary';
    dr.patient_code = patientCode;
    dr.patient_name = patientName;
    dr.age = age;
    dr.vim_actual = String(diagnostic.max_inspiratory_volume);
    dr.fecha = sessionRecordLocalDayKey(diagnostic.diagnostic_date) ?? '';
    dr.hora = horaLocalDesdeIso(diagnostic.diagnostic_date);
    fillDiagnosticExportFields(dr, diagnostic);
    lines.push(rowToCsvLine(dr));
  }

  const sessionItems = snapshot.sessions;
  const dayIndex = computeSessionIndexByDay(sessionItems);

  const byDay = new Map<string, typeof sessionItems>();
  for (const item of sessionItems) {
    const day = sessionRecordLocalDayKey(item.session.session_date);
    if (!day) continue;
    const list = byDay.get(day);
    if (list) list.push(item);
    else byDay.set(day, [item]);
  }

  const activityDays = new Set<string>();
  for (const [day, list] of byDay) {
    const hasCompleted = list.some(
      (x) =>
        isTherapeuticExportSession(x.session) &&
        x.session.completed &&
        x.session.interrupted !== true,
    );
    if (hasCompleted) activityDays.add(day);
  }

  const sortedDays = [...byDay.keys()].sort();

  for (const dayKey of sortedDays) {
    const list = byDay.get(dayKey);
    if (!list || list.length === 0) continue;

    const sortedList = [...list].sort(
      (a, b) => Date.parse(a.session.session_date) - Date.parse(b.session.session_date),
    );

    const completedSessions = sortedList.filter(
      (x) =>
        isTherapeuticExportSession(x.session) &&
        x.session.completed &&
        x.session.interrupted !== true,
    );
    const perfectSessions = sortedList.filter(
      (x) =>
        isTherapeuticExportSession(x.session) &&
        x.session.perfect &&
        x.session.completed &&
        x.session.interrupted !== true,
    );

    let repsTot = 0;
    let repsVal = 0;
    let repsInv = 0;
    let complianceSum = 0;
    let volMaxDay = 0;
    let volAvgSum = 0;
    let timeAvgSum = 0;
    let nSessions = 0;
    for (const { session } of sortedList) {
      if (!isTherapeuticExportSession(session)) continue;
      repsTot += session.total_attempts;
      repsVal += session.valid_attempts;
      repsInv += session.invalid_attempts;
      complianceSum += session.compliance_percent;
      volMaxDay = Math.max(volMaxDay, session.max_volume);
      volAvgSum += session.avg_volume;
      timeAvgSum += session.avg_hold_seconds;
      nSessions += 1;
    }
    const complianceProm =
      nSessions > 0 ? Math.round((complianceSum / nSessions) * 100) / 100 : 0;
    const volPromDia = nSessions > 0 ? Math.round((volAvgSum / nSessions) * 100) / 100 : 0;
    const tiempoPromDia = nSessions > 0 ? Math.round((timeAvgSum / nSessions) * 100) / 100 : 0;

    const lastSessionOfDay = sortedList[sortedList.length - 1]?.session;
    const nivelActivo = lastSessionOfDay ? nivelEtiqueta(lastSessionOfDay.level_id) : '';

    const metaOk = completedSessions.length >= LEVEL1_DAILY_GOAL;
    const dayClassification = countSessionsByClassification(sortedList);

    const daily = emptyRow();
    daily.row_type = 'daily_summary';
    daily.patient_code = patientCode;
    daily.patient_name = patientName;
    daily.age = age;
    daily.vim_actual = vimActual;
    daily.fecha = dayKey;
    daily.nivel_activo = nivelActivo;
    daily.sesiones_realizadas = String(completedSessions.length);
    daily.sesiones_perfectas = String(perfectSessions.length);
    daily.meta_diaria_cumplida = siNo(metaOk);
    daily.reps_totales = String(repsTot);
    daily.reps_validas = String(repsVal);
    daily.reps_invalidas = String(repsInv);
    daily.cumplimiento_promedio = String(complianceProm);
    daily.volumen_maximo_dia = String(volMaxDay);
    daily.volumen_promedio_dia = String(volPromDia);
    daily.tiempo_promedio_dia = String(tiempoPromDia);
    daily.racha = String(streakEndingOnDay(dayKey, activityDays));
    daily.therapeutic_sessions_count = String(dayClassification.therapeutic_sessions_count);
    daily.practice_sessions_count = String(dayClassification.practice_sessions_count);
    daily.sensor_sessions_count = String(dayClassification.sensor_sessions_count);
    daily.unclassified_sessions_count = String(dayClassification.unclassified_sessions_count);
    daily.max_sensor_estimated_volume_ml =
      dayClassification.max_sensor_estimated_volume_ml > 0
        ? String(dayClassification.max_sensor_estimated_volume_ml)
        : '';
    daily.max_sensor_u95_ml =
      dayClassification.max_sensor_u95_ml > 0 ? String(dayClassification.max_sensor_u95_ml) : '';

    lines.push(rowToCsvLine(daily));

    for (const { session, attempts } of sortedList) {
      const maxHoldSec = maxHoldSecondsFromAttempts(attempts);
      const tiempoMaximoStr =
        maxHoldSec > 0
          ? maxHoldSec.toFixed(2)
          : String(Math.round(session.avg_hold_seconds * 100) / 100);

      const sr = emptyRow();
      sr.row_type = 'session_summary';
      sr.patient_code = patientCode;
      sr.patient_name = patientName;
      sr.age = age;
      sr.vim_actual = vimActual;
      sr.fecha = sessionRecordLocalDayKey(session.session_date) ?? '';
      sr.hora = horaLocalDesdeIso(session.session_date);
      sr.nivel = nivelEtiqueta(session.level_id);
      sr.sesion_numero_dia = String(dayIndex.get(session.session_id) ?? '');
      sr.reps_totales = String(session.total_attempts);
      sr.reps_validas = String(session.valid_attempts);
      sr.reps_invalidas = String(session.invalid_attempts);
      sr.sesion_perfecta = siNo(session.perfect);
      sr.cumplimiento_porcentaje = String(session.compliance_percent);
      sr.volumen_maximo = String(session.max_volume);
      sr.volumen_promedio = String(session.avg_volume);
      sr.tiempo_maximo = tiempoMaximoStr;
      sr.tiempo_promedio = String(session.avg_hold_seconds);
      const classification = classificationExportFields(session);
      sr.input_mode = classification.input_mode;
      sr.data_source = classification.data_source;
      sr.is_practice_session = classification.is_practice_session;
      sr.official_validation_source = classification.official_validation_source;
      sr.max_sensor_estimated_volume_ml = classification.max_sensor_estimated_volume_ml;
      sr.max_sensor_u95_ml = classification.max_sensor_u95_ml;

      lines.push(rowToCsvLine(sr));

      for (const attempt of attempts) {
        const ar = emptyRow();
        ar.row_type = 'attempt';
        ar.patient_code = patientCode;
        ar.patient_name = patientName;
        ar.age = age;
        ar.fecha = sessionRecordLocalDayKey(session.session_date) ?? '';
        ar.hora = horaLocalDesdeIso(session.session_date);
        ar.nivel = nivelEtiqueta(session.level_id);
        ar.sesion_numero_dia = String(dayIndex.get(session.session_id) ?? '');
        ar.reps_totales = '1';
        ar.reps_validas = attempt.valid ? '1' : '0';
        ar.reps_invalidas = attempt.valid ? '0' : '1';
        ar.tiempo_maximo = String(Math.round((attempt.hold_ms / 1000) * 100) / 100);
        const attemptFields = attemptClassificationExportFields(attempt);
        ar.input_mode = attemptFields.input_mode;
        ar.data_source = attemptFields.data_source;
        ar.official_volume_ml = attemptFields.official_volume_ml;
        ar.sensor_estimated_volume_ml = attemptFields.sensor_estimated_volume_ml;
        ar.sensor_u95_ml = attemptFields.sensor_u95_ml;
        ar.sensor_confidence_label = attemptFields.sensor_confidence_label;
        ar.sensor_volume_reached_conservatively =
          attemptFields.sensor_volume_reached_conservatively;
        ar.sensor_attempt_status = attemptFields.sensor_attempt_status;
        lines.push(rowToCsvLine(ar));
      }
    }
  }

  const body = `${lines.join('\r\n')}\r\n`;
  return `\uFEFF${body}`;
}

export function buildClinicalReportFilename(snapshot: ClinicalExportSnapshot, patientId: number): string {
  const raw = snapshot.patient?.clave ?? `id${patientId}`;
  const safe = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `respira_reporte_clinico_${safe}_${stamp}.csv`;
}
