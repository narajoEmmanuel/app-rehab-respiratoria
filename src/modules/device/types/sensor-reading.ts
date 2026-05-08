/**
 * Purpose: Shared sensor contracts for mock and ESP32 websocket ingestion.
 * Module: device
 * Dependencies: none
 */
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
};

export type SensorConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'receiving'
  | 'error'
  | 'disconnected';

export type SensorSourceMode = 'mock' | 'websocket';

export type SensorMessageParseResult = SensorReading | null;
