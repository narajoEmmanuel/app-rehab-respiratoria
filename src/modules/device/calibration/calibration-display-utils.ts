/**
 * Utilidades de presentación para calibración predeterminada (fecha, volumen visible).
 */
import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import type { ActiveVolumeEstimateResult } from '@/src/modules/device/calibration/active-volume-estimation-types';
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';
import {
  RESPIRA_3000_CALIBRATION_STATUS_LABEL,
  RESPIRA_3000_CAPACITY_ML,
  RESPIRA_3000_COMMUNICATION_LABEL,
  RESPIRA_3000_DISPLAY_CALIBRATION_ID,
  RESPIRA_3000_FIRMWARE_LABEL,
  RESPIRA_3000_LINEAR_MODEL,
  RESPIRA_3000_MICROCONTROLLER_LABEL,
  RESPIRA_3000_MODEL_KIND_LABEL,
  RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_ISO,
  RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_MS,
  RESPIRA_3000_PREDEFINED_CALIBRATION_ID,
  RESPIRA_3000_PREDEFINED_SOURCE,
  RESPIRA_3000_SENSOR_LABEL,
  RESPIRA_3000_SPIROMETER_MODEL_LABEL,
  isLegacyBankLinearCoefficients,
  isRespira3000PredefinedProfileId,
} from '@/src/modules/device/calibration/predefined-calibration-models';
import { SPIROMETER_DEVICE_3000ML_ID } from '@/src/modules/device/spirometer';

export const VOLUME_OVER_RANGE_HELPER = 'Sobre el rango del espirómetro';

export type CalibrationDisplayMetadata = {
  displayCalibrationId: string;
  internalCalibrationId: string;
  calibrationDateIso: string;
  calibrationDateLabel: string;
  calibrationDateShort: string;
  spirometerModel: string;
  modelKind: string;
  statusLabel: string;
  equationLabel: string;
  equationHint: string;
  slope: number;
  intercept: number;
  rSquared: number;
  maeMl: number;
  rmseMl: number;
  maxAbsErrorMl: number;
  capacityMl: number;
  sensorLabel: string;
  microcontrollerLabel: string;
  firmwareLabel: string;
  communicationLabel: string;
};

export function isPredefinedTeamValidatedProfile(profile: CalibrationProfile): boolean {
  return profile.source === 'team_validated' && isRespira3000PredefinedProfileId(profile.id);
}

export function isOfficialPredefinedCalibrationContext(
  profile: CalibrationProfile | null | undefined,
  activeModel?: ActiveCalibrationModel | null,
): boolean {
  if (profile && isPredefinedTeamValidatedProfile(profile)) return true;

  const predefinedId =
    activeModel?.predefinedCalibration?.predefinedId ?? activeModel?.calibrationProfileId;
  if (predefinedId && isRespira3000PredefinedProfileId(predefinedId)) return true;

  return activeModel?.predefinedCalibration?.source === RESPIRA_3000_PREDEFINED_SOURCE;
}

function matchesOfficialLinearCoefficients(slope: number, intercept: number): boolean {
  return (
    Math.abs(slope - RESPIRA_3000_LINEAR_MODEL.slope) < 1e-6 &&
    Math.abs(intercept - RESPIRA_3000_LINEAR_MODEL.intercept) < 1e-3
  );
}

function isGeneratedLocalCalibrationProfileId(profileId: string): boolean {
  return profileId.startsWith('cal-') && !isRespira3000PredefinedProfileId(profileId);
}

function readActiveLinearCoefficients(activeModel?: ActiveCalibrationModel | null): {
  slope: number | null;
  intercept: number | null;
} {
  const slope =
    activeModel?.linearModel?.coefficients.slope ??
    activeModel?.recommendedModel?.coefficients.slope ??
    null;
  const intercept =
    activeModel?.linearModel?.coefficients.intercept ??
    activeModel?.recommendedModel?.coefficients.intercept ??
    null;
  return {
    slope: typeof slope === 'number' && Number.isFinite(slope) ? slope : null,
    intercept: typeof intercept === 'number' && Number.isFinite(intercept) ? intercept : null,
  };
}

function isExplicitUserCustomCalibration(
  profile: CalibrationProfile | null | undefined,
  activeModel?: ActiveCalibrationModel | null,
): boolean {
  if (!profile || profile.source !== 'local_calibration' || profile.points.length === 0) {
    return false;
  }
  const { slope, intercept } = readActiveLinearCoefficients(activeModel);
  if (slope === null || intercept === null) return false;
  if (matchesOfficialLinearCoefficients(slope, intercept)) return false;
  if (isLegacyBankLinearCoefficients(slope, intercept)) return false;
  return true;
}

/** RESPIRA+ 3000 mL usa metadatos oficiales salvo calibración local nueva distinta elegida por el usuario. */
export function shouldUseOfficialRespira3000DisplayMetadata(
  profile: CalibrationProfile | null | undefined,
  activeModel?: ActiveCalibrationModel | null,
): boolean {
  if (isExplicitUserCustomCalibration(profile, activeModel)) return false;
  if (isOfficialPredefinedCalibrationContext(profile, activeModel)) return true;
  if (activeModel?.predefinedCalibration?.source === RESPIRA_3000_PREDEFINED_SOURCE) return true;

  const profileId = profile?.id ?? activeModel?.calibrationProfileId;
  if (profileId && isGeneratedLocalCalibrationProfileId(profileId)) return true;

  const deviceId = profile?.spirometerDeviceId ?? activeModel?.spirometerDeviceId;
  if (deviceId && deviceId !== SPIROMETER_DEVICE_3000ML_ID) return false;

  const { slope, intercept } = readActiveLinearCoefficients(activeModel);
  if (slope !== null && intercept !== null) {
    if (isLegacyBankLinearCoefficients(slope, intercept)) return true;
    if (matchesOfficialLinearCoefficients(slope, intercept)) return true;
  }

  return true;
}

function resolveLinearMetrics(activeModel?: ActiveCalibrationModel | null) {
  if (shouldUseOfficialRespira3000DisplayMetadata(undefined, activeModel)) {
    return { ...RESPIRA_3000_LINEAR_MODEL };
  }

  const modelMetrics = activeModel?.linearModel?.metrics;
  const predefinedMetrics = activeModel?.predefinedCalibration?.linearModel;
  const slope =
    activeModel?.linearModel?.coefficients.slope ??
    predefinedMetrics?.slope ??
    RESPIRA_3000_LINEAR_MODEL.slope;
  const intercept =
    activeModel?.linearModel?.coefficients.intercept ??
    predefinedMetrics?.intercept ??
    RESPIRA_3000_LINEAR_MODEL.intercept;

  return {
    slope,
    intercept,
    rSquared: modelMetrics?.rSquared ?? predefinedMetrics?.rSquared ?? RESPIRA_3000_LINEAR_MODEL.rSquared,
    maeMl: modelMetrics?.maeMl ?? predefinedMetrics?.maeMl ?? RESPIRA_3000_LINEAR_MODEL.maeMl,
    rmseMl: modelMetrics?.rmseMl ?? predefinedMetrics?.rmseMl ?? RESPIRA_3000_LINEAR_MODEL.rmseMl,
    maxAbsErrorMl:
      modelMetrics?.maxAbsErrorMl ??
      predefinedMetrics?.maxAbsErrorMl ??
      RESPIRA_3000_LINEAR_MODEL.maxAbsErrorMl,
  };
}

export function formatCompactEquationLabel(slope: number, intercept: number): string {
  const slopeText = slope.toFixed(4);
  const interceptText = Math.abs(intercept).toFixed(2);
  const sign = intercept < 0 ? '−' : '+';
  return `V = ${slopeText} · d ${sign} ${interceptText}`;
}

function formatOfficialDateLabel(): string {
  try {
    return new Date(RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_MS).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '30 de mayo de 2026';
  }
}

function formatOfficialDateShort(): string {
  try {
    return new Date(RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_MS).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '30 May 2026';
  }
}

function buildOfficialDisplayMetadata(): CalibrationDisplayMetadata {
  const { slope, intercept, rSquared, maeMl, rmseMl, maxAbsErrorMl } = RESPIRA_3000_LINEAR_MODEL;
  return {
    displayCalibrationId: RESPIRA_3000_DISPLAY_CALIBRATION_ID,
    internalCalibrationId: RESPIRA_3000_PREDEFINED_CALIBRATION_ID,
    calibrationDateIso: RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_ISO,
    calibrationDateLabel: formatOfficialDateLabel(),
    calibrationDateShort: formatOfficialDateShort(),
    spirometerModel: RESPIRA_3000_SPIROMETER_MODEL_LABEL,
    modelKind: RESPIRA_3000_MODEL_KIND_LABEL,
    statusLabel: RESPIRA_3000_CALIBRATION_STATUS_LABEL,
    equationLabel: formatCompactEquationLabel(slope, intercept),
    equationHint: 'd = distancia medida por el sensor en mm',
    slope,
    intercept,
    rSquared,
    maeMl,
    rmseMl,
    maxAbsErrorMl,
    capacityMl: RESPIRA_3000_CAPACITY_ML,
    sensorLabel: RESPIRA_3000_SENSOR_LABEL,
    microcontrollerLabel: RESPIRA_3000_MICROCONTROLLER_LABEL,
    firmwareLabel: RESPIRA_3000_FIRMWARE_LABEL,
    communicationLabel: RESPIRA_3000_COMMUNICATION_LABEL,
  };
}

/** Fuente única de metadatos visibles de calibración RESPIRA+ 3000 mL. */
export function resolveCalibrationDisplayMetadata(
  profile?: CalibrationProfile | null,
  activeModel?: ActiveCalibrationModel | null,
): CalibrationDisplayMetadata {
  if (shouldUseOfficialRespira3000DisplayMetadata(profile, activeModel)) {
    return buildOfficialDisplayMetadata();
  }

  const metrics = resolveLinearMetrics(activeModel);
  const ts = profile?.updatedAt ?? Date.now();
  let calibrationDateLabel = RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_ISO;
  let calibrationDateShort = RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_ISO;
  try {
    calibrationDateLabel = new Date(ts).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    calibrationDateShort = new Date(ts).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    // keep ISO fallback
  }

  return {
    displayCalibrationId: profile?.id ?? RESPIRA_3000_DISPLAY_CALIBRATION_ID,
    internalCalibrationId: profile?.id ?? RESPIRA_3000_PREDEFINED_CALIBRATION_ID,
    calibrationDateIso: calibrationDateLabel.slice(0, 10),
    calibrationDateLabel,
    calibrationDateShort,
    spirometerModel: RESPIRA_3000_SPIROMETER_MODEL_LABEL,
    modelKind: RESPIRA_3000_MODEL_KIND_LABEL,
    statusLabel: RESPIRA_3000_CALIBRATION_STATUS_LABEL,
    equationLabel: formatCompactEquationLabel(metrics.slope, metrics.intercept),
    equationHint: 'd = distancia medida por el sensor en mm',
    slope: metrics.slope,
    intercept: metrics.intercept,
    rSquared: metrics.rSquared,
    maeMl: metrics.maeMl,
    rmseMl: metrics.rmseMl,
    maxAbsErrorMl: metrics.maxAbsErrorMl,
    capacityMl: RESPIRA_3000_CAPACITY_ML,
    sensorLabel: RESPIRA_3000_SENSOR_LABEL,
    microcontrollerLabel: RESPIRA_3000_MICROCONTROLLER_LABEL,
    firmwareLabel: RESPIRA_3000_FIRMWARE_LABEL,
    communicationLabel: RESPIRA_3000_COMMUNICATION_LABEL,
  };
}

/** @deprecated Usar resolveCalibrationDisplayMetadata().displayCalibrationId */
export function resolvePredefinedCalibrationDisplayId(
  profile: CalibrationProfile | null | undefined,
  activeModel?: ActiveCalibrationModel | null,
): string {
  return resolveCalibrationDisplayMetadata(profile, activeModel).displayCalibrationId;
}

export function resolveCalibrationDisplayTimestamp(
  profile: CalibrationProfile | null | undefined,
  activeModel?: ActiveCalibrationModel | null,
): number {
  if (shouldUseOfficialRespira3000DisplayMetadata(profile, activeModel)) {
    return RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_MS;
  }
  return profile?.updatedAt ?? Date.now();
}

export function formatCalibrationDisplayDate(
  profile: CalibrationProfile | null | undefined,
  activeModel?: ActiveCalibrationModel | null,
): string {
  return resolveCalibrationDisplayMetadata(profile, activeModel).calibrationDateLabel;
}

export function formatShortCalibrationDate(
  profile: CalibrationProfile | null | undefined,
  activeModel?: ActiveCalibrationModel | null,
): string {
  return resolveCalibrationDisplayMetadata(profile, activeModel).calibrationDateShort;
}

export function formatCalibrationCardSubtitle(
  profile: CalibrationProfile | null | undefined,
  activeModel?: ActiveCalibrationModel | null,
): string {
  const meta = resolveCalibrationDisplayMetadata(profile, activeModel);
  return `${meta.spirometerModel} · ${meta.calibrationDateShort}`;
}

export function resolveDisplayVolumeFromEstimate(
  estimate: ActiveVolumeEstimateResult,
): number | null {
  if (estimate.displayVolumeMl !== null && Number.isFinite(estimate.displayVolumeMl)) {
    return estimate.displayVolumeMl;
  }
  if (estimate.roundedVolumeMl !== null && Number.isFinite(estimate.roundedVolumeMl)) {
    return estimate.roundedVolumeMl;
  }
  return null;
}

export function formatDisplayVolumeText(
  estimate: ActiveVolumeEstimateResult,
  valueMl: number | null,
): string {
  if (valueMl === null || !Number.isFinite(valueMl)) return '—';
  return `${Math.round(valueMl)}`;
}

export function formatMetricValue(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(decimals);
}
