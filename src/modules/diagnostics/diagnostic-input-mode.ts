/**
 * Modalidad de entrada del diagnóstico: sensor real o simulación táctil.
 */
import {
  DEFAULT_SESSION_INPUT_MODE,
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

export function isTouchPracticeDiagnostic(mode: DiagnosticInputMode): boolean {
  return isTouchPracticeSession(mode);
}
