/**
 * Construye perfil + modelo activo a partir de ecuación o JSON importado (sin captura multipunto).
 */
import {
  CALIBRATION_MODEL_VERSION,
  type CalibrationModel,
} from '@/src/modules/device/calibration/calibration-model-types';
import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import { saveActiveCalibrationModelForSpirometer } from '@/src/modules/device/calibration/active-calibration-storage';
import { MIN_USEFUL_DISTANCE_RANGE_MM } from '@/src/modules/device/calibration/calibration-model-types';
import { saveCalibrationProfileForSpirometer } from '@/src/modules/device/calibration/calibration-storage';
import {
  CALIBRATION_PROFILE_VERSION,
  type CalibrationProfile,
  type CalibrationProfileSource,
  type ImportedCalibrationMeta,
} from '@/src/modules/device/calibration/calibration-types';
import {
  IMPORTED_CALIBRATION_JSON_SCHEMA_VERSION,
  type ImportedCalibrationJson,
  type ImportedEquationInput,
  type ValidateImportedJsonResult,
} from '@/src/modules/device/calibration/imported-calibration-types';
import type { SpirometerDevice } from '@/src/modules/device/spirometer/spirometer-types';

function newId(prefix: string): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function volumeFromLinear(distanceMm: number, slope: number, intercept: number): number {
  return slope * distanceMm + intercept;
}

export function clampVolumeMl(volumeMl: number, capacityMl: number): number {
  if (!Number.isFinite(volumeMl)) return 0;
  if (volumeMl < 0) return 0;
  if (volumeMl > capacityMl) return capacityMl;
  return volumeMl;
}

export function validateEquationInput(input: ImportedEquationInput): string | null {
  const { slopeMlPerMm, interceptMl, capacityMl } = input;
  if (!Number.isFinite(slopeMlPerMm)) return 'La pendiente debe ser un número válido.';
  if (!Number.isFinite(interceptMl)) return 'El término independiente debe ser un número válido.';
  if (!Number.isFinite(capacityMl) || capacityMl <= 0) {
    return 'La capacidad del espirómetro debe ser mayor que 0 mL.';
  }
  return null;
}

export function validateImportedCalibrationJson(raw: unknown): ValidateImportedJsonResult {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, message: 'El archivo no contiene un objeto JSON válido.' };
  }
  const value = raw as Record<string, unknown>;
  if (typeof value.schemaVersion !== 'string' || value.schemaVersion.length === 0) {
    return { ok: false, message: 'Falta schemaVersion en el archivo.' };
  }
  if (value.modelType !== 'linear_regression') {
    return { ok: false, message: 'Solo se admite modelType "linear_regression".' };
  }
  const capacityMl = value.capacityMl;
  const slope = value.slope;
  const intercept = value.intercept;
  if (typeof capacityMl !== 'number' || !Number.isFinite(capacityMl) || capacityMl <= 0) {
    return { ok: false, message: 'capacityMl debe ser un número positivo.' };
  }
  if (typeof slope !== 'number' || !Number.isFinite(slope)) {
    return { ok: false, message: 'slope debe ser un número válido.' };
  }
  if (typeof intercept !== 'number' || !Number.isFinite(intercept)) {
    return { ok: false, message: 'intercept debe ser un número válido.' };
  }
  if (value.validDistanceRangeMm !== undefined) {
    const range = value.validDistanceRangeMm;
    if (!range || typeof range !== 'object') {
      return { ok: false, message: 'validDistanceRangeMm no es válido.' };
    }
    const r = range as Record<string, unknown>;
    if (typeof r.min !== 'number' || typeof r.max !== 'number' || r.max <= r.min) {
      return { ok: false, message: 'validDistanceRangeMm debe tener min y max numéricos con max > min.' };
    }
  }
  const data: ImportedCalibrationJson = {
    schemaVersion: value.schemaVersion,
    spirometerModel:
      typeof value.spirometerModel === 'string' ? value.spirometerModel : undefined,
    capacityMl,
    modelType: 'linear_regression',
    slope,
    intercept,
    validDistanceRangeMm:
      value.validDistanceRangeMm as ImportedCalibrationJson['validDistanceRangeMm'],
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
    createdBy: typeof value.createdBy === 'string' ? value.createdBy : undefined,
    calibrationId: typeof value.calibrationId === 'string' ? value.calibrationId : undefined,
  };
  const eqErr = validateEquationInput({
    slopeMlPerMm: data.slope,
    interceptMl: data.intercept,
    capacityMl: data.capacityMl,
    spirometerModel: data.spirometerModel,
  });
  if (eqErr) return { ok: false, message: eqErr };
  return { ok: true, data };
}

function defaultDistanceRangeMm(
  slope: number,
  intercept: number,
  capacityMl: number,
): { min: number; max: number } {
  const candidates: number[] = [30, 50, 80, 120, 160, 200];
  const distances: number[] = [];
  for (const d of candidates) {
    const v = volumeFromLinear(d, slope, intercept);
    if (v >= 0 && v <= capacityMl) distances.push(d);
  }
  if (distances.length >= 2) {
    return { min: Math.min(...distances), max: Math.max(...distances) };
  }
  return { min: 30, max: 180 };
}

function resolveDistanceRange(
  slope: number,
  intercept: number,
  capacityMl: number,
  fromJson?: { min: number; max: number },
): { min: number; max: number } {
  const range = fromJson ?? defaultDistanceRangeMm(slope, intercept, capacityMl);
  if (range.max - range.min < MIN_USEFUL_DISTANCE_RANGE_MM) {
    return defaultDistanceRangeMm(slope, intercept, capacityMl);
  }
  return range;
}

function buildImportedLinearModel(
  profileId: string,
  slope: number,
  intercept: number,
  capacityMl: number,
  distanceRangeMm: { min: number; max: number },
): CalibrationModel {
  const now = Date.now();
  return {
    id: newId('cmd-import'),
    calibrationProfileId: profileId,
    kind: 'linear_regression',
    createdAt: now,
    updatedAt: now,
    relation: 'direct',
    coefficients: { slope, intercept },
    pointsUsed: 0,
    volumeRangeMl: { min: 0, max: capacityMl },
    distanceRangeMm: { min: distanceRangeMm.min, max: distanceRangeMm.max },
    metrics: { rSquared: null, rmseMl: null, maeMl: null, maxAbsErrorMl: null },
    status: 'valid',
    warnings: [],
    isExperimental: true,
    version: CALIBRATION_MODEL_VERSION,
  };
}

export type BuildImportedBundleParams = {
  device: SpirometerDevice;
  profileSnapshot: CalibrationProfile['spirometerProfileSnapshot'];
  source: Extract<CalibrationProfileSource, 'imported_equation' | 'imported_file'>;
  slope: number;
  intercept: number;
  capacityMl: number;
  spirometerModel?: string;
  validDistanceRangeMm?: { min: number; max: number };
  calibrationId?: string;
  createdBy?: string;
  schemaVersion?: string;
  profileName?: string;
};

export type ImportedCalibrationBundle = {
  profile: CalibrationProfile;
  activeModel: ActiveCalibrationModel;
};

export function buildImportedCalibrationBundle(
  params: BuildImportedBundleParams,
): ImportedCalibrationBundle {
  const {
    device,
    profileSnapshot,
    source,
    slope,
    intercept,
    capacityMl,
    spirometerModel,
    validDistanceRangeMm: rangeInput,
    calibrationId,
    createdBy,
    schemaVersion,
    profileName,
  } = params;

  const distanceRangeMm = resolveDistanceRange(slope, intercept, capacityMl, rangeInput);
  const now = Date.now();
  const profileId = calibrationId ?? newId('cal-import');
  const dMin = distanceRangeMm.min;
  const dMax = distanceRangeMm.max;
  const vAtMin = clampVolumeMl(volumeFromLinear(dMin, slope, intercept), capacityMl);
  const vAtMax = clampVolumeMl(volumeFromLinear(dMax, slope, intercept), capacityMl);

  const importedMeta: ImportedCalibrationMeta = {
    schemaVersion: schemaVersion ?? IMPORTED_CALIBRATION_JSON_SCHEMA_VERSION,
    spirometerModel,
    capacityMl,
    slopeMlPerMm: slope,
    interceptMl: intercept,
    validDistanceRangeMm: distanceRangeMm,
    calibrationId: profileId,
    createdBy,
    importedAt: now,
  };

  const linearModel = buildImportedLinearModel(
    profileId,
    slope,
    intercept,
    capacityMl,
    distanceRangeMm,
  );

  const profile: CalibrationProfile = {
    id: profileId,
    name: profileName ?? spirometerModel ?? 'Calibración verificada RESPIRA+',
    createdAt: now,
    updatedAt: now,
    points: [],
    summaries: [
      {
        volumeMl: vAtMin,
        repetitions: 0,
        avgDistanceMm: dMin,
        avgRawDistanceMm: dMin,
        minDistanceMm: dMin,
        maxDistanceMm: dMin,
      },
      {
        volumeMl: vAtMax,
        repetitions: 0,
        avgDistanceMm: dMax,
        avgRawDistanceMm: dMax,
        minDistanceMm: dMax,
        maxDistanceMm: dMax,
      },
    ],
    globalRange: {
      minDistanceMm: dMin,
      maxDistanceMm: dMax,
      rangeMm: dMax - dMin,
    },
    relation: 'direct',
    isExperimental: true,
    source,
    importedMeta,
    version: CALIBRATION_PROFILE_VERSION,
    spirometerDeviceId: device.id,
    spirometerProfileId: device.profileId,
    spirometerProfileSnapshot: profileSnapshot,
    calibrationRangeMl: { min: 0, max: capacityMl },
    requiredVolumesMl: [...profileSnapshot.requiredVolumesMl],
  };

  const activeModel: ActiveCalibrationModel = {
    id: newId('acm-import'),
    spirometerDeviceId: device.id,
    spirometerProfileId: device.profileId,
    spirometerProfileSnapshot: profileSnapshot,
    calibrationProfileId: profile.id,
    sourceCalibrationUpdatedAt: now,
    activatedAt: now,
    updatedAt: now,
    modelKind: 'linear_regression',
    modelVersion: CALIBRATION_MODEL_VERSION,
    isReadyForTherapy: true,
    canEstimateWithinCalibratedRange: true,
    therapyReadinessReason: 'Calibración verificada proporcionada por RESPIRA+.',
    recommendedReason: 'Modelo lineal importado.',
    linearModel,
    piecewiseModel: null,
    recommendedModel: linearModel,
    calibratedRangeMl: { min: 0, max: capacityMl },
    distanceRangeMm,
    requiredVolumesMl: [...profileSnapshot.requiredVolumesMl],
    protocol: {
      requiredVolumesMl: [...profileSnapshot.requiredVolumesMl],
      minimumRepetitionsPerVolume: 0,
      minimumValidPoints: 0,
      totalValidRequiredPoints: 0,
      meetsRequiredProtocol: true,
    },
    coverage: {
      coversRecommended: true,
      coversTotal: true,
      recommendedCoveragePct: 100,
      totalCoveragePct: 100,
    },
    repeatability: {
      minRepetitionsPerVolume: null,
      maxStdDistanceMm: null,
      volumesRecommendedForRetake: [],
    },
    geometricValidation: {
      configured: false,
      passed: true,
      expectedDistanceStepMm: null,
      okSegments: 0,
      reviewSegments: 0,
      criticalSegments: 0,
      missingSegments: 0,
    },
    uncertainty: {
      averageU95Ml: null,
      maxU95Ml: null,
      volumeWithMaxU95Ml: null,
      hasAcceptableUncertainty: true,
    },
    quality: {
      linearQuality: 'acceptable',
      calibrationQuality: 'good',
      warnings: [],
    },
    clinicalStatus: {
      label: 'Calibración verificada',
      note: 'Importada desde datos proporcionados por RESPIRA+.',
    },
    calibrationCurve: {
      points: [
        { volumeMl: vAtMin, avgDistanceMm: dMin, repetitions: 0, u95Ml: null },
        { volumeMl: vAtMax, avgDistanceMm: dMax, repetitions: 0, u95Ml: null },
      ],
      relation: 'direct',
    },
    uncertaintyByVolumeMl: {},
  };

  return { profile, activeModel };
}

export async function persistImportedCalibrationBundle(
  bundle: ImportedCalibrationBundle,
): Promise<void> {
  const deviceId = bundle.profile.spirometerDeviceId;
  await saveCalibrationProfileForSpirometer(deviceId, bundle.profile);
  await saveActiveCalibrationModelForSpirometer(bundle.activeModel);
}

export async function saveImportedEquationCalibration(params: {
  device: SpirometerDevice;
  profileSnapshot: CalibrationProfile['spirometerProfileSnapshot'];
  equation: ImportedEquationInput;
}): Promise<ImportedCalibrationBundle> {
  const err = validateEquationInput(params.equation);
  if (err) throw new Error(err);
  const bundle = buildImportedCalibrationBundle({
    device: params.device,
    profileSnapshot: params.profileSnapshot,
    source: 'imported_equation',
    slope: params.equation.slopeMlPerMm,
    intercept: params.equation.interceptMl,
    capacityMl: params.equation.capacityMl,
    spirometerModel: params.equation.spirometerModel,
    profileName: params.equation.spirometerModel
      ? `Calibración: ${params.equation.spirometerModel}`
      : undefined,
  });
  await persistImportedCalibrationBundle(bundle);
  return bundle;
}

export async function saveImportedFileCalibration(params: {
  device: SpirometerDevice;
  profileSnapshot: CalibrationProfile['spirometerProfileSnapshot'];
  json: ImportedCalibrationJson;
}): Promise<ImportedCalibrationBundle> {
  const bundle = buildImportedCalibrationBundle({
    device: params.device,
    profileSnapshot: params.profileSnapshot,
    source: 'imported_file',
    slope: params.json.slope,
    intercept: params.json.intercept,
    capacityMl: params.json.capacityMl,
    spirometerModel: params.json.spirometerModel,
    validDistanceRangeMm: params.json.validDistanceRangeMm,
    calibrationId: params.json.calibrationId,
    createdBy: params.json.createdBy,
    schemaVersion: params.json.schemaVersion,
    profileName: params.json.spirometerModel
      ? `Calibración: ${params.json.spirometerModel}`
      : 'Calibración importada',
  });
  await persistImportedCalibrationBundle(bundle);
  return bundle;
}
