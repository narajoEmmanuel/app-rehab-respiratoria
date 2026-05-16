/**
 * Tipos para el reporte de incertidumbre metrológica de la calibración local.
 */

export type UncertaintyComponent = {
  label: string;
  value: number | null;
  unit: 'mm' | 'mL';
  description: string;
  /** Si false, el componente se muestra pero no entra en uc del volumen por defecto. */
  includedInCombinedUncertainty?: boolean;
};

export type VolumeUncertaintyStatus = 'ok' | 'limited' | 'insufficient_data';

export type VolumeUncertaintyReport = {
  volumeMl: number;
  repetitions: number;
  avgDistanceMm: number;
  sdBetweenRepetitionsMm: number | null;
  uARepeatabilityDistanceMm: number | null;
  uSensorDistanceMm: number | null;
  uResolutionDistanceMm: number;
  uAlignmentDistanceMm: number;
  uCombinedDistanceMm: number | null;
  localSensitivityMlPerMm: number | null;
  uDistanceAsVolumeMl: number | null;
  uSpirometerMarkMl: number;
  /** Alias histórico; mismo valor que `uRuleGeometryCheckMl` (verificación geométrica). */
  uRuleVolumeMl: number;
  /** Incertidumbre de la regla como verificación geométrica; informativa salvo `includeRuleInCombinedUncertainty`. */
  uRuleGeometryCheckMl: number;
  includeRuleInCombinedUncertainty: boolean;
  uCombinedVolumeMl: number | null;
  expandedUncertaintyU95Ml: number | null;
  coverageFactorK: number;
  status: VolumeUncertaintyStatus;
  warnings: string[];
};

export type CalibrationUncertaintySummary = {
  averageU95Ml: number | null;
  maxU95Ml: number | null;
  volumeWithMaxU95Ml: number | null;
  minU95Ml: number | null;
  reports: VolumeUncertaintyReport[];
  components: UncertaintyComponent[];
  /** Alineado con `INCLUDE_RULE_IN_COMBINED_UNCERTAINTY` (global del procedimiento). */
  includeRuleInCombinedUncertainty: boolean;
  warnings: string[];
};

export type CalibrationUncertaintyRecommendation = {
  averageU95Ml: number | null;
  maxU95Ml: number | null;
  volumeWithMaxU95Ml: number | null;
  hasAcceptableUncertainty: boolean;
};
