/**
 * Tipos de la compuerta de preparación antes de iniciar terapia.
 */
import type { CalibrationModelKind } from '@/src/modules/device/calibration/calibration-model-types';

export type TherapyReadinessActionRoute = '/sensor-calibration' | '/sensor-connection';

export type TherapyReadinessStatus =
  | 'ready'
  | 'sensor_disconnected'
  | 'no_spirometer'
  | 'no_active_model'
  | 'model_stale'
  | 'model_not_ready_for_therapy'
  | 'invalid_sensor_reading'
  | 'missing_curve'
  | 'out_of_range'
  | 'loading'
  | 'error';

export type TherapyReadinessGateEstimate = {
  estimatedVolumeMl: number | null;
  u95Ml: number | null;
  inCalibratedRange: boolean;
  clamped: boolean;
};

export type TherapyReadinessGateContext = {
  spirometerDeviceId: string | null;
  spirometerLabel: string | null;
  modelKind: CalibrationModelKind | null;
  activeModelId: string | null;
  calibratedRangeMl: { min: number; max: number } | null;
  maxU95Ml: number | null;
  clinicalStatusLabel: string | null;
};

export type TherapyReadinessGate = {
  status: TherapyReadinessStatus;
  canStartTherapy: boolean;
  title: string;
  message: string;
  actionLabel: string | null;
  actionRoute: TherapyReadinessActionRoute | null;
  estimate: TherapyReadinessGateEstimate;
  context: TherapyReadinessGateContext;
};
