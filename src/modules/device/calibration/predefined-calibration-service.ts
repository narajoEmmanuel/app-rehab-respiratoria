/**
 * Instalación y migración de la calibración predeterminada RESPIRA+ 3000 mL (lineal).
 */
import {
    loadActiveCalibrationModelForSpirometer,
    saveActiveCalibrationModelForSpirometer,
} from '@/src/modules/device/calibration/active-calibration-storage';
import type {
    ActiveCalibrationCurve,
    ActiveCalibrationCurvePoint,
    ActiveCalibrationModel,
    PredefinedCalibrationMetadata,
} from '@/src/modules/device/calibration/active-calibration-types';
import {
    CALIBRATION_MODEL_VERSION,
    type CalibrationModel,
} from '@/src/modules/device/calibration/calibration-model-types';
import {
    loadCalibrationProfileForSpirometer,
    saveCalibrationProfileForSpirometer,
} from '@/src/modules/device/calibration/calibration-storage';
import {
    CALIBRATION_PROFILE_VERSION,
    type CalibrationProfile,
    type VolumeCalibrationSummary,
} from '@/src/modules/device/calibration/calibration-types';
import type { ImportedCalibrationBundle } from '@/src/modules/device/calibration/imported-calibration-service';
import {
    RESPIRA_3000_CALIBRATED_POINTS,
    RESPIRA_3000_CLAMP_MAX_ML,
    RESPIRA_3000_CLAMP_MIN_ML,
    RESPIRA_3000_DISPLAY_RANGE_ML,
    RESPIRA_3000_LINEAR_ESTIMATION_DISTANCE_RANGE_MM,
    RESPIRA_3000_LINEAR_MODEL,
    RESPIRA_3000_PIECEWISE_REFERENCE_POINTS,
    RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_ISO,
    RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_MS,
    RESPIRA_3000_PREDEFINED_CALIBRATION_ID,
    RESPIRA_3000_PREDEFINED_CAPTURE_POINTS_COUNT,
    RESPIRA_3000_PREDEFINED_DEFAULT_ACTIVE_MODEL_KIND,
    RESPIRA_3000_PREDEFINED_ORIGIN_LABEL,
    RESPIRA_3000_PREDEFINED_SOURCE,
    isLegacyBankLinearCoefficients,
    isPreviousOfficialLinearCoefficients,
    isRespira3000PredefinedProfileId,
    type PredefinedCalibrationPoint,
} from '@/src/modules/device/calibration/predefined-calibration-models';
import {
    SPIROMETER_DEVICE_3000ML_ID,
    SPIROMETER_PROFILE_3000ML_ID,
    getSpirometerProfileById,
} from '@/src/modules/device/spirometer';

function newId(prefix: string): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortedByDistance(points: readonly PredefinedCalibrationPoint[]): PredefinedCalibrationPoint[] {
  return [...points].sort((a, b) => a.distanceMm - b.distanceMm);
}

function buildSummariesFromPoints(
  points: readonly PredefinedCalibrationPoint[],
): VolumeCalibrationSummary[] {
  return points
    .filter((p) => !p.estimated)
    .map((p) => ({
      volumeMl: p.volumeMl,
      repetitions: 1,
      avgDistanceMm: p.distanceMm,
      avgRawDistanceMm: p.distanceMm,
      minDistanceMm: p.distanceMm,
      maxDistanceMm: p.distanceMm,
    }));
}

function buildReferenceCurvePoints(
  points: readonly PredefinedCalibrationPoint[],
): ActiveCalibrationCurvePoint[] {
  return sortedByDistance(points).map((p) => ({
    volumeMl: p.volumeMl,
    avgDistanceMm: p.distanceMm,
    repetitions: p.estimated ? 0 : 1,
    u95Ml: null,
    estimated: p.estimated === true,
  }));
}

function buildPredefinedMetadata(): PredefinedCalibrationMetadata {
  return {
    source: RESPIRA_3000_PREDEFINED_SOURCE,
    predefinedId: RESPIRA_3000_PREDEFINED_CALIBRATION_ID,
    originLabel: RESPIRA_3000_PREDEFINED_ORIGIN_LABEL,
    calibrationDateIso: RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_ISO,
    displayRangeMl: { ...RESPIRA_3000_DISPLAY_RANGE_ML },
    capacityMl: RESPIRA_3000_CLAMP_MAX_ML,
    clampMinMl: RESPIRA_3000_CLAMP_MIN_ML,
    clampMaxMl: RESPIRA_3000_CLAMP_MAX_ML,
    linearModel: { ...RESPIRA_3000_LINEAR_MODEL },
    piecewiseReferencePoints: [...RESPIRA_3000_PIECEWISE_REFERENCE_POINTS],
  };
}

function buildPrimaryLinearModel(profileId: string, calibrationTs: number): CalibrationModel {
  const { slope, intercept, rSquared, maeMl, rmseMl, maxAbsErrorMl } = RESPIRA_3000_LINEAR_MODEL;
  const { min: dMin, max: dMax } = RESPIRA_3000_LINEAR_ESTIMATION_DISTANCE_RANGE_MM;
  return {
    id: newId('cmd-predefined-linear'),
    calibrationProfileId: profileId,
    kind: 'linear_regression',
    createdAt: calibrationTs,
    updatedAt: calibrationTs,
    relation: 'direct',
    coefficients: { slope, intercept },
    pointsUsed: RESPIRA_3000_PREDEFINED_CAPTURE_POINTS_COUNT,
    volumeRangeMl: { ...RESPIRA_3000_DISPLAY_RANGE_ML },
    distanceRangeMm: { min: dMin, max: dMax },
    metrics: { rSquared, rmseMl, maeMl, maxAbsErrorMl },
    status: 'valid',
    warnings: [],
    isExperimental: true,
    version: CALIBRATION_MODEL_VERSION,
  };
}

function buildPiecewiseReferenceModel(profileId: string, now: number): CalibrationModel {
  const sorted = sortedByDistance(RESPIRA_3000_PIECEWISE_REFERENCE_POINTS);
  const dMin = sorted[0].distanceMm;
  const dMax = sorted[sorted.length - 1].distanceMm;
  return {
    id: newId('cmd-predefined-piecewise-ref'),
    calibrationProfileId: profileId,
    kind: 'piecewise_linear',
    createdAt: now,
    updatedAt: now,
    relation: 'direct',
    coefficients: {},
    pointsUsed: RESPIRA_3000_PIECEWISE_REFERENCE_POINTS.length,
    volumeRangeMl: { ...RESPIRA_3000_DISPLAY_RANGE_ML },
    distanceRangeMm: { min: dMin, max: dMax },
    metrics: {
      rSquared: RESPIRA_3000_LINEAR_MODEL.rSquared,
      rmseMl: RESPIRA_3000_LINEAR_MODEL.rmseMl,
      maeMl: RESPIRA_3000_LINEAR_MODEL.maeMl,
      maxAbsErrorMl: RESPIRA_3000_LINEAR_MODEL.maxAbsErrorMl,
    },
    status: 'valid',
    warnings: ['Referencia por tramos; no es el modelo activo.'],
    isExperimental: true,
    version: CALIBRATION_MODEL_VERSION,
  };
}

export type Respira3000PredefinedCalibrationBundle = ImportedCalibrationBundle;

export function buildRespira3000PredefinedCalibrationBundle(
  preserveActivatedAt?: number,
): Respira3000PredefinedCalibrationBundle {
  const profileSnapshot = getSpirometerProfileById(SPIROMETER_PROFILE_3000ML_ID);
  if (!profileSnapshot) {
    throw new Error('Perfil de espirómetro RESPIRA+ 3000 mL no encontrado.');
  }

  const now = Date.now();
  const calibrationTs = RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_MS;
  const profileId = RESPIRA_3000_PREDEFINED_CALIBRATION_ID;
  const linearModel = buildPrimaryLinearModel(profileId, calibrationTs);
  const piecewiseModel = buildPiecewiseReferenceModel(profileId, calibrationTs);
  const activeKind = RESPIRA_3000_PREDEFINED_DEFAULT_ACTIVE_MODEL_KIND;

  const referenceCurve: ActiveCalibrationCurve = {
    points: buildReferenceCurvePoints(RESPIRA_3000_PIECEWISE_REFERENCE_POINTS),
    relation: 'direct',
  };

  const predefinedCalibration = buildPredefinedMetadata();
  const distanceMin = linearModel.distanceRangeMm.min;
  const distanceMax = linearModel.distanceRangeMm.max;

  const profile: CalibrationProfile = {
    id: profileId,
    name: 'Calibración RESPIRA+ 3000 mL (validada)',
    createdAt: calibrationTs,
    updatedAt: calibrationTs,
    points: [],
    summaries: buildSummariesFromPoints(RESPIRA_3000_CALIBRATED_POINTS),
    globalRange: {
      minDistanceMm: distanceMin,
      maxDistanceMm: distanceMax,
      rangeMm: distanceMax - distanceMin,
    },
    relation: 'direct',
    isExperimental: true,
    source: 'team_validated',
    version: CALIBRATION_PROFILE_VERSION,
    spirometerDeviceId: SPIROMETER_DEVICE_3000ML_ID,
    spirometerProfileId: SPIROMETER_PROFILE_3000ML_ID,
    spirometerProfileSnapshot: profileSnapshot,
    calibrationRangeMl: { ...RESPIRA_3000_DISPLAY_RANGE_ML },
    requiredVolumesMl: [...profileSnapshot.requiredVolumesMl],
    notes: RESPIRA_3000_PREDEFINED_ORIGIN_LABEL,
  };

  const activeModel: ActiveCalibrationModel = {
    id: newId('acm-predefined'),
    spirometerDeviceId: SPIROMETER_DEVICE_3000ML_ID,
    spirometerProfileId: SPIROMETER_PROFILE_3000ML_ID,
    spirometerProfileSnapshot: profileSnapshot,
    calibrationProfileId: profile.id,
    sourceCalibrationUpdatedAt: now,
    activatedAt: preserveActivatedAt ?? now,
    updatedAt: now,
    modelKind: activeKind,
    modelVersion: CALIBRATION_MODEL_VERSION,
    isReadyForTherapy: true,
    canEstimateWithinCalibratedRange: true,
    therapyReadinessReason: 'Calibración verificada RESPIRA+ 3000 mL (validada por el equipo).',
    recommendedReason: 'Modelo lineal predeterminado RESPIRA+ (ecuación validada en banco).',
    linearModel,
    piecewiseModel,
    recommendedModel: linearModel,
    calibratedRangeMl: { ...RESPIRA_3000_DISPLAY_RANGE_ML },
    distanceRangeMm: { min: distanceMin, max: distanceMax },
    requiredVolumesMl: [...profileSnapshot.requiredVolumesMl],
    protocol: {
      requiredVolumesMl: [...profileSnapshot.requiredVolumesMl],
      minimumRepetitionsPerVolume: 1,
      minimumValidPoints: RESPIRA_3000_CALIBRATED_POINTS.length,
      totalValidRequiredPoints: RESPIRA_3000_PREDEFINED_CAPTURE_POINTS_COUNT,
      meetsRequiredProtocol: true,
    },
    coverage: {
      coversRecommended: true,
      coversTotal: true,
      recommendedCoveragePct: 100,
      totalCoveragePct: 100,
    },
    repeatability: {
      minRepetitionsPerVolume: 1,
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
      note: RESPIRA_3000_PREDEFINED_ORIGIN_LABEL,
    },
    calibrationCurve: referenceCurve,
    uncertaintyByVolumeMl: {},
    predefinedCalibration,
  };

  return { profile, activeModel };
}

export async function persistRespira3000PredefinedCalibrationBundle(
  bundle: Respira3000PredefinedCalibrationBundle,
): Promise<void> {
  const deviceId = bundle.profile.spirometerDeviceId;
  await saveCalibrationProfileForSpirometer(deviceId, bundle.profile);
  await saveActiveCalibrationModelForSpirometer(bundle.activeModel);
}

function predefinedProfileId(model: ActiveCalibrationModel): string {
  return model.predefinedCalibration?.predefinedId ?? model.calibrationProfileId;
}

function isTeamValidatedPredefined(model: ActiveCalibrationModel): boolean {
  const profileId = predefinedProfileId(model);
  return (
    model.predefinedCalibration?.source === RESPIRA_3000_PREDEFINED_SOURCE ||
    isRespira3000PredefinedProfileId(profileId)
  );
}

function isCurrentPredefinedBundle(model: ActiveCalibrationModel): boolean {
  if (!isTeamValidatedPredefined(model)) return false;
  if (predefinedProfileId(model) !== RESPIRA_3000_PREDEFINED_CALIBRATION_ID) return false;
  if (model.modelKind !== 'linear_regression') return false;
  const slope = model.linearModel?.coefficients.slope;
  const intercept = model.linearModel?.coefficients.intercept;
  if (typeof slope !== 'number' || typeof intercept !== 'number') return false;
  return (
    Math.abs(slope - RESPIRA_3000_LINEAR_MODEL.slope) < 1e-9 &&
    Math.abs(intercept - RESPIRA_3000_LINEAR_MODEL.intercept) < 1e-6
  );
}

function needsPredefinedUpgrade(model: ActiveCalibrationModel): boolean {
  return isTeamValidatedPredefined(model) && !isCurrentPredefinedBundle(model);
}

function isStoredTeamValidatedProfile(profile: CalibrationProfile): boolean {
  return profile.source === 'team_validated' && isRespira3000PredefinedProfileId(profile.id);
}

function needsProfilePredefinedUpgrade(profile: CalibrationProfile): boolean {
  return (
    isStoredTeamValidatedProfile(profile) &&
    profile.id !== RESPIRA_3000_PREDEFINED_CALIBRATION_ID
  );
}

function needsProfilePredefinedRefresh(profile: CalibrationProfile): boolean {
  return needsProfilePredefinedUpgrade(profile) || needsProfilePredefinedDateRefresh(profile);
}

function needsPredefinedMetadataRefresh(model: ActiveCalibrationModel): boolean {
  if (!isCurrentPredefinedBundle(model)) return false;
  const predefined = model.predefinedCalibration;
  if (!predefined?.calibrationDateIso) return true;
  if (predefined.calibrationDateIso !== RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_ISO) {
    return true;
  }
  const estimationMin = RESPIRA_3000_LINEAR_ESTIMATION_DISTANCE_RANGE_MM.min;
  if (Math.abs(model.distanceRangeMm.min - estimationMin) > 1e-6) return true;
  return false;
}

function needsProfilePredefinedDateRefresh(profile: CalibrationProfile): boolean {
  if (!isStoredTeamValidatedProfile(profile)) return false;
  if (profile.id !== RESPIRA_3000_PREDEFINED_CALIBRATION_ID) return false;
  return profile.updatedAt !== RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_MS;
}

export type EnsurePredefinedCalibrationResult = {
  installed: boolean;
  reason:
    | 'active_model_exists'
    | 'user_local_profile'
    | 'no_device'
    | 'installed_predefined_20260602'
    | 'migrated_predefined_version'
    | 'replaced_stale_local_calibration'
    | 'replaced_predefined_20260530_with_20260602'
    | 'already_linear_predefined';
};

function readLinearCoefficients(model: ActiveCalibrationModel): {
  slope: number | null;
  intercept: number | null;
} {
  const slope =
    model.linearModel?.coefficients.slope ?? model.recommendedModel?.coefficients.slope ?? null;
  const intercept =
    model.linearModel?.coefficients.intercept ??
    model.recommendedModel?.coefficients.intercept ??
    null;
  return {
    slope: typeof slope === 'number' && Number.isFinite(slope) ? slope : null,
    intercept: typeof intercept === 'number' && Number.isFinite(intercept) ? intercept : null,
  };
}

function isGeneratedLocalCalibrationProfileId(profileId: string): boolean {
  return profileId.startsWith('cal-') && !isRespira3000PredefinedProfileId(profileId);
}

const PREVIOUS_OFFICIAL_PREDEFINED_ID = 'cal-predefined-respira-3000-v20260530';

function isExplicitPostOfficialUserCalibration(
  profile: CalibrationProfile | null,
  model: ActiveCalibrationModel,
): boolean {
  if (!profile || profile.source !== 'local_calibration' || profile.points.length === 0) {
    return false;
  }
  if (isGeneratedLocalCalibrationProfileId(profile.id)) return false;
  if (profile.updatedAt <= RESPIRA_3000_PREDEFINED_CALIBRATION_DATE_MS) return false;

  const { slope, intercept } = readLinearCoefficients(model);
  if (slope === null || intercept === null) return false;
  if (matchesOfficialLinearCoefficients(slope, intercept)) return false;
  if (isPreviousOfficialLinearCoefficients(slope, intercept)) return false;
  if (isLegacyBankLinearCoefficients(slope, intercept)) return false;

  return true;
}

function isPreviousOfficialPredefinedContext(
  profile: CalibrationProfile | null,
  model: ActiveCalibrationModel,
): boolean {
  const profileId = profile?.id ?? model.calibrationProfileId;
  if (profileId === PREVIOUS_OFFICIAL_PREDEFINED_ID) return true;

  const predefinedId = model.predefinedCalibration?.predefinedId;
  if (predefinedId === PREVIOUS_OFFICIAL_PREDEFINED_ID) return true;

  const { slope, intercept } = readLinearCoefficients(model);
  if (slope !== null && intercept !== null && isPreviousOfficialLinearCoefficients(slope, intercept)) {
    return true;
  }

  return false;
}

function resolvePredefinedInstallReason(
  profile: CalibrationProfile | null,
  model: ActiveCalibrationModel | null,
  fallback:
    | 'migrated_predefined_version'
    | 'replaced_stale_local_calibration'
    | 'installed_predefined_20260602',
): EnsurePredefinedCalibrationResult['reason'] {
  if (model && isPreviousOfficialPredefinedContext(profile, model)) {
    return 'replaced_predefined_20260530_with_20260602';
  }
  return fallback;
}

/**
 * Calibración local/ephemeral o ecuación legacy de banco que debe ceder a la oficial del 2-jun-2026.
 * No reemplaza calibraciones locales nuevas con ecuación distinta elegida explícitamente por el usuario.
 */
function shouldReplaceWithOfficialPredefined(
  model: ActiveCalibrationModel,
  profile: CalibrationProfile | null,
): boolean {
  if (isCurrentPredefinedBundle(model)) return false;
  if (isExplicitPostOfficialUserCalibration(profile, model)) return false;
  if (needsPredefinedUpgrade(model)) return true;

  const profileId = profile?.id ?? model.calibrationProfileId;
  if (profileId && isGeneratedLocalCalibrationProfileId(profileId)) {
    const { slope, intercept } = readLinearCoefficients(model);
    if (slope !== null && intercept !== null) {
      if (isLegacyBankLinearCoefficients(slope, intercept)) return true;
      if (isPreviousOfficialLinearCoefficients(slope, intercept)) return true;
      if (matchesOfficialLinearCoefficients(slope, intercept)) return true;
    }
    return true;
  }

  if (profile?.source === 'local_calibration' && profile.points.length > 0) {
    const { slope, intercept } = readLinearCoefficients(model);
    if (slope !== null && intercept !== null) {
      if (isLegacyBankLinearCoefficients(slope, intercept)) return true;
      if (isPreviousOfficialLinearCoefficients(slope, intercept)) return true;
    }
  }

  if (!model.predefinedCalibration && !isTeamValidatedPredefined(model)) {
    const { slope, intercept } = readLinearCoefficients(model);
    if (slope !== null && intercept !== null) {
      if (isLegacyBankLinearCoefficients(slope, intercept)) return true;
      if (isPreviousOfficialLinearCoefficients(slope, intercept)) return true;
    }
  }

  return false;
}

function matchesOfficialLinearCoefficients(slope: number, intercept: number): boolean {
  return (
    Math.abs(slope - RESPIRA_3000_LINEAR_MODEL.slope) < 1e-6 &&
    Math.abs(intercept - RESPIRA_3000_LINEAR_MODEL.intercept) < 1e-3
  );
}

export async function ensureRespira3000PredefinedCalibrationInstalled(
  spirometerDeviceId: string = SPIROMETER_DEVICE_3000ML_ID,
): Promise<EnsurePredefinedCalibrationResult> {
  const profile = await loadCalibrationProfileForSpirometer(spirometerDeviceId);
  const existingActive = await loadActiveCalibrationModelForSpirometer(spirometerDeviceId);

  if (existingActive) {
    if (shouldReplaceWithOfficialPredefined(existingActive, profile)) {
      const bundle = buildRespira3000PredefinedCalibrationBundle(existingActive.activatedAt);
      await persistRespira3000PredefinedCalibrationBundle(bundle);
      const fallback = isGeneratedLocalCalibrationProfileId(
        profile?.id ?? existingActive.calibrationProfileId,
      )
        ? 'replaced_stale_local_calibration'
        : 'migrated_predefined_version';
      return {
        installed: true,
        reason: resolvePredefinedInstallReason(profile, existingActive, fallback),
      };
    }
    if (needsPredefinedUpgrade(existingActive)) {
      const bundle = buildRespira3000PredefinedCalibrationBundle(existingActive.activatedAt);
      await persistRespira3000PredefinedCalibrationBundle(bundle);
      return {
        installed: true,
        reason: resolvePredefinedInstallReason(
          profile,
          existingActive,
          'migrated_predefined_version',
        ),
      };
    }
    if (isCurrentPredefinedBundle(existingActive)) {
      if (needsPredefinedMetadataRefresh(existingActive)) {
        const bundle = buildRespira3000PredefinedCalibrationBundle(existingActive.activatedAt);
        await persistRespira3000PredefinedCalibrationBundle(bundle);
        return {
          installed: true,
          reason: resolvePredefinedInstallReason(
            profile,
            existingActive,
            'migrated_predefined_version',
          ),
        };
      }
      return { installed: false, reason: 'already_linear_predefined' };
    }
    return { installed: false, reason: 'active_model_exists' };
  }

  if (profile?.source === 'local_calibration' && profile.points.length > 0) {
    if (isGeneratedLocalCalibrationProfileId(profile.id)) {
      const bundle = buildRespira3000PredefinedCalibrationBundle();
      await persistRespira3000PredefinedCalibrationBundle(bundle);
      return { installed: true, reason: 'replaced_stale_local_calibration' };
    }
    return { installed: false, reason: 'user_local_profile' };
  }

  if (profile && needsProfilePredefinedRefresh(profile)) {
    const bundle = buildRespira3000PredefinedCalibrationBundle();
    await persistRespira3000PredefinedCalibrationBundle(bundle);
    return {
      installed: true,
      reason: resolvePredefinedInstallReason(profile, existingActive, 'migrated_predefined_version'),
    };
  }

  const bundle = buildRespira3000PredefinedCalibrationBundle();
  await persistRespira3000PredefinedCalibrationBundle(bundle);
  return {
    installed: true,
    reason: resolvePredefinedInstallReason(
      profile,
      existingActive,
      'installed_predefined_20260602',
    ),
  };
}
