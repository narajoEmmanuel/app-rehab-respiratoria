/**
 * Modalidad de entrada del diagnóstico: sensor real o simulación táctil.
 */
import {
  DEFAULT_SESSION_INPUT_MODE,
  isTouchPracticeModeEnabled,
  isTouchPracticeSession,
  parseSessionInputMode,
  type SessionInputMode,
} from '@/src/modules/session/session-input-mode';

export type DiagnosticInputMode = SessionInputMode;

export const DEFAULT_DIAGNOSTIC_INPUT_MODE: DiagnosticInputMode = DEFAULT_SESSION_INPUT_MODE;

export function parseDiagnosticInputMode(
  value: string | string[] | undefined,
): DiagnosticInputMode {
  return parseSessionInputMode(value);
}

/** Touch practice solo vía ruta manual cuando la flag o dev lo permiten — nunca en flujo paciente. */
export function isTouchPracticeDiagnosticUiAllowed(): boolean {
  return isTouchPracticeModeEnabled() || __DEV__;
}

/**
 * Resuelve el modo efectivo: touch_practice solo si viene explícito en la URL y está permitido;
 * en cualquier otro caso, sensor.
 */
export function resolveDiagnosticInputMode(
  value: string | string[] | undefined,
): DiagnosticInputMode {
  const parsed = parseDiagnosticInputMode(value);
  if (parsed === 'touch_practice' && isTouchPracticeDiagnosticUiAllowed()) {
    return 'touch_practice';
  }
  return DEFAULT_DIAGNOSTIC_INPUT_MODE;
}

export function isTouchPracticeDiagnostic(mode: DiagnosticInputMode): boolean {
  return isTouchPracticeSession(mode);
}
