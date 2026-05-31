/**
 * Logs de depuración de calibración (funciones puras; sin importar storage).
 */
import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import { hasActiveCalibrationCurveSnapshot } from '@/src/modules/device/calibration/active-calibration-model';
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';

const LOG_TAG = '[RehabCalib]';

export function modelCoefficientsAvailableForLog(
  model: ActiveCalibrationModel | null,
): boolean {
  if (!model) return false;
  if (hasActiveCalibrationCurveSnapshot(model)) return true;
  if (model.modelKind === 'linear_regression') {
    const c = model.linearModel?.coefficients;
    return c != null && typeof c.slope === 'number' && typeof c.intercept === 'number';
  }
  return false;
}

export function debugCalibrationState(payload: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.warn(LOG_TAG, payload);
}

export function logCalibrationProfileSaved(
  spirometerDeviceId: string,
  profile: CalibrationProfile,
  storageKey: string,
): void {
  debugCalibrationState({
    patientId: 'N/A (calibración por espirómetro)',
    calibrationId: profile.id,
    spirometerId: spirometerDeviceId,
    numberOfPoints: profile.points.length,
    activeFlag: false,
    storageKey,
    modelCoefficientsAvailable: false,
    updatedAt: profile.updatedAt,
  });
}

export function logActiveCalibrationModelSaved(
  model: ActiveCalibrationModel,
  storageKey: string,
): void {
  debugCalibrationState({
    patientId: 'N/A (calibración por espirómetro)',
    calibrationId: model.calibrationProfileId,
    activeModelId: model.id,
    spirometerId: model.spirometerDeviceId,
    numberOfPoints: model.protocol?.totalValidRequiredPoints ?? null,
    activeFlag: true,
    storageKey,
    modelCoefficientsAvailable: modelCoefficientsAvailableForLog(model),
    isReadyForTherapy: model.isReadyForTherapy,
    canEstimateWithinCalibratedRange: model.canEstimateWithinCalibratedRange,
  });
}
