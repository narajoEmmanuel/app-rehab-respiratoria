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
  /**
   * calibration_profile_id: opcional porque sesiones pre-3B y modo práctica no tienen calibración.
   * Si es null, indica que no se usó calibración para esta sesión.
   */
  calibration_profile_id?: string | null;
  /** Modelo activo usado para estimar volumen. null en sesiones pre-3B o modo práctica. */
  active_model_id?: string | null;
  /** Tipo de modelo ('linear_regression' | 'piecewise_linear'). null si sin calibración. */
  model_kind?: 'linear_regression' | 'piecewise_linear' | string | null;
  /** ID del dispositivo espirómetro físico. null si sin calibración. */
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
  /**
   * distance_mm: distancia (mm) usada para la estimación de volumen.
   * Puede diferir de raw_distance_mm si se aplicó filtrado o suavizado.
   */
  distance_mm?: number | null;
  /** Distancia cruda (mm) reportada por el sensor antes de cualquier filtro. */
  raw_distance_mm?: number | null;
  /** Distancia filtrada (mm) si el sistema aplica filtro antes de estimar volumen. */
  filtered_distance_mm?: number | null;
  /**
   * true si distance_mm cae dentro del rango de distancias calibradas y el
   * volumen resultante no fue clamped. null si no hay calibración activa o es modo práctica.
   */
  in_calibrated_range?: boolean | null;
  /**
   * true si la estimación de volumen fue limitada al mín/máx del modelo calibrado,
   * o si la distancia cae fuera del rango de distancias calibradas.
   * null si no hay calibración activa o es modo práctica.
   */
  clamped?: boolean | null;
  /** calibration_profile_id: opcional, identifica el perfil de calibración vigente. null si modo práctica. */
  calibration_profile_id?: string | null;
  /** active_model_id: modelo activo usado para estimar volumen. null si modo práctica. */
  active_model_id?: string | null;
  /** model_kind: tipo de modelo ('linear_regression' | 'piecewise_linear'). null si modo práctica. */
  model_kind?: string | null;
};
