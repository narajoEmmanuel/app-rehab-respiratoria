/**
 * Perfil de modelo de espirómetro (tipo) y unidad física calibrable.
 */

export type SpirometerGeometrySource = 'measured_with_rule' | 'manufacturer' | 'disabled';

export type SpirometerProfile = {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  maxVolumeMl: number;
  operativeMinVolumeMl: number;
  recommendedMinVolumeMl: number;
  recommendedMaxVolumeMl: number;
  extendedMaxVolumeMl: number;
  calibrationStepMl: number;
  requiredVolumesMl: number[];
  volumeChipsMl: number[];
  expectedDistanceStepMm: number | null;
  geometricValidationEnabled: boolean;
  geometrySource: SpirometerGeometrySource;
  notes?: string;
};

export type SpirometerDevice = {
  id: string;
  profileId: string;
  label: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  notes?: string;
};

export type SpirometerContext = {
  device: SpirometerDevice;
  profile: SpirometerProfile;
};
