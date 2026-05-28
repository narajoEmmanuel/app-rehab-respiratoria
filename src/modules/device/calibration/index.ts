export {
  CALIBRATION_PROFILE_VERSION,
  type CalibrationCapturePoint,
  type CalibrationProfile,
  type CalibrationProfileSource,
  type ImportedCalibrationMeta,
  type GlobalDistanceRange,
  type VolumeCalibrationSummary,
  type VolumeDistanceRelation,
} from '@/src/modules/device/calibration/calibration-types';

export {
  buildCalibrationProfile,
  computeGeometricScaleReport,
  computeGlobalDistanceRange,
  computeRepeatabilityReport,
  computeRequiredCalibrationCoverage,
  computeSegmentReport,
  computeVolumeCoverage,
  computeVolumeSummaries,
  determineVolumeDistanceRelation,
  groupCalibrationPointsByVolume,
  hasSubOperativeVolumes,
  type BuildCalibrationProfileOptions,
  computePerVolumeRepeatability,
  type CalibrationRepeatabilityReport,
  type CalibrationSegment,
  type CalibrationSegmentReport,
  type GeometricScaleReport,
  type GeometricScaleSegment,
  type GeometricScaleSegmentStatus,
  type RequiredCalibrationCoverage,
  type VolumeCoverage,
  type VolumeRepeatability,
  type VolumeRepeatabilityWarningLevel,
} from '@/src/modules/device/calibration/calibration-math';

export {
  CURRENT_SPIROMETER_PROFILE,
  EXPECTED_DISTANCE_STEP_PER_500ML_MM,
  EXPECTED_MAX_VOLUME_ML,
  EXPECTED_MIN_VOLUME_ML,
  EXPECTED_RECOMMENDED_MAX_VOLUME_ML,
  EXPECTED_VOLUME_STEP_ML,
  EXTENDED_RANGE_ML,
  EXTENDED_VOLUME_CHIPS_ML,
  GEOMETRIC_VALIDATION_SOURCE,
  GEOMETRIC_STEP_OK_TOLERANCE_MM,
  INCLUDE_RULE_IN_COMBINED_UNCERTAINTY,
  GEOMETRIC_STEP_REVIEW_TOLERANCE_MM,
  MAX_ACCEPTABLE_SLOPE_VARIATION_RATIO,
  MAX_ACCEPTABLE_STD_DISTANCE_MM,
  MIN_OPERATIVE_VOLUME_ML,
  MIN_RELIABLE_SENSOR_DISTANCE_MM,
  MIN_REPETITIONS_PER_REQUIRED_VOLUME,
  MIN_REPETITIONS_PER_VOLUME,
  MIN_SEGMENT_DISTANCE_DELTA_MM,
  MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY,
  OPERATIVE_VOLUME_CHIPS_ML,
  PIECEWISE_PREFERRED_MIN_DISTINCT_VOLUMES,
  RECOMMENDED_RANGE_ML,
  RECOMMENDED_VOLUME_CHIPS_ML,
  REFERENCE_VOLUME_PER_MM_ML,
  REQUIRED_GEOMETRIC_SEGMENTS_ML,
  REQUIRED_RECOMMENDED_VOLUMES_ML,
  RULE_RESOLUTION_HALF_WIDTH_MM,
  RULE_RESOLUTION_MM,
  SENSOR_ALIGNMENT_HALF_WIDTH_MM,
  SENSOR_RELATIVE_UNCERTAINTY,
  SENSOR_RESOLUTION_HALF_WIDTH_MM,
  SENSOR_RESOLUTION_MM,
  SPIROMETER_MARK_HALF_WIDTH_ML,
  UNCERTAINTY_COVERAGE_FACTOR_K,
  UNCERTAINTY_MAX_ACCEPTABLE_U95_ML,
} from '@/src/modules/device/calibration/calibration-constants';

export {
  buildUncertaintyRecommendation,
  computeCalibrationUncertaintySummary,
  computeLocalSensitivityMlPerMm,
  computeSampleStandardDeviation,
  computeStandardUncertaintyFromRectangularHalfWidth,
  computeVolumeUncertaintyReports,
  getExpectedGeometricDistanceStepMm,
} from '@/src/modules/device/calibration/calibration-uncertainty';

export {
  type CalibrationUncertaintyRecommendation,
  type CalibrationUncertaintySummary,
  type UncertaintyComponent,
  type VolumeUncertaintyReport,
  type VolumeUncertaintyStatus,
} from '@/src/modules/device/calibration/calibration-uncertainty-types';

export {
  CALIBRATION_BY_SPIROMETER_STORAGE_KEY,
  CALIBRATION_STORAGE_KEY,
  clearCalibrationProfile,
  clearCalibrationProfileForSpirometer,
  hasCalibrationProfile,
  listCalibrationProfilesBySpirometer,
  loadCalibrationProfile,
  loadCalibrationProfileDetailed,
  loadCalibrationProfileForSpirometer,
  saveCalibrationProfile,
  saveCalibrationProfileForSpirometer,
  type LoadCalibrationResult,
} from '@/src/modules/device/calibration/calibration-storage';

export {
  CALIBRATION_MODEL_VERSION,
  LINEAR_ACCEPTABLE_THRESHOLDS,
  MIN_USEFUL_DISTANCE_RANGE_MM,
  MODEL_WARNING_THRESHOLDS,
  type CalibrationGeometricScaleSummary,
  type CalibrationLinealQuality,
  type CalibrationModel,
  type CalibrationModelCoefficients,
  type CalibrationModelKind,
  type CalibrationModelMetrics,
  type CalibrationModelRange,
  type CalibrationModelRecommendation,
  type CalibrationModelRecommendationKind,
  type CalibrationModelStatus,
  type CalibrationQuality,
  type CalibrationRecommendationCoverage,
  type CalibrationRecommendationStatus,
  type CalibrationRequiredProtocolSummary,
  type EstimateVolumeResult,
  type EstimateVolumeStatus,
} from '@/src/modules/device/calibration/calibration-model-types';

export {
  buildLinearCalibrationModel,
  buildPiecewiseLinearCalibrationModel,
  estimateVolumeFromDistance,
  estimateVolumeFromDistanceLinear,
  estimateVolumeFromDistancePiecewise,
  recommendCalibrationModel,
} from '@/src/modules/device/calibration/calibration-model';

export {
  computeMaeMl,
  computeMaxAbsErrorMl,
  computeRmseMl,
  computeRSquaredMl,
  evaluatePredictions,
} from '@/src/modules/device/calibration/calibration-model-evaluation';

export {
  ACTIVE_CALIBRATION_MODEL_VERSION,
  type ActiveCalibrationClinicalStatus,
  type ActiveCalibrationCoverageSummary,
  type ActiveCalibrationCurve,
  type ActiveCalibrationCurvePoint,
  type ActiveCalibrationDistanceRangeMm,
  type ActiveCalibrationGeometricSummary,
  type ActiveCalibrationModel,
  type ActiveCalibrationProtocolSummary,
  type ActiveCalibrationQualitySummary,
  type ActiveCalibrationRangeMl,
  type ActiveCalibrationRepeatabilitySummary,
  type ActiveCalibrationTechnicalSummary,
  type ActiveCalibrationUncertaintyByVolumeEntry,
  type ActiveCalibrationUncertaintySummary,
} from '@/src/modules/device/calibration/active-calibration-types';

export {
  activeModelCardStatusLabel,
  buildActiveCalibrationModel,
  buildActiveCalibrationTechnicalSummary,
  hasActiveCalibrationCurveSnapshot,
  isActiveCalibrationModelStale,
  resolveActiveModelCardStatus,
  type ActiveModelCardStatus,
  type BuildActiveCalibrationModelParams,
} from '@/src/modules/device/calibration/active-calibration-model';

export {
  type ActiveVolumeEstimateResult,
  type ActiveVolumeEstimateStatus,
  type ActiveVolumeEstimateUsedSegment,
} from '@/src/modules/device/calibration/active-volume-estimation-types';

export {
  activeVolumeEstimateCardStatusLabel,
  estimateVolumeFromActiveModel,
  type EstimateVolumeFromActiveModelParams,
} from '@/src/modules/device/calibration/active-volume-estimator';

export {
  buildImportedCalibrationBundle,
  persistImportedCalibrationBundle,
  saveImportedEquationCalibration,
  saveImportedFileCalibration,
  validateEquationInput,
  validateImportedCalibrationJson,
  volumeFromLinear,
} from '@/src/modules/device/calibration/imported-calibration-service';

export {
  IMPORTED_CALIBRATION_JSON_SCHEMA_VERSION,
  type ImportedCalibrationJson,
  type ImportedEquationInput,
} from '@/src/modules/device/calibration/imported-calibration-types';

export {
  coerceCalibratedDeviceIdentification,
  createDefaultCalibratedDeviceIdentification,
  formatCalibrationDateIso,
  mergeCalibratedDeviceIdentification,
  type CalibratedDeviceIdentification,
} from '@/src/modules/device/calibration/calibrated-device-identification';

export {
  RESPIRA_SYSTEM_COMPONENTS,
  respiraSystemComponentsCsvFields,
  type RespiraSystemComponents,
} from '@/src/modules/device/calibration/respira-system-components';

export {
  resolveTherapyCalibrationReadiness,
  therapyCalibrationStatusLabel,
  type TherapyCalibrationReadiness,
  type TherapyCalibrationStatus,
} from '@/src/modules/device/calibration/therapy-calibration-readiness';

export {
  ACTIVE_CALIBRATION_BY_SPIROMETER_STORAGE_KEY,
  clearActiveCalibrationModelForSpirometer,
  hasActiveCalibrationModelForSpirometer,
  listActiveCalibrationModelsBySpirometer,
  loadActiveCalibrationModelForSpirometer,
  saveActiveCalibrationModelForSpirometer,
} from '@/src/modules/device/calibration/active-calibration-storage';
