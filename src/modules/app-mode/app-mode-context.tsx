/**
 * Purpose: React context for global AppMode (online vs offline sensor test).
 * Module: app-mode
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { isOfflineSensorTestEnabled } from '@/src/modules/app-mode/app-mode-config';
import type { AppMode } from '@/src/modules/app-mode/app-mode-types';

export type AppModeContextValue = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  resetMode: () => void;
  isOnlineMode: boolean;
  isOfflineSensorTestMode: boolean;
  offlineSensorTestEnabled: boolean;
};

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>('online');
  const offlineSensorTestEnabled = isOfflineSensorTestEnabled();

  const setMode = useCallback((next: AppMode) => {
    if (next === 'offline_sensor_test' && !isOfflineSensorTestEnabled()) {
      return;
    }
    setModeState(next);
  }, []);

  const resetMode = useCallback(() => {
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
