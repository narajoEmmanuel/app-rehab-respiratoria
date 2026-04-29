import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { updatePatientCurrentLevel } from '@/src/modules/patient/patient-service';

import {
  readAllDiagnostics,
  readAllPatientLevels,
  writeAllDiagnostics,
  writeAllPatientLevels,
} from './diagnostic-repository';
import type { DiagnosticRecord, PatientLevelRecord } from './types';

const LEVEL_FACTORS: { levelId: LevelId; factor: number }[] = [
  { levelId: 'level-1', factor: 0.5 },
  { levelId: 'level-2', factor: 0.6 },
  { levelId: 'level-3', factor: 0.7 },
  { levelId: 'level-4', factor: 0.8 },
  { levelId: 'level-5', factor: 0.9 },
];

export async function hasDiagnostic(patientId: number): Promise<boolean> {
  const diagnostics = await readAllDiagnostics();
  return diagnostics.some((item) => item.patient_id === patientId);
}

export async function getLatestDiagnostic(patientId: number): Promise<DiagnosticRecord | null> {
  const diagnostics = await readAllDiagnostics();
  const patientDiagnostics = diagnostics
    .filter((item) => item.patient_id === patientId)
    .sort((a, b) => b.diagnostic_number - a.diagnostic_number);
  return patientDiagnostics[0] ?? null;
}

export async function createDiagnostic(patientId: number, vim: number): Promise<DiagnosticRecord> {
  const diagnostics = await readAllDiagnostics();
  const nextDiagnosticId =
    diagnostics.length === 0 ? 1 : Math.max(...diagnostics.map((item) => item.diagnostic_id)) + 1;
  const latest = diagnostics
    .filter((item) => item.patient_id === patientId)
    .sort((a, b) => b.diagnostic_number - a.diagnostic_number)[0];

  const created: DiagnosticRecord = {
    diagnostic_id: nextDiagnosticId,
    patient_id: patientId,
    diagnostic_number: (latest?.diagnostic_number ?? 0) + 1,
    diagnostic_date: new Date().toISOString(),
    max_inspiratory_volume: Math.round(vim),
  };

  diagnostics.push(created);
  await writeAllDiagnostics(diagnostics);
  return created;
}

export async function generatePatientLevels(
  patientId: number,
  diagnosticId: number,
  vim: number,
): Promise<PatientLevelRecord[]> {
  const all = await readAllPatientLevels();
  const withoutPatient = all.filter((item) => item.patient_id !== patientId);
  const baseId = all.length === 0 ? 1 : Math.max(...all.map((row) => row.patient_level_id)) + 1;

  const generated: PatientLevelRecord[] = LEVEL_FACTORS.map(({ levelId, factor }, index) => ({
    patient_level_id: baseId + index,
    patient_id: patientId,
    level_id: levelId,
    diagnostic_id: diagnosticId,
    target_volume: Math.round(vim * factor),
    level_status: index === 0 ? 'active' : 'locked',
    perfect_sessions_completed: 0,
    sessions_completed_today: 0,
    last_session_date: null,
  }));

  await writeAllPatientLevels([...withoutPatient, ...generated]);
  await updatePatientCurrentLevel(patientId, 'level-1');
  return generated;
}

export async function getPatientLevels(patientId: number): Promise<PatientLevelRecord[]> {
  const all = await readAllPatientLevels();
  return all
    .filter((item) => item.patient_id === patientId)
    .map((item, index) => ({
      ...item,
      patient_level_id: item.patient_level_id ?? index + 1,
      perfect_sessions_completed: item.perfect_sessions_completed ?? 0,
      sessions_completed_today: item.sessions_completed_today ?? 0,
      last_session_date: item.last_session_date ?? null,
    }))
    .sort((a, b) => LEVEL_FACTORS.findIndex((lv) => lv.levelId === a.level_id) - LEVEL_FACTORS.findIndex((lv) => lv.levelId === b.level_id));
}

export async function getCurrentActiveLevel(patientId: number): Promise<PatientLevelRecord | null> {
  const levels = await getPatientLevels(patientId);
  return levels.find((item) => item.level_status === 'active') ?? null;
}

export async function savePatientLevels(rows: PatientLevelRecord[]): Promise<void> {
  await writeAllPatientLevels(rows);
}
