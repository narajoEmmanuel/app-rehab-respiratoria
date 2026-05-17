/**
 * Contratos compartidos para la calibración local experimental del ESP32 + VL53L0X.
 * No tiene dependencias de React ni de transporte; lo importan pantalla, math y storage.
 */

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
  source: 'local_calibration';
  notes?: string;
  version: number;
  spirometerDeviceId: string;
  spirometerProfileId: string;
  spirometerProfileSnapshot: SpirometerProfile;
  calibrationRangeMl: CalibrationRangeMl;
  requiredVolumesMl: number[];
};
