/**
 * Purpose: Single clinical CSV — daily_summary + session_summary rows (UTF-8 BOM, CRLF).
 * Module: export
 * Notes: Attempts are only used internally to derive tiempo_maximo when present.
 */

import { LEVEL1_DAILY_GOAL } from '@/src/modules/history/services/history-aggregates';
import type { ClinicalExportSnapshot } from '@/src/modules/export/types/export-record';
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
] as const;

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
  const patientName = p?.nombre_completo ?? '';
  const age = p != null ? String(p.edad) : '';
  const vimActual = latestVimMl(snapshot);

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
    const hasCompleted = list.some((x) => x.session.completed && x.session.interrupted !== true);
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
      (x) => x.session.completed && x.session.interrupted !== true,
    );
    const perfectSessions = sortedList.filter(
      (x) => x.session.perfect && x.session.completed && x.session.interrupted !== true,
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

      lines.push(rowToCsvLine(sr));
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
