/**
 * Purpose: Shared sensor contracts for mock and ESP32 websocket ingestion.
 * Module: device
 * Dependencies: none
 */
export type SensorFlowState = 'idle' | 'inhaling' | 'holding' | 'exhaling';

export type SensorReading = {
  timestamp: number;
  volumeMl: number;
  sustainedTimeMs: number;
  validRepetitions: number;
  distanceMm?: number;
  flowState?: SensorFlowState;
  isValidAttempt?: boolean;
  source: 'mock' | 'websocket';
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
