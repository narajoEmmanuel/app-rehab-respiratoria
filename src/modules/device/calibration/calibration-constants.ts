/**
 * Constantes del procedimiento de calibración (sensor, repetibilidad, tolerancias).
 * Los rangos de volumen y la geometría del espirómetro viven en `SpirometerProfile`.
 */
import {
  getSpirometerProfileById,
  SPIROMETER_PROFILE_5000ML_ID,
} from '@/src/modules/device/spirometer/spirometer-profiles';

/** Distancia mínima fiable del VL53L0X en este montaje (mm). */
export const MIN_RELIABLE_SENSOR_DISTANCE_MM = 30;

/**
 * Perfil 5000 mL por defecto: alias de compatibilidad para código que aún importa
 * constantes globales de volumen (p. ej. pantallas fuera de calibración).
 */
const DEFAULT_5000_PROFILE = getSpirometerProfileById(SPIROMETER_PROFILE_5000ML_ID)!;

export const MIN_OPERATIVE_VOLUME_ML = DEFAULT_5000_PROFILE.operativeMinVolumeMl;

export const RECOMMENDED_RANGE_ML = {
  min: DEFAULT_5000_PROFILE.recommendedMinVolumeMl,
  max: DEFAULT_5000_PROFILE.recommendedMaxVolumeMl,
} as const;

export const EXTENDED_RANGE_ML = {
  min: DEFAULT_5000_PROFILE.recommendedMaxVolumeMl + DEFAULT_5000_PROFILE.calibrationStepMl,
  max: DEFAULT_5000_PROFILE.extendedMaxVolumeMl,
} as const;

export const EXPECTED_MIN_VOLUME_ML = DEFAULT_5000_PROFILE.operativeMinVolumeMl;
export const EXPECTED_RECOMMENDED_MAX_VOLUME_ML = DEFAULT_5000_PROFILE.recommendedMaxVolumeMl;
export const EXPECTED_MAX_VOLUME_ML = DEFAULT_5000_PROFILE.maxVolumeMl;

export const OPERATIVE_VOLUME_CHIPS_ML = DEFAULT_5000_PROFILE.volumeChipsMl;

export const REQUIRED_RECOMMENDED_VOLUMES_ML = DEFAULT_5000_PROFILE.requiredVolumesMl;

export const RECOMMENDED_VOLUME_CHIPS_ML = REQUIRED_RECOMMENDED_VOLUMES_ML;

export const EXTENDED_VOLUME_CHIPS_ML = OPERATIVE_VOLUME_CHIPS_ML.filter(
  (v) => v > DEFAULT_5000_PROFILE.recommendedMaxVolumeMl,
);

export const MIN_REPETITIONS_PER_VOLUME = 3;

export const MIN_REPETITIONS_PER_REQUIRED_VOLUME = 5;

export const MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY = 30;

export const MAX_ACCEPTABLE_STD_DISTANCE_MM = 5;

export const MAX_ACCEPTABLE_SLOPE_VARIATION_RATIO = 2.5;

export const MIN_SEGMENT_DISTANCE_DELTA_MM = 1;

/** @deprecated Usar `SpirometerProfile` del espirómetro activo. */
export const CURRENT_SPIROMETER_PROFILE = {
  maxVolumeMl: DEFAULT_5000_PROFILE.maxVolumeMl,
  operativeMinVolumeMl: DEFAULT_5000_PROFILE.operativeMinVolumeMl,
  recommendedMaxVolumeMl: DEFAULT_5000_PROFILE.recommendedMaxVolumeMl,
  calibrationStepMl: DEFAULT_5000_PROFILE.calibrationStepMl,
  expectedDistanceStepMm: DEFAULT_5000_PROFILE.expectedDistanceStepMm ?? 10,
  geometricValidationEnabled: DEFAULT_5000_PROFILE.geometricValidationEnabled,
  geometrySource: DEFAULT_5000_PROFILE.geometrySource,
} as const;

export const EXPECTED_VOLUME_STEP_ML = DEFAULT_5000_PROFILE.calibrationStepMl;

export const EXPECTED_DISTANCE_STEP_PER_500ML_MM =
  DEFAULT_5000_PROFILE.expectedDistanceStepMm ?? 10;

export const GEOMETRIC_VALIDATION_SOURCE = DEFAULT_5000_PROFILE.geometrySource;

export const INCLUDE_RULE_IN_COMBINED_UNCERTAINTY = false;

export const GEOMETRIC_STEP_OK_TOLERANCE_MM = 2;

export const GEOMETRIC_STEP_REVIEW_TOLERANCE_MM = 4;

export const REQUIRED_GEOMETRIC_SEGMENTS_ML = DEFAULT_5000_PROFILE.requiredVolumesMl
  .slice(1)
  .map((to, i) => [DEFAULT_5000_PROFILE.requiredVolumesMl[i], to] as [number, number]);

export const PIECEWISE_PREFERRED_MIN_DISTINCT_VOLUMES = 4;

export const UNCERTAINTY_COVERAGE_FACTOR_K = 2;

export const UNCERTAINTY_MAX_ACCEPTABLE_U95_ML = 250;

export const SENSOR_RESOLUTION_MM = 1;

export const SENSOR_RESOLUTION_HALF_WIDTH_MM = 0.5;

export const SENSOR_RELATIVE_UNCERTAINTY = 0.03;

export const SENSOR_ALIGNMENT_HALF_WIDTH_MM = 2;

export const SPIROMETER_MARK_HALF_WIDTH_ML = 50;

export const RULE_RESOLUTION_MM = 1;

export const RULE_RESOLUTION_HALF_WIDTH_MM = 0.5;

/** @deprecated Derivar con `deriveReferenceVolumePerMmMl` del perfil activo. */
export const REFERENCE_VOLUME_PER_MM_ML = 50;
