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
