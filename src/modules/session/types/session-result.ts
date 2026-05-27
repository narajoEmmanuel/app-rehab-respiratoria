import type { LevelId } from '@/src/modules/levels/types/level-progress';
import type { SessionDataSource, SessionInputMode } from '@/src/modules/session/session-input-mode';
import type { SensorAttemptEvaluationStatus } from '@/src/modules/session/sensor-evaluation/sensor-attempt-evaluation-types';
import type { OfficialAttemptValidationSource } from '@/src/modules/session/sensor-evaluation/session-attempt-validation-types';

export type SessionResultStatus = 'completed' | 'interrupted';

export type SessionAttemptResult = {
  valid: boolean;
  holdMs: number;
  /** Volumen pico para agregados de sesión; en sensor = volumen oficial estimado. */
  peakVolume: number;
  inputMode?: SessionInputMode;
  dataSource?: SessionDataSource;
  officialVolumeMl?: number | null;
  sensorEstimatedVolumeMl?: number | null;
  sensorU95Ml?: number | null;
  sensorConfidenceLabel?: string | null;
  sensorVolumeReachedConservatively?: boolean;
  sensorAttemptStatus?: SensorAttemptEvaluationStatus | null;
  /** Fase 3B: distancia usada para la estimación de volumen. */
  distanceMm?: number | null;
  /** Fase 3B: distancia cruda del sensor. */
  rawDistanceMm?: number | null;
  /** Fase 3B: true si la distancia cae dentro del rango calibrado. */
  inCalibratedRange?: boolean | null;
  /** Fase 3B: true si el volumen fue clamped. */
  clamped?: boolean | null;
  /** Fase 3B: ID del perfil de calibración usado. */
  calibrationProfileId?: string | null;
  /** Fase 3B: ID del modelo activo usado. */
  activeModelId?: string | null;
  /** Fase 3B: tipo de modelo usado. */
  modelKind?: string | null;
  /** Fase 3D.2: versión del firmware ESP32 al momento del intento. */
  firmwareVersion?: string | null;
  /** Fase 3D.2: ID del dispositivo ESP32 al momento del intento. */
  deviceId?: string | null;
};

export type SessionResult = {
  patientId: number;
  patientLevelId: number;
  levelId: LevelId;
  status: SessionResultStatus;
  validAttempts: number;
  invalidAttempts: number;
  totalAttempts: number;
  compliancePercent: number;
  maxVolumeMl: number;
  avgVolumeMl: number;
  avgHoldSeconds: number;
  completed: boolean;
  interrupted: boolean;
  perfect: boolean;
  attempts: SessionAttemptResult[];
  inputMode: SessionInputMode;
  dataSource: SessionDataSource;
  isPracticeSession: boolean;
  officialValidationSource?: OfficialAttemptValidationSource;
  maxSensorEstimatedVolumeMl?: number | null;
  maxSensorU95Ml?: number | null;
  /** Fase 3B: trazabilidad metrológica de la sesión. */
  calibrationProfileId?: string | null;
  activeModelId?: string | null;
  modelKind?: string | null;
  spirometerDeviceId?: string | null;
  calibrationCreatedAt?: number | null;
  calibrationUpdatedAt?: number | null;
  /** Fase 3D.2: versión del firmware ESP32 activo durante la sesión. */
  firmwareVersion?: string | null;
  /** Fase 3D.2: ID del dispositivo ESP32 activo durante la sesión. */
  deviceId?: string | null;
  /** Fase 3D.2: estado del sensor al momento de guardar. */
  sensorStatus?: string | null;
  /** Fase 3D.2: filtro usado en firmware. */
  sensorFilter?: string | null;
};
