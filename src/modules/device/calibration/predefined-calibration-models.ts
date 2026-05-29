/**
 * Calibración predeterminada RESPIRA+ 3000 mL (validada por el equipo).
 *
 * Modelo activo: ecuación lineal (ver `RESPIRA_3000_PREDEFINED_DEFAULT_ACTIVE_MODEL_KIND`).
 * Los puntos por tramos se conservan solo para exportación CSV y referencia técnica.
 */
import type { CalibrationModelKind } from '@/src/modules/device/calibration/calibration-model-types';

export const RESPIRA_3000_PREDEFINED_CALIBRATION_ID = 'cal-predefined-respira-3000-v1';

export const RESPIRA_3000_CAPACITY_ML = 3000;

export const RESPIRA_3000_CLAMP_MIN_ML = 0;

export const RESPIRA_3000_CLAMP_MAX_ML = 3000;

export const RESPIRA_3000_DISPLAY_RANGE_ML = {
  min: RESPIRA_3000_CLAMP_MIN_ML,
  max: RESPIRA_3000_CLAMP_MAX_ML,
} as const;

/** Rango calibrado en banco (referencia exportable; el modelo activo usa clamp 0–3000). */
export const RESPIRA_3000_CALIBRATED_RANGE_ML = { min: 250, max: 3000 } as const;

export type PredefinedCalibrationPoint = {
  volumeMl: number;
  distanceMm: number;
  estimated?: boolean;
};

export const RESPIRA_3000_ESTIMATED_ZERO_POINT: PredefinedCalibrationPoint = {
  volumeMl: 0,
  distanceMm: 38.339523,
  estimated: true,
};

export const RESPIRA_3000_CALIBRATED_POINTS: readonly PredefinedCalibrationPoint[] = [
  { volumeMl: 250, distanceMm: 46.648928 },
  { volumeMl: 500, distanceMm: 54.958333 },
  { volumeMl: 750, distanceMm: 61.747949 },
  { volumeMl: 1000, distanceMm: 69.35872 },
  { volumeMl: 1250, distanceMm: 77.99771 },
  { volumeMl: 1500, distanceMm: 85.06557 },
  { volumeMl: 1750, distanceMm: 92.007663 },
  { volumeMl: 2000, distanceMm: 99.638158 },
  { volumeMl: 2250, distanceMm: 108.74085 },
  { volumeMl: 2500, distanceMm: 116.46308 },
  { volumeMl: 2750, distanceMm: 123.410714 },
  { volumeMl: 3000, distanceMm: 130.9081 },
] as const;

/** Referencia por tramos (solo CSV / auditoría; no es el modelo activo). */
export const RESPIRA_3000_PIECEWISE_REFERENCE_POINTS: readonly PredefinedCalibrationPoint[] = [
  RESPIRA_3000_ESTIMATED_ZERO_POINT,
  ...RESPIRA_3000_CALIBRATED_POINTS,
];

/** Modelo lineal activo predeterminado. */
export const RESPIRA_3000_LINEAR_MODEL = {
  slope: 32.566738232013954,
  intercept: -1270.5786467848384,
  rSquared: 0.9996405056018145,
  maeMl: 13.631250080124175,
  rmseMl: 16.363020258556695,
  maxAbsErrorMl: 25.68884070686954,
} as const;

/** @deprecated Usar RESPIRA_3000_LINEAR_MODEL */
export const RESPIRA_3000_LINEAR_FALLBACK = RESPIRA_3000_LINEAR_MODEL;

export const RESPIRA_3000_PREDEFINED_DEFAULT_ACTIVE_MODEL_KIND: CalibrationModelKind =
  'linear_regression';

export const RESPIRA_3000_PREDEFINED_SOURCE = 'team_validated' as const;

export const RESPIRA_3000_PREDEFINED_ORIGIN_LABEL = 'Calibración RESPIRA+ validada';

export function isRespira3000PredefinedProfileId(profileId: string): boolean {
  return profileId === RESPIRA_3000_PREDEFINED_CALIBRATION_ID;
}

export function volumeMlFromPredefinedLinear(distanceMm: number): number {
  const raw =
    RESPIRA_3000_LINEAR_MODEL.slope * distanceMm + RESPIRA_3000_LINEAR_MODEL.intercept;
  if (!Number.isFinite(raw)) return 0;
  if (raw < RESPIRA_3000_CLAMP_MIN_ML) return RESPIRA_3000_CLAMP_MIN_ML;
  if (raw > RESPIRA_3000_CLAMP_MAX_ML) return RESPIRA_3000_CLAMP_MAX_ML;
  return raw;
}
