import { runtimeEnv } from '@/src/config/runtime-env';

/**
 * Modo de entrada de sesión: medición con sensor (por defecto) o práctica táctil.
 */
export type SessionInputMode = 'sensor' | 'touch_practice';

export type SessionDataSource = 'sensor_model' | 'touch_simulation';

export const DEFAULT_SESSION_INPUT_MODE: SessionInputMode = 'sensor';

export function dataSourceForInputMode(mode: SessionInputMode): SessionDataSource {
  return mode === 'touch_practice' ? 'touch_simulation' : 'sensor_model';
}

export function buildSessionPersistenceFields(inputMode: SessionInputMode): {
  input_mode: SessionInputMode;
  data_source: SessionDataSource;
  is_practice_session: boolean;
} {
  return {
    input_mode: inputMode,
    data_source: dataSourceForInputMode(inputMode),
    is_practice_session: inputMode === 'touch_practice',
  };
}

export function isTouchPracticeModeEnabled(): boolean {
  return (
    process.env.EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE === 'true' ||
    runtimeEnv.enableTouchPractice
  );
}

export function parseSessionInputMode(value: string | string[] | undefined): SessionInputMode {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'touch_practice') return 'touch_practice';
  return DEFAULT_SESSION_INPUT_MODE;
}

export function isTouchPracticeSession(mode: SessionInputMode): boolean {
  return mode === 'touch_practice';
}
