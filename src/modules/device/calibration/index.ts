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
  computeVolumeCoverage,
  computeVolumeSummaries,
  determineVolumeDistanceRelation,
  groupCalibrationPointsByVolume,
  hasSubOperativeVolumes,
  type BuildCalibrationProfileOptions,
  type VolumeCoverage,
} from '@/src/modules/device/calibration/calibration-math';

export {
  EXPECTED_MAX_VOLUME_ML,
  EXPECTED_MIN_VOLUME_ML,
  EXPECTED_RECOMMENDED_MAX_VOLUME_ML,
  EXTENDED_RANGE_ML,
  EXTENDED_VOLUME_CHIPS_ML,
  MIN_OPERATIVE_VOLUME_ML,
  MIN_RELIABLE_SENSOR_DISTANCE_MM,
  OPERATIVE_VOLUME_CHIPS_ML,
  RECOMMENDED_RANGE_ML,
  RECOMMENDED_VOLUME_CHIPS_ML,
} from '@/src/modules/device/calibration/calibration-constants';

export {
  CALIBRATION_STORAGE_KEY,
  clearCalibrationProfile,
  hasCalibrationProfile,
  loadCalibrationProfile,
  loadCalibrationProfileDetailed,
  saveCalibrationProfile,
  type LoadCalibrationResult,
} from '@/src/modules/device/calibration/calibration-storage';

export {
  CALIBRATION_MODEL_VERSION,
  MIN_USEFUL_DISTANCE_RANGE_MM,
  MODEL_WARNING_THRESHOLDS,
  type CalibrationModel,
  type CalibrationModelCoefficients,
  type CalibrationModelKind,
  type CalibrationModelMetrics,
  type CalibrationModelRange,
  type CalibrationModelStatus,
  type EstimateVolumeResult,
  type EstimateVolumeStatus,
} from '@/src/modules/device/calibration/calibration-model-types';

export {
  buildLinearCalibrationModel,
  buildPiecewiseLinearCalibrationModel,
  estimateVolumeFromDistance,
  estimateVolumeFromDistanceLinear,
  estimateVolumeFromDistancePiecewise,
} from '@/src/modules/device/calibration/calibration-model';

export {
  computeMaeMl,
  computeMaxAbsErrorMl,
  computeRmseMl,
  computeRSquaredMl,
  evaluatePredictions,
} from '@/src/modules/device/calibration/calibration-model-evaluation';
