import type { DiagnosticInputMode } from '@/src/modules/diagnostics/diagnostic-input-mode';

export type DiagnosticAttemptNumber = 1 | 2 | 3;

export type DiagnosticVimSource = 'max_valid_attempt';

export type DiagnosticConsistencyLabel = 'good' | 'moderate' | 'variable' | 'not_evaluable';

/** Indicador técnico de estabilidad entre intentos válidos; no es diagnóstico clínico. */
export type DiagnosticConsistencySummary = {
  label: DiagnosticConsistencyLabel;
  /** Etiqueta amigable para UI (español). */
  display_label: string;
  valid_attempts_count: number;
  mean_peak_volume_ml: number;
  min_peak_volume_ml: number;
  max_peak_volume_ml: number;
  range_ml: number;
  standard_deviation_ml: number;
  coefficient_of_variation_percent: number | null;
};

export type DiagnosticAttemptRecord = {
  id: string;
  diagnostic_id?: number;
  patient_id?: number;
  attempt_number: DiagnosticAttemptNumber;
  input_mode: DiagnosticInputMode;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  peak_volume_ml: number;
  final_volume_ml?: number;
  valid: boolean;
  invalid_reason?: string;
  had_live_signal: boolean;
  live_sample_count?: number;
  signal_lost_during_attempt: boolean;
  sensor_status_summary?: string;
  created_at: string;
};

export type DiagnosticRecord = {
  diagnostic_id: number;
  patient_id: number;
  diagnostic_number: number;
  diagnostic_date: string;
  max_inspiratory_volume: number;
  /** Intentos individuales (Fase 2+). Ausente en registros antiguos. */
  attempts?: DiagnosticAttemptRecord[];
  valid_attempts_count?: number;
  vim_source?: DiagnosticVimSource;
  consistency_summary?: DiagnosticConsistencySummary | null;
  input_mode?: DiagnosticInputMode;
};

export type PatientLevelStatus = 'active' | 'locked' | 'completed';

export type PatientLevelRecord = {
  patient_level_id: number;
  patient_id: number;
  level_id: 'level-1' | 'level-2' | 'level-3' | 'level-4' | 'level-5';
  diagnostic_id: number;
  target_volume: number;
  level_status: PatientLevelStatus;
  /** Sesiones perfectas terapéuticas acumuladas en este nivel (todas las fechas). */
  perfect_sessions_completed: number;
  /** Sesiones terapéuticas completadas hoy (día calendario local). */
  sessions_completed_today: number;
  last_session_date: string | null;
};

export type DiagnosticEvaluationSession = {
  session_id: string;
  patient_id: number | null;
  input_mode: DiagnosticInputMode;
  attempts: DiagnosticAttemptRecord[];
  created_at: string;
  updated_at: string;
};
