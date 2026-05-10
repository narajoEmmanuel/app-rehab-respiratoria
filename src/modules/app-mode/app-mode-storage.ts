/**
 * Purpose: Persist global AppMode for repositories and non-React code paths.
 * Module: app-mode
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppMode } from '@/src/modules/app-mode/app-mode-types';

const STORAGE_KEY = '@respira_app_mode_v1';

export async function getPersistedAppMode(): Promise<AppMode> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === 'offline_sensor_test' || raw === 'online') {
    return raw;
  }
  return 'online';
}

export async function persistAppMode(mode: AppMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, mode);
}
