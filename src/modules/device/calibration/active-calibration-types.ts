/**
 * Modelo de calibración activo (aprobado) por unidad física de espirómetro.
 * Separado del CalibrationProfile: el perfil guarda puntos; el activo es la aprobación para uso futuro.
 */
import type {
  CalibrationLinealQuality,
  CalibrationModel,
  CalibrationModelKind,
  CalibrationQuality,
} from '@/src/modules/device/calibration/calibration-model-types';
import type { VolumeDistanceRelation } from '@/src/modules/device/calibration/calibration-types';
import type { SpirometerProfile } from '@/src/modules/device/spirometer/spirometer-types';

export const ACTIVE_CALIBRATION_MODEL_VERSION = 1;

export type ActiveCalibrationRangeMl = {
  min: number;
  max: number;
};

export type ActiveCalibrationDistanceRangeMm = {
  min: number;
  max: number;
};

export type ActiveCalibrationProtocolSummary = {
  requiredVolumesMl: number[];
  minimumRepetitionsPerVolume: number;
  minimumValidPoints: number;
  totalValidRequiredPoints: number;
  meetsRequiredProtocol: boolean;
};

export type ActiveCalibrationCoverageSummary = {
  coversRecommended: boolean;
  coversTotal: boolean;
  recommendedCoveragePct: number | null;
  totalCoveragePct: number | null;
};

export type ActiveCalibrationRepeatabilitySummary = {
  minRepetitionsPerVolume: number | null;
  maxStdDistanceMm: number | null;
  volumesRecommendedForRetake: number[];
};

export type ActiveCalibrationGeometricSummary = {
  configured: boolean;
  passed: boolean;
  expectedDistanceStepMm: number | null;
  okSegments: number;
  reviewSegments: number;
  criticalSegments: number;
  missingSegments: number;
};

export type ActiveCalibrationUncertaintySummary = {
  averageU95Ml: number | null;
  maxU95Ml: number | null;
  volumeWithMaxU95Ml: number | null;
  hasAcceptableUncertainty: boolean;
};

export type ActiveCalibrationQualitySummary = {
  linearQuality: CalibrationLinealQuality;
  calibrationQuality: CalibrationQuality;
  warnings: string[];
};

export type ActiveCalibrationClinicalStatus = {
  label: 'Pendiente de validación clínica';
  note: string;
};

/** Punto de la curva calibrada congelada al activar el modelo (desde summaries del perfil). */
export type ActiveCalibrationCurvePoint = {
  volumeMl: number;
  avgDistanceMm: number;
  repetitions: number;
  u95Ml: number | null;
};

/** Snapshot de la curva volumen–distancia para estimación por tramos independiente del perfil guardado. */
export type ActiveCalibrationCurve = {
  points: ActiveCalibrationCurvePoint[];
  relation: VolumeDistanceRelation;
};

export type ActiveCalibrationUncertaintyByVolumeEntry = {
  u95Ml: number | null;
  uCombinedVolumeMl: number | null;
  localSensitivityMlPerMm: number | null;
};

export type ActiveCalibrationModel = {
  id: string;
  spirometerDeviceId: string;
  spirometerProfileId: string;
  spirometerProfileSnapshot: SpirometerProfile;
  calibrationProfileId: string;
  sourceCalibrationUpdatedAt: number;
  activatedAt: number;
  updatedAt: number;
  modelKind: CalibrationModelKind;
  modelVersion: number;
  isReadyForTherapy: boolean;
  canEstimateWithinCalibratedRange: boolean;
  therapyReadinessReason: string;
  recommendedReason: string;
  linearModel: CalibrationModel | null;
  piecewiseModel: CalibrationModel | null;
  recommendedModel: CalibrationModel;
  calibratedRangeMl: ActiveCalibrationRangeMl;
  distanceRangeMm: ActiveCalibrationDistanceRangeMm;
  requiredVolumesMl: number[];
  protocol: ActiveCalibrationProtocolSummary;
  coverage: ActiveCalibrationCoverageSummary;
  repeatability: ActiveCalibrationRepeatabilitySummary;
  geometricValidation: ActiveCalibrationGeometricSummary;
  uncertainty: ActiveCalibrationUncertaintySummary;
  quality: ActiveCalibrationQualitySummary;
  clinicalStatus: ActiveCalibrationClinicalStatus;
  /** Curva congelada al activar; requerida para estimación en vivo por tramos. */
  calibrationCurve?: ActiveCalibrationCurve;
  /** Incertidumbre U95 por volumen calibrado al momento de la activación. */
  uncertaintyByVolumeMl?: Record<number, ActiveCalibrationUncertaintyByVolumeEntry>;
};

export type ActiveCalibrationTechnicalSummary = {
  activeModelId: string;
  spirometerDeviceId: string;
  spirometerLabel: string;
  spirometerProfileName: string;
  modelKind: string;
  activatedAt: number;
  isReadyForTherapy: boolean;
  therapyReadinessReason: string;
  calibratedRangeMl: string;
  requiredProtocolSummary: string;
  uncertaintySummary: string;
  geometricSummary: string;
  repeatabilitySummary: string;
  warnings: string[];
};
