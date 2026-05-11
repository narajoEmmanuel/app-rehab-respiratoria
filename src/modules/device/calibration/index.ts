export {
  CALIBRATION_PROFILE_VERSION,
  type CalibrationCapturePoint,
  type CalibrationProfile,
  type GlobalDistanceRange,
  type VolumeCalibrationSummary,
  type VolumeDistanceRelation,
} from '@/src/modules/device/calibration/calibration-types';

export {
  buildCalibrationProfile,
  computeGlobalDistanceRange,
  computeVolumeSummaries,
  determineVolumeDistanceRelation,
  groupCalibrationPointsByVolume,
  type BuildCalibrationProfileOptions,
} from '@/src/modules/device/calibration/calibration-math';

export {
  CALIBRATION_STORAGE_KEY,
  clearCalibrationProfile,
  hasCalibrationProfile,
  loadCalibrationProfile,
  loadCalibrationProfileDetailed,
  saveCalibrationProfile,
  type LoadCalibrationResult,
} from '@/src/modules/device/calibration/calibration-storage';
