import {
  calculateVimFromAttempts,
  countValidOfficialAttempts,
} from '@/src/modules/diagnostics/diagnostic-evaluation-session-service';
import type { DiagnosticInputMode } from '@/src/modules/diagnostics/diagnostic-input-mode';
import type { DiagnosticAttemptRecord } from '@/src/modules/diagnostics/types';

/** Mensaje estándar cuando no hay lectura válida para evaluación oficial. */
export const INVALID_DIAGNOSTIC_VIM_MESSAGE =
  'No se obtuvo una lectura válida. Revisa el sensor e intenta nuevamente.';

export function isValidOfficialDiagnosticVim(
  vim: number,
  attemptMaxes: readonly number[],
): boolean {
  if (!Number.isFinite(vim) || vim <= 0) return false;
  return attemptMaxes.some((value) => Number.isFinite(value) && value > 0);
}

/** Valida VIM oficial a partir de intentos estructurados (fuente de verdad Fase 2). */
export function isValidOfficialDiagnosticFromAttempts(
  attempts: readonly DiagnosticAttemptRecord[],
  inputMode: DiagnosticInputMode,
): boolean {
  const vim = calculateVimFromAttempts(attempts, inputMode);
  const validCount = countValidOfficialAttempts(attempts, inputMode);
  return vim > 0 && validCount > 0;
}
