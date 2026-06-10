/**
 * Modalidad de entrada del diagnóstico: sensor real, touch web o práctica táctil local.
 */
import {
  DEFAULT_SESSION_INPUT_MODE,
  isTouchPracticeModeEnabled,
  isTouchPracticeSession,
  type SessionInputMode,
} from '@/src/modules/session/session-input-mode';

/** Official sensor; web touch input; local_sensor practice fallback. */
export type DiagnosticInputMode = SessionInputMode | 'touch';

export type DiagnosticInputModeParam = DiagnosticInputMode | 'auto';

export const DEFAULT_DIAGNOSTIC_INPUT_MODE: DiagnosticInputMode = DEFAULT_SESSION_INPUT_MODE;

export function parseDiagnosticInputModeParam(
  value: string | string[] | undefined,
): DiagnosticInputModeParam {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'touch_practice') return 'touch_practice';
  if (raw === 'touch') return 'touch';
  if (raw === 'auto') return 'auto';
  return DEFAULT_DIAGNOSTIC_INPUT_MODE;
}

export function parseDiagnosticInputMode(
  value: string | string[] | undefined,
): DiagnosticInputMode {
  const parsed = parseDiagnosticInputModeParam(value);
  if (parsed === 'auto') return DEFAULT_DIAGNOSTIC_INPUT_MODE;
  return parsed;
}

export function isTouchDiagnosticUiAllowed(): boolean {
  return isTouchPracticeModeEnabled() || __DEV__;
}

/** @deprecated Use isTouchDiagnosticUiAllowed */
export function isTouchPracticeDiagnosticUiAllowed(): boolean {
  return isTouchDiagnosticUiAllowed();
}

/**
 * Resuelve modo explícito en URL. `auto` y ausencia de param se resuelven en pantalla
 * según readiness + touch fallback.
 */
export function resolveDiagnosticInputMode(
  value: string | string[] | undefined,
): DiagnosticInputMode {
  const parsed = parseDiagnosticInputModeParam(value);
  if (parsed === 'touch' && isTouchDiagnosticUiAllowed()) {
    return 'touch';
  }
  if (parsed === 'touch_practice' && isTouchDiagnosticUiAllowed()) {
    return 'touch_practice';
  }
  return DEFAULT_DIAGNOSTIC_INPUT_MODE;
}

export function isTouchPracticeDiagnostic(mode: DiagnosticInputMode): boolean {
  if (mode === 'touch') return true;
  return isTouchPracticeSession(mode);
}

export { isTouchDiagnosticInputMode, isDiagnosticPracticeOnly } from './diagnostic-measurement-metadata';
