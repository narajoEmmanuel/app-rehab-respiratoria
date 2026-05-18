export type OfflineSensorTestUser = {
  id: 'local-sensor-test-user';
  name: 'Paciente local';
  source: 'offline_dev';
};

export const OFFLINE_SENSOR_TEST_USER: OfflineSensorTestUser = {
  id: 'local-sensor-test-user',
  name: 'Paciente local',
  source: 'offline_dev',
};

export const isOfflineSensorTestEnabled =
  __DEV__ && process.env.EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST === 'true';
