/**
 * Purpose: Read build-time flags for app modes (Expo public env).
 * Module: app-mode
 */

/**
 * True when offline sensor test entry is allowed (development + env flag).
 * Does not imply the user has selected `offline_sensor_test` mode.
 */
export function isOfflineSensorTestEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST === 'true';
}
