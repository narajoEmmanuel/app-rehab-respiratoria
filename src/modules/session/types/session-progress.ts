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
  /** Fase 3B: trazabilidad metrológica — perfil de calibración activo al iniciar sesión. */
  calibration_profile_id?: string | null;
  /** Fase 3B: modelo activo usado para estimar volumen durante la sesión. */
  active_model_id?: string | null;
  /** Fase 3B: tipo de modelo ('linear_regression' | 'piecewise_linear'). */
  model_kind?: 'linear_regression' | 'piecewise_linear' | string | null;
  /** Fase 3B: ID del dispositivo espirómetro físico. */
  spirometer_device_id?: string | null;
  /** Fase 3B: timestamp de creación de la calibración usada. */
  calibration_created_at?: number | null;
  /** Fase 3B: timestamp de última actualización de la calibración usada. */
  calibration_updated_at?: number | null;
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
  /** Fase 3B: distancia usada para la estimación de volumen (puede ser filtrada). */
  distance_mm?: number | null;
  /** Fase 3B: distancia cruda del sensor antes de cualquier filtro. */
  raw_distance_mm?: number | null;
  /** Fase 3B: distancia filtrada si el sistema aplica filtro antes de estimar. */
  filtered_distance_mm?: number | null;
  /** Fase 3B: true si la distancia cae dentro del rango calibrado. */
  in_calibrated_range?: boolean | null;
  /** Fase 3B: true si el volumen estimado fue clamped al rango. */
  clamped?: boolean | null;
  /** Fase 3B: ID del perfil de calibración usado en este intento. */
  calibration_profile_id?: string | null;
  /** Fase 3B: ID del modelo activo usado para este intento. */
  active_model_id?: string | null;
  /** Fase 3B: tipo de modelo usado para este intento. */
  model_kind?: string | null;
};
