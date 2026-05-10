/**
 * Purpose: Read build-time flags for app modes (Expo public env).
 * Module: app-mode
 */

/**
 * When `true`, the app expects online Supabase auth and cloud-backed consent/profile flows.
 * When not `"true"`, the build runs in local-first prototype mode (no online login required).
 */
export function isCloudAuthEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_CLOUD_AUTH === 'true';
}

/**
 * True when offline sensor test entry is allowed (development + env flag).
 * Does not imply the user has selected `offline_sensor_test` mode.
 */
export function isOfflineSensorTestEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST === 'true';
}

/**
 * Hardware Lab routes are reachable from the sensor connection flow without the legacy dev-only gate,
 * when cloud auth is disabled, or under the historical DEV + OFFLINE_SENSOR_TEST flag.
 */
export function isHardwareLabAccessible(): boolean {
  return !isCloudAuthEnabled() || isOfflineSensorTestEnabled();
}
