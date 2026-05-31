/**
 * Calibración predeterminada RESPIRA+ 3000 mL (validada por el equipo, banco 2026-05-30).
 *
 * Modelo activo: ecuación lineal (ver `RESPIRA_3000_PREDEFINED_DEFAULT_ACTIVE_MODEL_KIND`).
 * Los puntos por tramos se conservan para exportación CSV y referencia técnica (piecewise).
 */
import type { CalibrationModelKind } from '@/src/modules/device/calibration/calibration-model-types';

export const RESPIRA_3000_PREDEFINED_CALIBRATION_ID = 'cal-predefined-respira-3000-v20260530';

/** IDs de versiones anteriores de la predeterminada (migración automática en dispositivo). */
export const RESPIRA_3000_LEGACY_PREDEFINED_CALIBRATION_IDS = [
  'cal-predefined-respira-3000-v1',
] as const;

export const RESPIRA_3000_CAPACITY_ML = 3000;

export const RESPIRA_3000_CLAMP_MIN_ML = 0;

export const RESPIRA_3000_CLAMP_MAX_ML = 3000;

export const RESPIRA_3000_DISPLAY_RANGE_ML = {
  min: RESPIRA_3000_CLAMP_MIN_ML,
  max: RESPIRA_3000_CLAMP_MAX_ML,
} as const;

/** Rango calibrado en banco (referencia exportable; el modelo activo usa clamp 0–3000). */
export const RESPIRA_3000_CALIBRATED_RANGE_ML = { min: 250, max: 3000 } as const;

export const RESPIRA_3000_CALIBRATED_DISTANCE_RANGE_MM = {
  min: 57.75,
  max: 162.74102564102566,
} as const;

export type PredefinedCalibrationPoint = {
  volumeMl: number;
  distanceMm: number;
  estimated?: boolean;
};

/** Extrapolación lineal a 0 mL (solo referencia piecewise / CSV). */
export const RESPIRA_3000_ESTIMATED_ZERO_POINT: PredefinedCalibrationPoint = {
  volumeMl: 0,
  distanceMm: 45.72758365021489,
  estimated: true,
};

/** Promedios por volumen de referencia (60 repeticiones en banco, 12 volúmenes). */
export const RESPIRA_3000_CALIBRATED_POINTS: readonly PredefinedCalibrationPoint[] = [
  { volumeMl: 250, distanceMm: 57.75 },
  { volumeMl: 500, distanceMm: 67.07941176470588 },
  { volumeMl: 750, distanceMm: 75.72583333333334 },
  { volumeMl: 1000, distanceMm: 83.91894736842104 },
  { volumeMl: 1250, distanceMm: 91.99894736842106 },
  { volumeMl: 1500, distanceMm: 100.98666666666666 },
  { volumeMl: 1750, distanceMm: 108.95383556931544 },
  { volumeMl: 2000, distanceMm: 119.13581699346405 },
  { volumeMl: 2250, distanceMm: 130.58406220542443 },
  { volumeMl: 2500, distanceMm: 143.31552373581013 },
  { volumeMl: 2750, distanceMm: 153.14476944624005 },
  { volumeMl: 3000, distanceMm: 162.74102564102566 },
] as const;

/** Referencia por tramos (solo CSV / auditoría; no es el modelo activo). */
export const RESPIRA_3000_PIECEWISE_REFERENCE_POINTS: readonly PredefinedCalibrationPoint[] = [
  RESPIRA_3000_ESTIMATED_ZERO_POINT,
  ...RESPIRA_3000_CALIBRATED_POINTS,
];

/** Modelo lineal activo predeterminado. */
export const RESPIRA_3000_LINEAR_MODEL = {
  slope: 26.11855011086812,
  intercept: -1194.3556609431557,
  rSquared: 0.9955444042596941,
  maeMl: 52.625151681479586,
  rmseMl: 57.60634146875932,
  maxAbsErrorMl: 98.6394468547046,
} as const;

/** @deprecated Usar RESPIRA_3000_LINEAR_MODEL */
export const RESPIRA_3000_LINEAR_FALLBACK = RESPIRA_3000_LINEAR_MODEL;

export const RESPIRA_3000_PREDEFINED_DEFAULT_ACTIVE_MODEL_KIND: CalibrationModelKind =
  'linear_regression';

export const RESPIRA_3000_PREDEFINED_SOURCE = 'team_validated' as const;

export const RESPIRA_3000_PREDEFINED_ORIGIN_LABEL =
  'Calibración RESPIRA+ 3000 mL validada (2026-05-30)';

export function isRespira3000LegacyPredefinedProfileId(profileId: string): boolean {
  return (RESPIRA_3000_LEGACY_PREDEFINED_CALIBRATION_IDS as readonly string[]).includes(
    profileId,
  );
}

export function isRespira3000PredefinedProfileId(profileId: string): boolean {
  return (
    profileId === RESPIRA_3000_PREDEFINED_CALIBRATION_ID ||
    isRespira3000LegacyPredefinedProfileId(profileId)
  );
}

export function volumeMlFromPredefinedLinear(distanceMm: number): number {
  const raw =
    RESPIRA_3000_LINEAR_MODEL.slope * distanceMm + RESPIRA_3000_LINEAR_MODEL.intercept;
  if (!Number.isFinite(raw)) return 0;
  if (raw < RESPIRA_3000_CLAMP_MIN_ML) return RESPIRA_3000_CLAMP_MIN_ML;
  if (raw > RESPIRA_3000_CLAMP_MAX_ML) return RESPIRA_3000_CLAMP_MAX_ML;
  return raw;
}
