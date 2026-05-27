export type SensorFlowState = 'idle' | 'inhaling' | 'holding' | 'exhaling';

/**
 * Origen del SensorReading.
 * - 'mock' / 'simulated': generado por la app sin hardware.
 * - 'websocket': fallback genérico cuando el ESP32 no envía `source`.
 * - 'raw_sensor' / 'processed': valores reales reportados por el firmware ESP32.
 * El `(string & {})` mantiene autocompletado pero permite valores futuros.
 */
export type SensorSource =
  | 'mock'
  | 'simulated'
  | 'websocket'
  | 'raw_sensor'
  | 'processed'
  | (string & {});

export type SensorStatus = 'ok' | 'out_of_range' | 'initializing' | 'error' | (string & {});

export type SensorReading = {
  timestamp: number;
  volumeMl: number;
  sustainedTimeMs: number;
  validRepetitions: number;
  distanceMm?: number;
  rawDistanceMm?: number;
  distanceValid?: boolean;
  flowState?: SensorFlowState;
  isValidAttempt?: boolean;
  source?: SensorSource;
  /** Fase 3D.2: versión del firmware ESP32 que generó esta lectura. */
  firmwareVersion?: string;
  /** Fase 3D.2: identificador único del dispositivo ESP32. */
  deviceId?: string;
  /** Fase 3D.2: timestamp en ms desde boot (convive con timestamp para migración). */
  timestampMs?: number;
  /** Fase 3D.2: estado del sensor reportado por firmware. */
  sensorStatus?: SensorStatus;
  /** Fase 3D.2: número de muestras válidas acumuladas por el firmware. */
  sampleCount?: number;
  /** Fase 3D.2: etiqueta del filtro aplicado en firmware (ej. "ema_0.35"). */
  filter?: string;
};

export type SensorConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'receiving'
  | 'error'
  | 'disconnected';

export type SensorSourceMode = 'mock' | 'websocket';

/**
 * Estado del flujo de datos del sensor (WebSocket conectado ≠ datos en vivo).
 */
export type SensorStreamState =
  | 'idle'
  | 'connected_waiting_stream'
  | 'receiving_data'
  | 'stream_paused';

export type SensorMessageParseResult = SensorReading | null;
