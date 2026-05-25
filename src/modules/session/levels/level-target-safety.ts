/**
 * Safety clamp: ensures the session target volume stays within the
 * calibrated range of the active model when running in sensor mode.
 *
 * In touch_practice the full multiplied target is kept because the
 * sensor is not involved and calibration is irrelevant.
 */
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';

export type SafeLevelTargetParams = {
  baseTargetVolumeMl: number;
  targetVolumeMultiplier: number;
  calibratedRangeMl: { min: number; max: number } | null;
  inputMode: SessionInputMode;
};

export type SafeLevelTargetResult = {
  requestedTargetVolumeMl: number;
  effectiveTargetVolumeMl: number;
  wasAdjusted: boolean;
  reason: string | null;
};

export function resolveSafeLevelTargetVolume(
  params: SafeLevelTargetParams,
): SafeLevelTargetResult {
  const { baseTargetVolumeMl, targetVolumeMultiplier, calibratedRangeMl, inputMode } = params;
  const requestedTargetVolumeMl = Math.round(baseTargetVolumeMl * targetVolumeMultiplier);

  if (inputMode === 'touch_practice') {
    return {
      requestedTargetVolumeMl,
      effectiveTargetVolumeMl: requestedTargetVolumeMl,
      wasAdjusted: false,
      reason: null,
    };
  }

  if (!calibratedRangeMl) {
    return {
      requestedTargetVolumeMl,
      effectiveTargetVolumeMl: requestedTargetVolumeMl,
      wasAdjusted: false,
      reason: null,
    };
  }

  if (requestedTargetVolumeMl > calibratedRangeMl.max) {
    return {
      requestedTargetVolumeMl,
      effectiveTargetVolumeMl: calibratedRangeMl.max,
      wasAdjusted: true,
      reason: 'Objetivo ajustado al rango calibrado',
    };
  }

  return {
    requestedTargetVolumeMl,
    effectiveTargetVolumeMl: requestedTargetVolumeMl,
    wasAdjusted: false,
    reason: null,
  };
}
