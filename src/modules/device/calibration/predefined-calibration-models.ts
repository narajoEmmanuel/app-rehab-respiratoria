/**
 * Calibración predeterminada RESPIRA+ 3000 mL (validada por el equipo, banco 2026-05-30).
 *
 * Modelo activo: ecuación lineal (ver `RESPIRA_3000_PREDEFINED_DEFAULT_ACTIVE_MODEL_KIND`):
 *   Volumen = 26.11855011086812 × distanceMm − 1194.3556609431557
 * Clamp de salida: 0–3000 mL.
 *
 * Una ecuación anterior de banco (32.566738… × distanceMm − 1270.5786…) queda como referencia
 * histórica; no es la ecuación activa de la app.
 *
 * Los puntos por tramos se conservan para exportación CSV y referencia técnica (piecewise).
 */
import type { CalibrationModelKind } from '@/src/modules/device/calibration/calibration-model-types';

export const RESPIRA_3000_PREDEFINED_CALIBRATION_ID = 'cal-predefined-respira-3000-v20260530';

/** Fecha de calibración de banco validada (metadatos y UI). */
export const RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_ISO = '2026-05-30';

export const RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_MS = Date.parse(
  `${RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_ISO}T12:00:00.000Z`,
);

/** IDs de versiones anteriores de la predeterminada (migración automática en dispositivo). */
export const RESPIRA_3000_LEGACY_PREDEFINED_CALIBRATION_IDS = [
  'cal-predefined-respira-3000-v1',
  'cal-predefined-respira-3000-v20260528',
] as const;

export const RESPIRA_3000_CAPACITY_ML = 3000;

export const RESPIRA_3000_CLAMP_MIN_ML = 0;

export const RESPIRA_3000_CLAMP_MAX_ML = 3000;

export const RESPIRA_3000_DISPLAY_RANGE_ML = {
  min: RESPIRA_3000_CLAMP_MIN_ML,
  max: RESPIRA_3000_CLAMP_MAX_ML,
} as const;

/** Rango calibrado en banco (referencia exportable; extrapolación lineal permite 0–250 mL). */
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

/** Rango de distancia para estimación lineal (incluye punto 0 mL extrapolado). */
export const RESPIRA_3000_LINEAR_ESTIMATION_DISTANCE_RANGE_MM = {
  min: RESPIRA_3000_ESTIMATED_ZERO_POINT.distanceMm,
  max: RESPIRA_3000_CALIBRATED_DISTANCE_RANGE_MM.max,
} as const;

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

/** Ecuación lineal anterior de banco (referencia histórica; migrar si persiste como activa). */
export const RESPIRA_3000_LEGACY_BANK_LINEAR_MODEL = {
  slope: 32.566738,
  intercept: -1270.5786,
} as const;

export function isLegacyBankLinearCoefficients(slope: number, intercept: number): boolean {
  return (
    Math.abs(slope - RESPIRA_3000_LEGACY_BANK_LINEAR_MODEL.slope) < 1e-4 &&
    Math.abs(intercept - RESPIRA_3000_LEGACY_BANK_LINEAR_MODEL.intercept) < 1e-2
  );
}

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

/** ID trazable visible en UI (no usar IDs locales cal-*). */
export const RESPIRA_3000_DISPLAY_CALIBRATION_ID = 'R3K-20260530-LIN-v1';

export const RESPIRA_3000_SPIROMETER_MODEL_LABEL = 'MediMetrics MV1811-3';

export const RESPIRA_3000_SPIROMETER_BRAND = 'MediMetrics Medical Technologies';

export const RESPIRA_3000_SPIROMETER_MODEL = 'MV1811-3';

export const RESPIRA_3000_CALIBRATION_STATUS_LABEL = 'Validada';

export const RESPIRA_3000_MODEL_KIND_LABEL = 'Regresión lineal';

export const RESPIRA_3000_SENSOR_LABEL = 'VL53L0X / GY-530 ToF';

export const RESPIRA_3000_MICROCONTROLLER_LABEL = 'ESP32 WROOM 32 DevKit V1';

export const RESPIRA_3000_FIRMWARE_LABEL = 'envio_datos_stream_button.ino';

export const RESPIRA_3000_COMMUNICATION_LABEL = 'WiFi local + WebSocket';

export const RESPIRA_3000_OVER_RANGE_FOOTNOTE =
  'Los valores superiores a la capacidad nominal se registran como estimación fuera de rango.';

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
  return raw;
}

/** Volumen para terapia: limitado a la capacidad nominal del espirómetro. */
export function therapyVolumeMlFromPredefinedLinear(distanceMm: number): number {
  const display = volumeMlFromPredefinedLinear(distanceMm);
  return Math.min(display, RESPIRA_3000_CLAMP_MAX_ML);
}
