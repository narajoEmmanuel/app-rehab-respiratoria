import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DiagnosticInputMode } from '@/src/modules/diagnostics/diagnostic-input-mode';
import type {
  DiagnosticAttemptNumber,
  DiagnosticAttemptRecord,
  DiagnosticConsistencySummary,
  DiagnosticEvaluationSession,
  DiagnosticVimSource,
} from '@/src/modules/diagnostics/types';

const STORAGE_KEY = '@rehab/diagnostic_evaluation_session_v1';
const ATTEMPT_DURATION_MS = 5000;
const VIM_SOURCE: DiagnosticVimSource = 'max_valid_attempt';

const sessionsById = new Map<string, DiagnosticEvaluationSession>();

export type AttemptTrackingSnapshot = {
  peak_volume_ml: number;
  had_live_signal: boolean;
  live_sample_count: number;
  signal_lost_during_attempt: boolean;
  sensor_status_summary?: string;
};

function newAttemptId(sessionId: string, attemptNumber: DiagnosticAttemptNumber): string {
  return `${sessionId}-attempt-${attemptNumber}`;
}

function newSessionId(): string {
  return `diag-eval-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function persistSessionsMap(): Promise<void> {
  const payload = Object.fromEntries(sessionsById.entries());
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

async function hydrateSessionsMap(): Promise<void> {
  if (sessionsById.size > 0) return;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Record<string, DiagnosticEvaluationSession>;
    for (const [id, session] of Object.entries(parsed)) {
      if (session?.session_id) sessionsById.set(id, session);
    }
  } catch {
    // ignore corrupt storage
  }
}

export function deriveInvalidReason(
  peakVolumeMl: number,
  hadLiveSignal: boolean,
  inputMode: DiagnosticInputMode,
): string | undefined {
  if (peakVolumeMl <= 0) return 'zero_peak';
  if (inputMode === 'sensor' && !hadLiveSignal) return 'no_live_signal';
  return undefined;
}

export function isValidOfficialDiagnosticAttempt(
  attempt: DiagnosticAttemptRecord,
  inputMode: DiagnosticInputMode,
): boolean {
  if (attempt.peak_volume_ml <= 0) return false;
  if (inputMode === 'sensor' && !attempt.had_live_signal) return false;
  return attempt.valid;
}

/** VIM = máximo peak_volume_ml entre intentos válidos (oficial). */
export function calculateVimFromAttempts(
  attempts: readonly DiagnosticAttemptRecord[],
  inputMode: DiagnosticInputMode,
): number {
  const peaks = attempts
    .filter((a) => isValidOfficialDiagnosticAttempt(a, inputMode))
    .map((a) => a.peak_volume_ml);
  if (peaks.length === 0) return 0;
  return Math.round(Math.max(...peaks));
}

export function countValidOfficialAttempts(
  attempts: readonly DiagnosticAttemptRecord[],
  inputMode: DiagnosticInputMode,
): number {
  return attempts.filter((a) => isValidOfficialDiagnosticAttempt(a, inputMode)).length;
}

/**
 * Consistencia entre intentos válidos (CV). Indicador técnico de estabilidad, no diagnóstico.
 * CV ≤ 10%: buena; 10–20%: moderada; > 20%: variable; < 2 válidos: no evaluable.
 */
export function calculateConsistencySummary(
  attempts: readonly DiagnosticAttemptRecord[],
  inputMode: DiagnosticInputMode,
): DiagnosticConsistencySummary {
  const validPeaks = attempts
    .filter((a) => isValidOfficialDiagnosticAttempt(a, inputMode))
    .map((a) => a.peak_volume_ml);
  const count = validPeaks.length;

  if (count === 0) {
    return {
      label: 'not_evaluable',
      display_label: 'Consistencia no evaluable',
      valid_attempts_count: 0,
      mean_peak_volume_ml: 0,
      min_peak_volume_ml: 0,
      max_peak_volume_ml: 0,
      range_ml: 0,
      standard_deviation_ml: 0,
      coefficient_of_variation_percent: null,
    };
  }

  const min = Math.min(...validPeaks);
  const max = Math.max(...validPeaks);
  const mean = validPeaks.reduce((sum, v) => sum + v, 0) / count;
  const range = max - min;

  if (count < 2) {
    return {
      label: 'not_evaluable',
      display_label: 'Consistencia no evaluable',
      valid_attempts_count: count,
      mean_peak_volume_ml: Math.round(mean),
      min_peak_volume_ml: Math.round(min),
      max_peak_volume_ml: Math.round(max),
      range_ml: Math.round(range),
      standard_deviation_ml: 0,
      coefficient_of_variation_percent: null,
    };
  }

  const variance =
    validPeaks.reduce((sum, v) => sum + (v - mean) ** 2, 0) / validPeaks.length;
  const stdDev = Math.sqrt(variance);
  const cvPercent = mean > 0 ? (stdDev / mean) * 100 : null;

  let label: DiagnosticConsistencySummary['label'];
  let display_label: string;
  if (cvPercent === null || !Number.isFinite(cvPercent)) {
    label = 'not_evaluable';
    display_label = 'Consistencia no evaluable';
  } else if (cvPercent <= 10) {
    label = 'good';
    display_label = 'Consistencia buena';
  } else if (cvPercent <= 20) {
    label = 'moderate';
    display_label = 'Consistencia moderada';
  } else {
    label = 'variable';
    display_label = 'Consistencia variable';
  }

  return {
    label,
    display_label,
    valid_attempts_count: count,
    mean_peak_volume_ml: Math.round(mean),
    min_peak_volume_ml: Math.round(min),
    max_peak_volume_ml: Math.round(max),
    range_ml: Math.round(range),
    standard_deviation_ml: Math.round(stdDev * 100) / 100,
    coefficient_of_variation_percent:
      cvPercent != null && Number.isFinite(cvPercent)
        ? Math.round(cvPercent * 100) / 100
        : null,
  };
}

export function buildDiagnosticAttemptRecord(params: {
  sessionId: string;
  patientId: number | null;
  attemptNumber: DiagnosticAttemptNumber;
  inputMode: DiagnosticInputMode;
  startedAt: string;
  endedAt: string;
  tracking: AttemptTrackingSnapshot;
}): DiagnosticAttemptRecord {
  const peak = Math.round(Math.max(0, params.tracking.peak_volume_ml));
  const invalidReason = deriveInvalidReason(
    peak,
    params.tracking.had_live_signal,
    params.inputMode,
  );
  const valid = invalidReason === undefined;

  return {
    id: newAttemptId(params.sessionId, params.attemptNumber),
    patient_id: params.patientId ?? undefined,
    attempt_number: params.attemptNumber,
    input_mode: params.inputMode,
    started_at: params.startedAt,
    ended_at: params.endedAt,
    duration_ms: Math.max(0, Date.parse(params.endedAt) - Date.parse(params.startedAt)) || ATTEMPT_DURATION_MS,
    peak_volume_ml: peak,
    final_volume_ml: peak,
    valid,
    invalid_reason: invalidReason,
    had_live_signal: params.tracking.had_live_signal,
    live_sample_count: params.tracking.live_sample_count,
    signal_lost_during_attempt: params.tracking.signal_lost_during_attempt,
    sensor_status_summary: params.tracking.sensor_status_summary,
    created_at: new Date().toISOString(),
  };
}

export async function createDiagnosticEvaluationSession(params: {
  inputMode: DiagnosticInputMode;
  patientId: number | null;
}): Promise<DiagnosticEvaluationSession> {
  await hydrateSessionsMap();
  const now = new Date().toISOString();
  const session: DiagnosticEvaluationSession = {
    session_id: newSessionId(),
    patient_id: params.patientId,
    input_mode: params.inputMode,
    attempts: [],
    created_at: now,
    updated_at: now,
  };
  sessionsById.set(session.session_id, session);
  await persistSessionsMap();
  return session;
}

export async function saveDiagnosticEvaluationSession(
  session: DiagnosticEvaluationSession,
): Promise<void> {
  await hydrateSessionsMap();
  const updated: DiagnosticEvaluationSession = {
    ...session,
    updated_at: new Date().toISOString(),
  };
  sessionsById.set(updated.session_id, updated);
  await persistSessionsMap();
}

export async function getDiagnosticEvaluationSession(
  sessionId: string,
): Promise<DiagnosticEvaluationSession | null> {
  await hydrateSessionsMap();
  return sessionsById.get(sessionId) ?? null;
}

export async function clearDiagnosticEvaluationSession(sessionId: string): Promise<void> {
  await hydrateSessionsMap();
  sessionsById.delete(sessionId);
  await persistSessionsMap();
}

export async function clearAllDiagnosticEvaluationSessions(): Promise<void> {
  sessionsById.clear();
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function resolveEvaluationFromSession(session: DiagnosticEvaluationSession): {
  vim: number;
  validAttemptsCount: number;
  consistencySummary: DiagnosticConsistencySummary;
  vimSource: DiagnosticVimSource;
  bestAttemptNumber: DiagnosticAttemptNumber | null;
} {
  const vim = calculateVimFromAttempts(session.attempts, session.input_mode);
  const consistencySummary = calculateConsistencySummary(session.attempts, session.input_mode);
  const validAttemptsCount = countValidOfficialAttempts(session.attempts, session.input_mode);

  let bestAttemptNumber: DiagnosticAttemptNumber | null = null;
  if (vim > 0) {
    const best = session.attempts
      .filter((a) => isValidOfficialDiagnosticAttempt(a, session.input_mode))
      .sort((a, b) => b.peak_volume_ml - a.peak_volume_ml)[0];
    bestAttemptNumber = best?.attempt_number ?? null;
  }

  return {
    vim,
    validAttemptsCount,
    consistencySummary,
    vimSource: VIM_SOURCE,
    bestAttemptNumber,
  };
}

export { VIM_SOURCE };
