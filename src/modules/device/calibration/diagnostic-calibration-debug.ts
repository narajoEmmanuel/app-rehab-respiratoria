/**
 * Logs temporales de depuración: calibración guardada vs lectura en diagnóstico.
 */
import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import { hasActiveCalibrationCurveSnapshot } from '@/src/modules/device/calibration/active-calibration-model';
import { ACTIVE_CALIBRATION_BY_SPIROMETER_STORAGE_KEY } from '@/src/modules/device/calibration/active-calibration-storage';
import { CALIBRATION_BY_SPIROMETER_STORAGE_KEY } from '@/src/modules/device/calibration/calibration-storage';
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

export function logCalibrationProfileSaved(
  spirometerDeviceId: string,
  profile: CalibrationProfile,
): void {
  console.warn(`${LOG_TAG} CALIBRATION SAVED`, {
    patientId: 'N/A (calibración por espirómetro)',
    calibrationId: profile.id,
    spirometerId: spirometerDeviceId,
    numberOfPoints: profile.points.length,
    activeFlag: 'profile_only',
    storageKey: CALIBRATION_BY_SPIROMETER_STORAGE_KEY,
    modelCoefficientsAvailable: false,
    updatedAt: profile.updatedAt,
  });
}

export function logActiveCalibrationModelSaved(model: ActiveCalibrationModel): void {
  console.warn(`${LOG_TAG} CALIBRATION ACTIVE MODEL SAVED`, {
    patientId: 'N/A (calibración por espirómetro)',
    calibrationId: model.calibrationProfileId,
    activeModelId: model.id,
    spirometerId: model.spirometerDeviceId,
    numberOfPoints: model.protocol?.totalValidRequiredPoints ?? null,
    activeFlag: true,
    storageKey: ACTIVE_CALIBRATION_BY_SPIROMETER_STORAGE_KEY,
    modelCoefficientsAvailable: modelCoefficientsAvailableForLog(model),
    isReadyForTherapy: model.isReadyForTherapy,
    canEstimateWithinCalibratedRange: model.canEstimateWithinCalibratedRange,
  });
}
