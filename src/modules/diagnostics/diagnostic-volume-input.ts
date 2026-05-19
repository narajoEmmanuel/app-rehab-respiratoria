/** Ramp táctil para llenar el globo en diagnóstico de práctica (~5 s a volumen máximo). */
const PRACTICE_DIAGNOSTIC_RAMP_MS = 4500;

export function simulatedDiagnosticVolumeForHold(maxVolumeMl: number, holdMs: number): number {
  return Math.round(
    Math.max(0, maxVolumeMl * Math.min(1.05, holdMs / PRACTICE_DIAGNOSTIC_RAMP_MS)),
  );
}

export function decayDiagnosticVolume(currentMl: number, stepMax = 140): number {
  return Math.max(0, currentMl - (Math.floor(Math.random() * 50) + Math.min(stepMax, 90)));
}
