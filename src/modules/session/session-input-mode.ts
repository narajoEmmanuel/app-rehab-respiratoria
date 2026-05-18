/**
 * Modo de entrada de sesión: medición con sensor (por defecto) o práctica táctil (desarrollo).
 */
export type SessionInputMode = 'sensor' | 'touch_practice';

export const DEFAULT_SESSION_INPUT_MODE: SessionInputMode = 'sensor';

export function isTouchPracticeModeEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_TOUCH_PRACTICE_MODE === 'true';
}

export function parseSessionInputMode(value: string | string[] | undefined): SessionInputMode {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'touch_practice') return 'touch_practice';
  return DEFAULT_SESSION_INPUT_MODE;
}

export function isTouchPracticeSession(mode: SessionInputMode): boolean {
  return mode === 'touch_practice';
}
