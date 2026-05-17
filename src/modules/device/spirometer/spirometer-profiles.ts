import type { SpirometerProfile } from '@/src/modules/device/spirometer/spirometer-types';

export const SPIROMETER_PROFILE_5000ML_ID = 'spirometer_5000ml_default';
export const SPIROMETER_PROFILE_3000ML_ID = 'spirometer_3000ml_default';

export const SPIROMETER_DEVICE_5000ML_ID = 'respira-spiro-5000-001';
export const SPIROMETER_DEVICE_3000ML_ID = 'respira-spiro-3000-001';

const PROFILE_5000ML: SpirometerProfile = {
  id: SPIROMETER_PROFILE_5000ML_ID,
  name: 'Espirómetro 5000 mL',
  maxVolumeMl: 5000,
  operativeMinVolumeMl: 500,
  recommendedMinVolumeMl: 500,
  recommendedMaxVolumeMl: 3000,
  extendedMaxVolumeMl: 5000,
  calibrationStepMl: 500,
  requiredVolumesMl: [500, 1000, 1500, 2000, 2500, 3000],
  volumeChipsMl: [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
  expectedDistanceStepMm: 10,
  geometricValidationEnabled: true,
  geometrySource: 'measured_with_rule',
  notes: 'Perfil actual usado con el espirómetro de 5000 mL.',
};

const PROFILE_3000ML: SpirometerProfile = {
  id: SPIROMETER_PROFILE_3000ML_ID,
  name: 'Espirómetro 3000 mL',
  maxVolumeMl: 3000,
  operativeMinVolumeMl: 500,
  recommendedMinVolumeMl: 500,
  recommendedMaxVolumeMl: 3000,
  extendedMaxVolumeMl: 3000,
  calibrationStepMl: 500,
  requiredVolumesMl: [500, 1000, 1500, 2000, 2500, 3000],
  volumeChipsMl: [500, 1000, 1500, 2000, 2500, 3000],
  expectedDistanceStepMm: null,
  geometricValidationEnabled: false,
  geometrySource: 'disabled',
  notes:
    'Perfil preparado para espirómetro de 3000 mL. La validación geométrica se activará cuando se mida la escala física.',
};

const PROFILES_BY_ID: Record<string, SpirometerProfile> = {
  [SPIROMETER_PROFILE_5000ML_ID]: PROFILE_5000ML,
  [SPIROMETER_PROFILE_3000ML_ID]: PROFILE_3000ML,
};

export function listSpirometerProfiles(): SpirometerProfile[] {
  return [PROFILE_5000ML, PROFILE_3000ML];
}

export function getSpirometerProfileById(profileId: string): SpirometerProfile | null {
  return PROFILES_BY_ID[profileId] ?? null;
}

/** Chips del rango recomendado (hasta recommendedMaxVolumeMl inclusive). */
export function getRecommendedVolumeChipsMl(profile: SpirometerProfile): number[] {
  return profile.volumeChipsMl.filter((v) => v <= profile.recommendedMaxVolumeMl);
}

/** Chips por encima del rango recomendado hasta extendedMaxVolumeMl. */
export function getExtendedVolumeChipsMl(profile: SpirometerProfile): number[] {
  if (profile.extendedMaxVolumeMl <= profile.recommendedMaxVolumeMl) return [];
  return profile.volumeChipsMl.filter(
    (v) => v > profile.recommendedMaxVolumeMl && v <= profile.extendedMaxVolumeMl,
  );
}

/** Límite inferior del rango extendido (primer chip por encima del recomendado). */
export function getExtendedRangeMinVolumeMl(profile: SpirometerProfile): number | null {
  const extended = getExtendedVolumeChipsMl(profile);
  return extended.length > 0 ? extended[0] : null;
}

/** Pares consecutivos de volúmenes obligatorios para validación geométrica. */
export function buildGeometricSegmentsMl(profile: SpirometerProfile): [number, number][] {
  const sorted = [...profile.requiredVolumesMl].sort((a, b) => a - b);
  const segments: [number, number][] = [];
  for (let i = 1; i < sorted.length; i++) {
    segments.push([sorted[i - 1], sorted[i]]);
  }
  return segments;
}

/** mL por mm a partir del paso de calibración y la distancia esperada entre marcas. */
export function deriveReferenceVolumePerMmMl(profile: SpirometerProfile): number | null {
  if (profile.expectedDistanceStepMm === null || profile.expectedDistanceStepMm <= 0) {
    return null;
  }
  return profile.calibrationStepMl / profile.expectedDistanceStepMm;
}
