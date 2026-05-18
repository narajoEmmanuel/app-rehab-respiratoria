import type { LevelId } from '@/src/modules/levels/types/level-progress';
import type { SessionDataSource, SessionInputMode } from '@/src/modules/session/session-input-mode';
import type { SensorAttemptEvaluationStatus } from '@/src/modules/session/sensor-evaluation/sensor-attempt-evaluation-types';
import type { OfficialAttemptValidationSource } from '@/src/modules/session/sensor-evaluation/session-attempt-validation-types';

export type SessionRecord = {
  session_id: number;
  patient_id: number;
  patient_level_id: number;
  level_id: LevelId;
  session_date: string;
  valid_attempts: number;
  total_attempts: number;
  invalid_attempts: number;
  compliance_percent: number;
  max_volume: number;
  avg_volume: number;
  avg_hold_seconds: number;
  completed: boolean;
  perfect: boolean;
  /** Present when user stopped with STOP; omitted in legacy rows (= false). */
  interrupted?: boolean;
  /** Fuente de entrada; omitido en filas anteriores a Fase 3A.9b. */
  input_mode?: SessionInputMode;
  data_source?: SessionDataSource;
  is_practice_session?: boolean;
  official_validation_source?: OfficialAttemptValidationSource;
  max_sensor_estimated_volume_ml?: number | null;
  max_sensor_u95_ml?: number | null;
};

export type AttemptRecord = {
  attempt_id: number;
  session_id: number;
  hold_ms: number;
  peak_volume: number;
  valid: boolean;
  created_at: string;
  input_mode?: SessionInputMode;
  data_source?: SessionDataSource;
  official_volume_ml?: number | null;
  sensor_estimated_volume_ml?: number | null;
  sensor_u95_ml?: number | null;
  sensor_confidence_label?: string | null;
  sensor_volume_reached_conservatively?: boolean;
  sensor_attempt_status?: SensorAttemptEvaluationStatus | null;
};
