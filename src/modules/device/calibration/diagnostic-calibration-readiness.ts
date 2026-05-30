/**
 * Fuente de verdad para diagnóstico con sensor: calibración guardada + modelo activo.
 * Mismas keys que Calibración (AsyncStorage por espirómetro). No usa patientId.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buildActiveCalibrationModel,
  hasActiveCalibrationCurveSnapshot,
  type BuildActiveCalibrationModelOptions,
} from '@/src/modules/device/calibration/active-calibration-model';
import {
  ACTIVE_CALIBRATION_BY_SPIROMETER_STORAGE_KEY,
  CALIBRATION_BY_SPIROMETER_STORAGE_KEY,
} from '@/src/modules/device/calibration/calibration-storage-keys';
import {
  loadActiveCalibrationModelForSpirometer,
  listActiveCalibrationModelsBySpirometer,
  saveActiveCalibrationModelForSpirometer,
} from '@/src/modules/device/calibration/active-calibration-storage';
import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import {
  buildLinearCalibrationModel,
  buildPiecewiseLinearCalibrationModel,
  recommendCalibrationModel,
} from '@/src/modules/device/calibration/calibration-model';
import {
  listCalibrationProfilesBySpirometer,
  loadCalibrationProfileForSpirometer,
} from '@/src/modules/device/calibration/calibration-storage';
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';
import {
  getActiveSpirometerDevice,
  setActiveSpirometerDevice,
  SPIROMETER_ACTIVE_DEVICE_ID_KEY,
} from '@/src/modules/device/spirometer';

const LOG_TAG = '[RehabCalib]';

function modelCoefficientsAvailableForLog(model: ActiveCalibrationModel | null): boolean {
  if (!model) return false;
  if (hasActiveCalibrationCurveSnapshot(model)) return true;
  if (model.modelKind === 'linear_regression') {
    const c = model.linearModel?.coefficients;
    return c != null && typeof c.slope === 'number' && typeof c.intercept === 'number';
  }
  return false;
}

export const DIAGNOSTIC_CALIBRATION_STORAGE = {
  profileMapKey: CALIBRATION_BY_SPIROMETER_STORAGE_KEY,
  activeModelMapKey: ACTIVE_CALIBRATION_BY_SPIROMETER_STORAGE_KEY,
  activeSpirometerIdKey: SPIROMETER_ACTIVE_DEVICE_ID_KEY,
} as const;

export type DiagnosticCalibrationBlockReason =
  | 'no_spirometer'
  | 'sensor_disconnected'
  | 'no_saved_calibration'
  | 'no_active_model'
  | 'model_stale'
  | 'model_missing_curve'
  | 'model_not_ready'
  | 'profile_not_eligible'
  | 'activation_failed';

export type DiagnosticCalibrationAudit = {
  patientId: number | null;
  activeSpirometerId: string | null;
  resolvedSpirometerId: string | null;
  sensorConnected: boolean;
  profileStorageKey: string;
  activeModelStorageKey: string;
  profileFound: boolean;
  profileId: string | null;
  profilePointsCount: number;
  activeModelFound: boolean;
  activeModelId: string | null;
  activeModelHasCurve: boolean;
  activeModelIsReadyForTherapy: boolean;
  activeModelCanEstimate: boolean;
  recommendationCanEstimate: boolean;
  recommendationIsReadyForTherapy: boolean;
  recommendationKind: string | null;
  modelCoefficientsAvailable: boolean;
  syncedFromProfile: boolean;
  deviceIdsTried: string[];
  canStartDiagnostic: boolean;
  blockReason: DiagnosticCalibrationBlockReason | null;
  blockDetail: string | null;
};

function isUsableActiveModel(model: ActiveCalibrationModel | null): model is ActiveCalibrationModel {
  if (!model) return false;
  if (
    !hasActiveCalibrationCurveSnapshot(model) &&
    !modelCoefficientsAvailableForLog(model)
  ) {
    return false;
  }
  return model.isReadyForTherapy || model.canEstimateWithinCalibratedRange;
}

function logAudit(audit: DiagnosticCalibrationAudit): void {
  console.warn(`${LOG_TAG} DIAGNOSIS SENSOR READINESS CHECK`, {
    patientId: audit.patientId ?? 'N/A (calibración por espirómetro)',
    spirometerIdUsed: audit.resolvedSpirometerId,
    activeSpirometerId: audit.activeSpirometerId,
    sensorConnected: audit.sensorConnected,
    profileStorageKey: audit.profileStorageKey,
    activeModelStorageKey: audit.activeModelStorageKey,
    calibrationFound: audit.profileFound,
    calibrationId: audit.profileId,
    numberOfPoints: audit.profilePointsCount,
    activeModelFound: audit.activeModelFound,
    activeModelId: audit.activeModelId,
    activeModelHasCurve: audit.activeModelHasCurve,
    activeFlag: audit.activeModelFound && audit.activeModelHasCurve,
    modelCoefficientsAvailable: audit.modelCoefficientsAvailable,
    recommendationCanEstimate: audit.recommendationCanEstimate,
    recommendationIsReadyForTherapy: audit.recommendationIsReadyForTherapy,
    canStartDiagnostic: audit.canStartDiagnostic,
    blockReason: audit.blockReason,
    blockDetail: audit.blockDetail,
    deviceIdsTried: audit.deviceIdsTried,
    syncedFromProfile: audit.syncedFromProfile,
  });
}

async function resolveDeviceIdsToTry(preferredDeviceId?: string): Promise<string[]> {
  const [activeIdStored, activeDevice, profilesMap] = await Promise.all([
    AsyncStorage.getItem(SPIROMETER_ACTIVE_DEVICE_ID_KEY),
    getActiveSpirometerDevice(),
    listCalibrationProfilesBySpirometer(),
  ]);

  const ordered: string[] = [];
  const push = (id: string | null | undefined) => {
    if (id && !ordered.includes(id)) ordered.push(id);
  };

  push(preferredDeviceId);
  push(activeDevice?.id);
  push(activeIdStored);

  const byPoints = Object.entries(profilesMap)
    .filter(([, p]) => p.points.length > 0)
    .sort((a, b) => b[1].points.length - a[1].points.length);
  for (const [deviceId] of byPoints) {
    push(deviceId);
  }

  const modelsMap = await listActiveCalibrationModelsBySpirometer();
  for (const deviceId of Object.keys(modelsMap)) {
    push(deviceId);
  }

  return ordered;
}

type EnsureForDeviceResult =
  | {
      kind: 'ready';
      deviceId: string;
      activeModel: ActiveCalibrationModel;
      profile: CalibrationProfile | null;
      syncedFromSavedProfile: boolean;
      recommendationCanEstimate: boolean;
      recommendationIsReadyForTherapy: boolean;
      recommendationKind: string;
    }
  | { kind: 'no_profile'; deviceId: string }
  | { kind: 'not_eligible'; deviceId: string; reason: string; recommendationKind: string | null };

async function ensureForDevice(
  spirometerDeviceId: string,
): Promise<EnsureForDeviceResult> {
  const [calibrationProfile, existingActive] = await Promise.all([
    loadCalibrationProfileForSpirometer(spirometerDeviceId),
    loadActiveCalibrationModelForSpirometer(spirometerDeviceId),
  ]);

  if (isUsableActiveModel(existingActive)) {
    return {
      kind: 'ready',
      deviceId: spirometerDeviceId,
      activeModel: existingActive,
      profile: calibrationProfile,
      syncedFromSavedProfile: false,
      recommendationCanEstimate: existingActive.canEstimateWithinCalibratedRange,
      recommendationIsReadyForTherapy: existingActive.isReadyForTherapy,
      recommendationKind: existingActive.modelKind,
    };
  }

  if (!calibrationProfile || calibrationProfile.points.length === 0) {
    return { kind: 'no_profile', deviceId: spirometerDeviceId };
  }

  const linearModel = buildLinearCalibrationModel(calibrationProfile);
  const piecewiseModel = buildPiecewiseLinearCalibrationModel(calibrationProfile);
  const recommendation = recommendCalibrationModel(calibrationProfile, linearModel, piecewiseModel);

  if (recommendation.recommendedKind === 'none') {
    return {
      kind: 'not_eligible',
      deviceId: spirometerDeviceId,
      reason: recommendation.therapyReadinessReason,
      recommendationKind: recommendation.recommendedKind,
    };
  }

  const canUseForDiagnostic =
    recommendation.isReadyForTherapy || recommendation.canEstimateWithinCalibratedRange;
  if (!canUseForDiagnostic) {
    return {
      kind: 'not_eligible',
      deviceId: spirometerDeviceId,
      reason: recommendation.therapyReadinessReason,
      recommendationKind: recommendation.recommendedKind,
    };
  }

  const buildOptions: BuildActiveCalibrationModelOptions = {
    allowEstimateWithoutTherapyReady: !recommendation.isReadyForTherapy,
  };

  try {
    const model = buildActiveCalibrationModel(
      {
        calibrationProfile,
        recommendation,
        linearModel,
        piecewiseModel,
      },
      buildOptions,
    );
    await saveActiveCalibrationModelForSpirometer(model);
    return {
      kind: 'ready',
      deviceId: spirometerDeviceId,
      activeModel: model,
      profile: calibrationProfile,
      syncedFromSavedProfile: true,
      recommendationCanEstimate: recommendation.canEstimateWithinCalibratedRange,
      recommendationIsReadyForTherapy: recommendation.isReadyForTherapy,
      recommendationKind: recommendation.recommendedKind,
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'La calibración guardada no puede activarse.';
    return {
      kind: 'not_eligible',
      deviceId: spirometerDeviceId,
      reason,
      recommendationKind: recommendation.recommendedKind,
    };
  }
}

export type ResolveDiagnosticCalibrationParams = {
  preferredSpirometerDeviceId?: string;
  sensorConnected: boolean;
  patientId?: number | null;
};

export type ResolveDiagnosticCalibrationResult = DiagnosticCalibrationAudit & {
  activeModel: ActiveCalibrationModel | null;
};

/** Audita storage y garantiza modelo activo usable (misma fuente que Calibración). */
export async function resolveDiagnosticCalibration(
  params: ResolveDiagnosticCalibrationParams,
): Promise<ResolveDiagnosticCalibrationResult> {
  const activeDevice = await getActiveSpirometerDevice();
  const deviceIdsTried = await resolveDeviceIdsToTry(params.preferredSpirometerDeviceId);

  const base: DiagnosticCalibrationAudit = {
    patientId: params.patientId ?? null,
    activeSpirometerId: activeDevice?.id ?? null,
    resolvedSpirometerId: null,
    sensorConnected: params.sensorConnected,
    profileStorageKey: CALIBRATION_BY_SPIROMETER_STORAGE_KEY,
    activeModelStorageKey: ACTIVE_CALIBRATION_BY_SPIROMETER_STORAGE_KEY,
    profileFound: false,
    profileId: null,
    profilePointsCount: 0,
    activeModelFound: false,
    activeModelId: null,
    activeModelHasCurve: false,
    activeModelIsReadyForTherapy: false,
    activeModelCanEstimate: false,
    recommendationCanEstimate: false,
    recommendationIsReadyForTherapy: false,
    recommendationKind: null,
    modelCoefficientsAvailable: false,
    syncedFromProfile: false,
    deviceIdsTried,
    canStartDiagnostic: false,
    blockReason: null,
    blockDetail: null,
  };

  if (deviceIdsTried.length === 0) {
    const audit = {
      ...base,
      blockReason: 'no_spirometer' as const,
      blockDetail: 'No hay espirómetro registrado o seleccionado.',
    };
    logAudit(audit);
    return { ...audit, activeModel: null };
  }

  if (!params.sensorConnected) {
    const audit = {
      ...base,
      blockReason: 'sensor_disconnected' as const,
      blockDetail: 'El sensor no está conectado o no está enviando lecturas.',
    };
    logAudit(audit);
    return { ...audit, activeModel: null };
  }

  let lastNotEligible: EnsureForDeviceResult | null = null;
  let lastNoProfile: EnsureForDeviceResult | null = null;

  for (const deviceId of deviceIdsTried) {
    const profile = await loadCalibrationProfileForSpirometer(deviceId);
    const existingModel = await loadActiveCalibrationModelForSpirometer(deviceId);
    const attempt = await ensureForDevice(deviceId);

    if (attempt.kind === 'ready') {
      if (deviceId !== activeDevice?.id) {
        await setActiveSpirometerDevice(deviceId);
      }
      const audit: DiagnosticCalibrationAudit = {
        ...base,
        resolvedSpirometerId: deviceId,
        profileFound: Boolean(profile),
        profileId: profile?.id ?? attempt.profile?.id ?? null,
        profilePointsCount: profile?.points.length ?? attempt.profile?.points.length ?? 0,
        activeModelFound: true,
        activeModelId: attempt.activeModel.id,
        activeModelHasCurve: hasActiveCalibrationCurveSnapshot(attempt.activeModel),
        activeModelIsReadyForTherapy: attempt.activeModel.isReadyForTherapy,
        activeModelCanEstimate: attempt.activeModel.canEstimateWithinCalibratedRange,
        recommendationCanEstimate: attempt.recommendationCanEstimate,
        recommendationIsReadyForTherapy: attempt.recommendationIsReadyForTherapy,
        recommendationKind: attempt.recommendationKind,
        modelCoefficientsAvailable: modelCoefficientsAvailableForLog(attempt.activeModel),
        syncedFromProfile: attempt.syncedFromSavedProfile,
        canStartDiagnostic: true,
        blockReason: null,
        blockDetail: null,
      };
      logAudit(audit);
      return { ...audit, activeModel: attempt.activeModel };
    }

    if (attempt.kind === 'no_profile') {
      lastNoProfile = attempt;
      continue;
    }
    lastNotEligible = attempt;

    if (profile && profile.points.length > 0) {
      base.profileFound = true;
      base.profileId = profile.id;
      base.profilePointsCount = profile.points.length;
    }
    if (existingModel) {
      base.activeModelFound = true;
      base.activeModelId = existingModel.id;
      base.activeModelHasCurve = hasActiveCalibrationCurveSnapshot(existingModel);
      base.modelCoefficientsAvailable = modelCoefficientsAvailableForLog(existingModel);
    }
  }

  let blockReason: DiagnosticCalibrationBlockReason = 'no_saved_calibration';
  let blockDetail = 'No hay calibración guardada en AsyncStorage para ningún espirómetro probado.';

  if (lastNotEligible) {
    blockReason = 'profile_not_eligible';
    blockDetail = lastNotEligible.reason;
    base.recommendationKind = lastNotEligible.recommendationKind;
  } else if (lastNoProfile && base.activeModelFound && !base.activeModelHasCurve) {
    blockReason = 'model_missing_curve';
    blockDetail =
      'Hay modelo activo antiguo sin curva de calibración. Guarda de nuevo y activa el modelo en Calibración.';
  } else if (lastNoProfile && base.activeModelFound) {
    blockReason = 'model_not_ready';
    blockDetail = 'Hay modelo activo pero no cumple criterios de estimación.';
  }

  const audit: DiagnosticCalibrationAudit = {
    ...base,
    canStartDiagnostic: false,
    blockReason,
    blockDetail,
  };
  logAudit(audit);
  return { ...audit, activeModel: null };
}

/** @deprecated Usar resolveDiagnosticCalibration */
export async function ensureActiveCalibrationModelForDiagnostics(
  spirometerDeviceId: string,
): Promise<
  | { kind: 'ready'; activeModel: ActiveCalibrationModel; syncedFromSavedProfile: boolean }
  | { kind: 'no_saved_calibration' }
  | { kind: 'not_eligible'; reason: string }
> {
  const result = await ensureForDevice(spirometerDeviceId);
  if (result.kind === 'ready') {
    return {
      kind: 'ready',
      activeModel: result.activeModel,
      syncedFromSavedProfile: result.syncedFromSavedProfile,
    };
  }
  if (result.kind === 'no_profile') {
    return { kind: 'no_saved_calibration' };
  }
  return { kind: 'not_eligible', reason: result.reason };
}
