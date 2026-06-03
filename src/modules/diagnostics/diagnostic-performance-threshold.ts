/** Umbral de logro: VIM ≥ 95 % del máximo del rango calibrado activo. */
export const DIAGNOSTIC_HIGH_PERFORMANCE_RATIO = 0.95;

export function isDiagnosticHighPerformance(
  finalVimMl: number,
  calibratedRangeMaxMl: number | null | undefined,
): boolean {
  if (
    !Number.isFinite(finalVimMl) ||
    finalVimMl <= 0 ||
    calibratedRangeMaxMl == null ||
    !Number.isFinite(calibratedRangeMaxMl) ||
    calibratedRangeMaxMl <= 0
  ) {
    return false;
  }
  return finalVimMl >= calibratedRangeMaxMl * DIAGNOSTIC_HIGH_PERFORMANCE_RATIO;
}
