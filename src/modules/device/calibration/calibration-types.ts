/**
 * Contratos compartidos para la calibración local experimental del ESP32 + VL53L0X.
 * No tiene dependencias de React ni de transporte; lo importan pantalla, math y storage.
 */

import type { CalibratedDeviceIdentification } from '@/src/modules/device/calibration/calibrated-device-identification';
import type { SpirometerProfile } from '@/src/modules/device/spirometer/spirometer-types';

export type CalibrationCapturePoint = {
  id: string;
  volumeMl: number;
  distanceMm: number;
  rawDistanceMm: number;
  distanceValid: boolean;
  source: string;
  timestamp: number;
  repetitionNumber: number;
  createdAt: number;
  sampleCount: number;
  minSampleDistanceMm: number;
  maxSampleDistanceMm: number;
  stdDistanceMm: number;
};

export type VolumeCalibrationSummary = {
  volumeMl: number;
  repetitions: number;
  avgDistanceMm: number;
  avgRawDistanceMm: number;
  minDistanceMm: number;
  maxDistanceMm: number;
};

export type GlobalDistanceRange = {
  minDistanceMm: number | null;
  maxDistanceMm: number | null;
  rangeMm: number | null;
};

export type VolumeDistanceRelation = 'direct' | 'inverse' | 'indeterminate';

/** Versión del esquema persistido; incrementar si rompemos compatibilidad con AsyncStorage. */
export const CALIBRATION_PROFILE_VERSION = 2;

export type CalibrationRangeMl = {
  min: number;
  max: number;
};

export type CalibrationProfileSource =
  | 'local_calibration'
  | 'imported_equation'
  | 'imported_file';

export type ImportedCalibrationMeta = {
  schemaVersion?: string;
  spirometerModel?: string;
  capacityMl: number;
  slopeMlPerMm: number;
  interceptMl: number;
  validDistanceRangeMm: { min: number; max: number };
  calibrationId?: string;
  createdBy?: string;
  importedAt: number;
};

export type CalibrationProfile = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  points: CalibrationCapturePoint[];
  summaries: VolumeCalibrationSummary[];
  globalRange: GlobalDistanceRange;
  relation: VolumeDistanceRelation;
  isExperimental: true;
  source: CalibrationProfileSource;
  /** Metadatos de importación (ecuación o archivo RESPIRA+). */
  importedMeta?: ImportedCalibrationMeta;
  notes?: string;
  version: number;
  spirometerDeviceId: string;
  spirometerProfileId: string;
  spirometerProfileSnapshot: SpirometerProfile;
  calibrationRangeMl: CalibrationRangeMl;
  requiredVolumesMl: number[];
  /** Identificación del espirómetro físico calibrado (modo técnico / exportación). */
  deviceIdentification?: CalibratedDeviceIdentification;
};
