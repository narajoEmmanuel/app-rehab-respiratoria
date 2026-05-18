/**
 * Evaluación paralela de intento por volumen estimado del sensor (no oficial).
 */
export type SensorAttemptEvaluationStatus =
  | 'ready'
  | 'volume_below_target'
  | 'target_reached'
  | 'uncertain'
  | 'sensor_unavailable'
  | 'out_of_range'
  | 'not_applicable';

export type SensorAttemptConfidenceLabel = 'alta' | 'media' | 'baja' | 'no_disponible';

export type SensorAttemptEvaluation = {
  status: SensorAttemptEvaluationStatus;
  estimatedVolumeMl: number | null;
  targetVolumeMl: number;
  u95Ml: number | null;
  lowerBoundMl: number | null;
  upperBoundMl: number | null;
  reachesTargetByEstimate: boolean;
  reachesTargetConservatively: boolean;
  volumeMarginMl: number | null;
  confidenceLabel: SensorAttemptConfidenceLabel;
  message: string;
};
