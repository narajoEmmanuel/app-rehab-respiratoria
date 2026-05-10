/**
 * Purpose: React context for global AppMode (online vs offline without cloud).
 * Module: app-mode
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { isOfflineSensorTestEnabled } from '@/src/modules/app-mode/app-mode-config';
import { getPersistedAppMode, persistAppMode } from '@/src/modules/app-mode/app-mode-storage';
import type { AppMode } from '@/src/modules/app-mode/app-mode-types';

export type AppModeContextValue = {
  mode: AppMode;
  setMode: (mode: AppMode) => Promise<void>;
  resetMode: () => Promise<void>;
  isOnlineMode: boolean;
  isOfflineSensorTestMode: boolean;
  offlineSensorTestEnabled: boolean;
};

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>('online');
  const offlineSensorTestEnabled = isOfflineSensorTestEnabled();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let next = await getPersistedAppMode();
      if (next === 'offline_sensor_test' && !isOfflineSensorTestEnabled()) {
        await persistAppMode('online');
        next = 'online';
      }
      if (!cancelled) {
        setModeState(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback(async (next: AppMode) => {
    if (next === 'offline_sensor_test' && !isOfflineSensorTestEnabled()) {
      return;
    }
    await persistAppMode(next);
    setModeState(next);
  }, []);

  const resetMode = useCallback(async () => {
    await persistAppMode('online');
    setModeState('online');
  }, []);

  const value = useMemo<AppModeContextValue>(
    () => ({
      mode,
      setMode,
      resetMode,
      isOnlineMode: mode === 'online',
      isOfflineSensorTestMode: mode === 'offline_sensor_test',
      offlineSensorTestEnabled,
    }),
    [mode, setMode, resetMode, offlineSensorTestEnabled],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): AppModeContextValue {
  const ctx = useContext(AppModeContext);
  if (!ctx) {
    throw new Error('useAppMode must be used within AppModeProvider');
  }
  return ctx;
}
