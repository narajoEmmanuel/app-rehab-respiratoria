/**
 * Runtime guards for ESP32 sensor connection (Phase 2 migration).
 *
 * Sensor transport is allowed only when explicitly enabled and not in web_touch mode.
 * Existing local_sensor builds keep default behavior (enableSensor=true, isWebTouch=false).
 */

import { runtimeEnv } from '@/src/config/runtime-env';

/** True when ESP32 WebSocket / local WiFi sensor flows may run. */
export function isSensorRuntimeEnabled(): boolean {
  return runtimeEnv.enableSensor && !runtimeEnv.isWebTouch;
}
