/**
 * Construcción del modelo de calibración activo y resumen técnico exportable.
 */
import {
  MIN_REPETITIONS_PER_REQUIRED_VOLUME,
} from '@/src/modules/device/calibration/calibration-constants';
import type {
  ActiveCalibrationCurve,
  ActiveCalibrationModel,
  ActiveCalibrationTechnicalSummary,
  ActiveCalibrationUncertaintyByVolumeEntry,
} from '@/src/modules/device/calibration/active-calibration-types';
import { computeRepeatabilityReport } from '@/src/modules/device/calibration/calibration-math';
import { computeVolumeUncertaintyReports } from '@/src/modules/device/calibration/calibration-uncertainty';
import {
  CALIBRATION_MODEL_VERSION,
  type CalibrationModel,
  type CalibrationModelRecommendation,
} from '@/src/modules/device/calibration/calibration-model-types';
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';

const ACTIVATION_ERROR_MESSAGE =
  'La calibración aún no cumple los criterios para activarse.';

export type BuildActiveCalibrationModelParams = {
  calibrationProfile: CalibrationProfile;
  recommendation: CalibrationModelRecommendation;
  linearModel: CalibrationModel;
  piecewiseModel: CalibrationModel;
};

function newActiveModelId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `acm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function selectRecommendedModel(
  kind: CalibrationModelRecommendation['recommendedKind'],
  linearModel: CalibrationModel,
  piecewiseModel: CalibrationModel,
): CalibrationModel {
  if (kind === 'piecewise_linear') return piecewiseModel;
  return linearModel;
}

function buildCalibrationCurveSnapshot(
  calibrationProfile: CalibrationProfile,
): ActiveCalibrationCurve {
  const reports = computeVolumeUncertaintyReports(calibrationProfile);
  const u95ByVolume = new Map(
    reports.map((r) => [r.volumeMl, r.expandedUncertaintyU95Ml] as const),
  );
  const points = [...calibrationProfile.summaries]
    .map((s) => ({
      volumeMl: s.volumeMl,
      avgDistanceMm: s.avgDistanceMm,
      repetitions: s.repetitions,
      u95Ml: u95ByVolume.get(s.volumeMl) ?? null,
    }))
    .sort((a, b) => a.avgDistanceMm - b.avgDistanceMm);
  return {
    points,
    relation: calibrationProfile.relation,
  };
}

function buildUncertaintyByVolumeSnapshot(
  calibrationProfile: CalibrationProfile,
): Record<number, ActiveCalibrationUncertaintyByVolumeEntry> {
  const reports = computeVolumeUncertaintyReports(calibrationProfile);
  const record: Record<number, ActiveCalibrationUncertaintyByVolumeEntry> = {};
  for (const r of reports) {
    record[r.volumeMl] = {
      u95Ml: r.expandedUncertaintyU95Ml,
      uCombinedVolumeMl: r.uCombinedVolumeMl,
      localSensitivityMlPerMm: r.localSensitivityMlPerMm,
    };
  }
  return record;
}

/** Modelos activos persistidos antes del snapshot de curva no pueden estimar en vivo. */
export function hasActiveCalibrationCurveSnapshot(model: ActiveCalibrationModel): boolean {
  const curve = model.calibrationCurve;
  if (!curve || !Array.isArray(curve.points) || curve.points.length < 2) return false;
  if (
    curve.relation !== 'direct' &&
    curve.relation !== 'inverse' &&
    curve.relation !== 'indeterminate'
  ) {
    return false;
  }
  return curve.points.every(
    (p) =>
      Number.isFinite(p.volumeMl) &&
      Number.isFinite(p.avgDistanceMm) &&
      Number.isFinite(p.repetitions),
  );
}

export function buildActiveCalibrationModel(
  params: BuildActiveCalibrationModelParams,
): ActiveCalibrationModel {
  const { calibrationProfile, recommendation, linearModel, piecewiseModel } = params;

  if (recommendation.recommendedKind === 'none') {
    throw new Error(ACTIVATION_ERROR_MESSAGE);
  }
  if (!recommendation.isReadyForTherapy) {
    throw new Error(ACTIVATION_ERROR_MESSAGE);
  }

  const recommendedModel = selectRecommendedModel(
    recommendation.recommendedKind,
    linearModel,
    piecewiseModel,
  );

  const repeatabilityReport = computeRepeatabilityReport(
    calibrationProfile.points,
    calibrationProfile.summaries,
    calibrationProfile.requiredVolumesMl,
  );

  const geo = recommendation.geometricScale;
  const now = Date.now();
  const snapshot = calibrationProfile.spirometerProfileSnapshot;
  const calibrationCurve = buildCalibrationCurveSnapshot(calibrationProfile);
  const uncertaintyByVolumeMl = buildUncertaintyByVolumeSnapshot(calibrationProfile);

  return {
    id: newActiveModelId(),
    spirometerDeviceId: calibrationProfile.spirometerDeviceId,
    spirometerProfileId: calibrationProfile.spirometerProfileId,
    spirometerProfileSnapshot: snapshot,
    calibrationProfileId: calibrationProfile.id,
    sourceCalibrationUpdatedAt: calibrationProfile.updatedAt,
    activatedAt: now,
    updatedAt: now,
    modelKind: recommendation.recommendedKind,
    modelVersion: CALIBRATION_MODEL_VERSION,
    isReadyForTherapy: recommendation.isReadyForTherapy,
    canEstimateWithinCalibratedRange: recommendation.canEstimateWithinCalibratedRange,
    therapyReadinessReason: recommendation.therapyReadinessReason,
    recommendedReason: recommendation.reason,
    linearModel,
    piecewiseModel,
    recommendedModel,
    calibratedRangeMl: {
      min: recommendedModel.volumeRangeMl.min,
      max: recommendedModel.volumeRangeMl.max,
    },
    distanceRangeMm: {
      min: recommendedModel.distanceRangeMm.min,
      max: recommendedModel.distanceRangeMm.max,
    },
    requiredVolumesMl: [...calibrationProfile.requiredVolumesMl],
    protocol: {
      requiredVolumesMl: [...recommendation.requiredProtocol.requiredVolumes],
      minimumRepetitionsPerVolume: MIN_REPETITIONS_PER_REQUIRED_VOLUME,
      minimumValidPoints: recommendation.requiredProtocol.minimumRequiredPoints,
      totalValidRequiredPoints: recommendation.requiredProtocol.totalValidRequiredPoints,
      meetsRequiredProtocol: recommendation.requiredProtocol.meetsRequiredProtocol,
    },
    coverage: {
      coversRecommended: recommendation.coverage.coversRecommended,
      coversTotal: recommendation.coverage.coversTotal,
      recommendedCoveragePct: recommendation.coverage.recommendedCoveragePct,
      totalCoveragePct: recommendation.coverage.totalCoveragePct,
    },
    repeatability: {
      minRepetitionsPerVolume: repeatabilityReport.hasPoints
        ? repeatabilityReport.minRepetitionsPerVolume
        : null,
      maxStdDistanceMm: repeatabilityReport.hasPoints
        ? repeatabilityReport.maxStdDistanceMm
        : null,
      volumesRecommendedForRetake: [...repeatabilityReport.volumesRecommendedForRetake],
    },
    geometricValidation: {
      configured: geo.geometricValidationConfigured,
      passed: geo.passesGeometricValidation,
      expectedDistanceStepMm: geo.expectedDistanceStepPer500MlMm,
      okSegments: geo.okSegments,
      reviewSegments: geo.reviewSegments,
      criticalSegments: geo.criticalSegments,
      missingSegments: geo.missingSegments,
    },
    uncertainty: {
      averageU95Ml: recommendation.uncertainty.averageU95Ml,
      maxU95Ml: recommendation.uncertainty.maxU95Ml,
      volumeWithMaxU95Ml: recommendation.uncertainty.volumeWithMaxU95Ml,
      hasAcceptableUncertainty: recommendation.uncertainty.hasAcceptableUncertainty,
    },
    quality: {
      linearQuality: recommendation.linealQuality,
      calibrationQuality: recommendation.calibrationQuality,
      warnings: [...recommendation.warnings],
    },
    clinicalStatus: {
      label: 'Pendiente de validación clínica',
      note:
        'Este modelo activo queda registrado para el espirómetro seleccionado. Su uso en terapia requiere validación clínica posterior.',
    },
    calibrationCurve,
    uncertaintyByVolumeMl,
  };
}

function modelKindDisplayLabel(kind: ActiveCalibrationModel['modelKind']): string {
  return kind === 'piecewise_linear' ? 'Por tramos' : 'Lineal';
}

function formatProtocolSummary(model: ActiveCalibrationModel): string {
  const { protocol } = model;
  const volumes = protocol.requiredVolumesMl.join(', ');
  const status = protocol.meetsRequiredProtocol ? 'cumplido' : 'incompleto';
  return `${protocol.totalValidRequiredPoints} / ${protocol.minimumValidPoints} puntos válidos · protocolo ${status} (${volumes} mL)`;
}

function formatUncertaintySummary(model: ActiveCalibrationModel): string {
  const { uncertainty } = model;
  if (uncertainty.maxU95Ml === null) {
    return 'U95: sin datos suficientes';
  }
  const acceptable = uncertainty.hasAcceptableUncertainty ? 'dentro de límite' : 'elevada';
  return `U95 máximo: ${uncertainty.maxU95Ml.toFixed(0)} mL (${acceptable})`;
}

function formatGeometricSummary(model: ActiveCalibrationModel): string {
  const g = model.geometricValidation;
  if (!g.configured) {
    return 'Geometría: no configurada';
  }
  if (g.passed) {
    return 'Geometría: correcta';
  }
  if (g.criticalSegments > 0 || g.missingSegments > 0) {
    return 'Geometría: revisar montaje';
  }
  if (g.reviewSegments > 0) {
    return 'Geometría: revisar tramos';
  }
  return 'Geometría: incompleta';
}

function formatRepeatabilitySummary(model: ActiveCalibrationModel): string {
  const { repeatability } = model;
  if (repeatability.volumesRecommendedForRetake.length === 0) {
    return 'Repetibilidad: sin volúmenes por repetir';
  }
  const vols = repeatability.volumesRecommendedForRetake.map((v) => `${v} mL`).join(', ');
  return `Repetibilidad: revisar ${vols}`;
}

export function buildActiveCalibrationTechnicalSummary(
  model: ActiveCalibrationModel,
  spirometerLabel: string,
): ActiveCalibrationTechnicalSummary {
  return {
    activeModelId: model.id,
    spirometerDeviceId: model.spirometerDeviceId,
    spirometerLabel,
    spirometerProfileName: model.spirometerProfileSnapshot.name,
    modelKind: modelKindDisplayLabel(model.modelKind),
    activatedAt: model.activatedAt,
    isReadyForTherapy: model.isReadyForTherapy,
    therapyReadinessReason: model.therapyReadinessReason,
    calibratedRangeMl: `${model.calibratedRangeMl.min}–${model.calibratedRangeMl.max} mL`,
    requiredProtocolSummary: formatProtocolSummary(model),
    uncertaintySummary: formatUncertaintySummary(model),
    geometricSummary: formatGeometricSummary(model),
    repeatabilitySummary: formatRepeatabilitySummary(model),
    warnings: [...model.quality.warnings],
  };
}

/**
 * Indica si el modelo activo ya no refleja la calibración guardada en pantalla.
 * Si no hay modelo activo, devuelve true (no hay vigencia).
 */
export function isActiveCalibrationModelStale(
  activeModel: ActiveCalibrationModel | null,
  calibrationProfile: CalibrationProfile | null,
  hasUnsavedChanges: boolean,
): boolean {
  if (!activeModel) return true;
  if (hasUnsavedChanges) return true;
  if (!calibrationProfile) return true;
  if (calibrationProfile.id !== activeModel.calibrationProfileId) return true;
  if (calibrationProfile.updatedAt > activeModel.sourceCalibrationUpdatedAt) return true;
  return false;
}

export type ActiveModelCardStatus =
  | 'none'
  | 'current'
  | 'stale'
  | 'not_eligible';

export function resolveActiveModelCardStatus(
  activeModel: ActiveCalibrationModel | null,
  calibrationProfile: CalibrationProfile | null,
  hasUnsavedChanges: boolean,
  canActivate: boolean,
): ActiveModelCardStatus {
  if (!activeModel) {
    return canActivate ? 'none' : 'not_eligible';
  }
  if (isActiveCalibrationModelStale(activeModel, calibrationProfile, hasUnsavedChanges)) {
    return 'stale';
  }
  return 'current';
}

export function activeModelCardStatusLabel(status: ActiveModelCardStatus): string {
  switch (status) {
    case 'none':
      return 'Sin modelo activo';
    case 'current':
      return 'Modelo activo vigente';
    case 'stale':
      return 'Modelo activo desactualizado';
    case 'not_eligible':
      return 'Calibración no apta para activar';
  }
}
