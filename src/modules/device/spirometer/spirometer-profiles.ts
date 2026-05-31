import type { SpirometerProfile } from '@/src/modules/device/spirometer/spirometer-types';

export const SPIROMETER_PROFILE_3000ML_ID = 'spirometer_3000ml_default';
export const SPIROMETER_DEVICE_3000ML_ID = 'respira-spiro-3000-001';

/** Perfil técnico 5000 mL (solo modo calibración con flag dev). */
export const SPIROMETER_PROFILE_5000ML_ID = 'spirometer_5000ml_technical';
export const SPIROMETER_DEVICE_5000ML_ID = 'respira-spiro-5000-001';

/** @deprecated Alias de SPIROMETER_DEVICE_5000ML_ID. */
export const LEGACY_SPIROMETER_DEVICE_5000ML_ID = SPIROMETER_DEVICE_5000ML_ID;
/** @deprecated Solo para migración de almacenamiento legado. */
export const LEGACY_SPIROMETER_DEVICE_OTHER_ID = 'respira-spiro-other-001';

/** Marcas oficiales RESPIRA+ 3000 mL: 250 mL hasta 3000 mL en pasos de 250 mL. */
export const VOLUME_CHIPS_3000ML_ML: number[] = Array.from({ length: 12 }, (_, i) => (i + 1) * 250);

/** Marcas modo técnico 3000 mL (incluye 0 mL y pasos de 250 mL). */
export const VOLUME_CHIPS_3000ML_TECHNICAL_ML: number[] = [
  0,
  ...VOLUME_CHIPS_3000ML_ML,
];

/** Marcas modo técnico 5000 mL (0 mL y pasos de 500 mL). */
export const VOLUME_CHIPS_5000ML_TECHNICAL_ML: number[] = Array.from({ length: 11 }, (_, i) => i * 500);

const PROFILE_3000ML: SpirometerProfile = {
  id: SPIROMETER_PROFILE_3000ML_ID,
  name: 'Espirómetro RESPIRA+ 3000 mL',
  maxVolumeMl: 3000,
  operativeMinVolumeMl: 250,
  recommendedMinVolumeMl: 250,
  recommendedMaxVolumeMl: 3000,
  extendedMaxVolumeMl: 3000,
  calibrationStepMl: 250,
  requiredVolumesMl: [500, 1000, 1500, 2000, 2500, 3000],
  volumeChipsMl: VOLUME_CHIPS_3000ML_ML,
  expectedDistanceStepMm: null,
  geometricValidationEnabled: false,
  geometrySource: 'disabled',
  notes:
    'Espirómetro oficial RESPIRA+ de 3000 mL. Marcas cada 250 mL. Sin curva de fábrica hasta calibración técnica.',
};

/** Perfil de captura técnica 3000 mL (incluye 0 mL; no sustituye PROFILE_3000ML en flujo paciente). */
const PROFILE_3000ML_TECHNICAL: SpirometerProfile = {
  ...PROFILE_3000ML,
  requiredVolumesMl: [0, 500, 1000, 1500, 2000, 2500, 3000],
  volumeChipsMl: VOLUME_CHIPS_3000ML_TECHNICAL_ML,
  notes:
    'Captura técnica RESPIRA+ 3000 mL. Marcas 0–3000 mL. Solo con EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION.',
};

const PROFILE_5000ML: SpirometerProfile = {
  id: SPIROMETER_PROFILE_5000ML_ID,
  name: 'Espirómetro RESPIRA+ 5000 mL',
  maxVolumeMl: 5000,
  operativeMinVolumeMl: 250,
  recommendedMinVolumeMl: 500,
  recommendedMaxVolumeMl: 5000,
  extendedMaxVolumeMl: 5000,
  calibrationStepMl: 500,
  requiredVolumesMl: [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
  volumeChipsMl: VOLUME_CHIPS_5000ML_TECHNICAL_ML,
  expectedDistanceStepMm: null,
  geometricValidationEnabled: false,
  geometrySource: 'disabled',
  notes:
    'Captura técnica RESPIRA+ 5000 mL. Solo con EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION.',
};

const PROFILES_BY_ID: Record<string, SpirometerProfile> = {
  [SPIROMETER_PROFILE_3000ML_ID]: PROFILE_3000ML,
  [SPIROMETER_PROFILE_5000ML_ID]: PROFILE_5000ML,
};

/** Perfil 3000 mL ampliado para captura técnica (0 mL + marcas). */
export function getTechnicalCaptureProfile3000Ml(): SpirometerProfile {
  return PROFILE_3000ML_TECHNICAL;
}

export function listSpirometerProfiles(): SpirometerProfile[] {
  return [PROFILE_3000ML];
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

