/**
 * Purpose: Distinguish real hardware transport from mock/offline for touch-practice gating.
 * Module: device
 */

import type { SensorConnectionStatus, SensorSourceMode } from '@/src/modules/device/types/sensor-reading';

/**
 * True when the app has an active link to a real sensor (WebSocket transport).
 * Does not use reading.sensorStatus ('ok') — only connection transport status.
 * Mock/simulation mode is never treated as connected.
 */
export function isRealSensorTransportConnected(
  connectionStatus: SensorConnectionStatus,
  sourceMode: SensorSourceMode,
): boolean {
  if (sourceMode === 'mock') return false;
  return connectionStatus === 'connected' || connectionStatus === 'receiving';
}
