import type {
  SensorAttemptConfidenceLabel,
  SensorAttemptEvaluation,
  SensorAttemptEvaluationStatus,
} from '@/src/modules/session/sensor-evaluation/sensor-attempt-evaluation-types';

export type EvaluateSensorAttemptVolumeParams = {
  estimatedVolumeMl: number | null;
  u95Ml: number | null;
  lowerBoundMl: number | null;
  upperBoundMl: number | null;
  targetVolumeMl: number;
  estimationStatus: string;
  inCalibratedRange: boolean;
  clamped: boolean;
};

const NOT_APPLICABLE_STATUSES = new Set(['loading']);
const UNAVAILABLE_STATUSES = new Set([
  'sensor_disconnected',
  'no_active_model',
  'model_stale',
  'no_spirometer',
  'missing_curve',
  'not_ready_for_therapy',
  'invalid_sensor_reading',
  'error',
]);

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function buildEvaluation(
  partial: Pick<SensorAttemptEvaluation, 'status' | 'message' | 'confidenceLabel'> &
    Partial<
      Pick<
        SensorAttemptEvaluation,
        | 'estimatedVolumeMl'
        | 'reachesTargetByEstimate'
        | 'reachesTargetConservatively'
        | 'volumeMarginMl'
      >
    >,
  params: EvaluateSensorAttemptVolumeParams,
): SensorAttemptEvaluation {
  return {
    estimatedVolumeMl: partial.estimatedVolumeMl ?? params.estimatedVolumeMl,
    targetVolumeMl: params.targetVolumeMl,
    u95Ml: params.u95Ml,
    lowerBoundMl: params.lowerBoundMl,
    upperBoundMl: params.upperBoundMl,
    reachesTargetByEstimate: partial.reachesTargetByEstimate ?? false,
    reachesTargetConservatively: partial.reachesTargetConservatively ?? false,
    volumeMarginMl: partial.volumeMarginMl ?? null,
    status: partial.status,
    confidenceLabel: partial.confidenceLabel,
    message: partial.message,
  };
}

function confidenceBelowTarget(estimatedVolumeMl: number, targetVolumeMl: number): SensorAttemptConfidenceLabel {
  const ratio = estimatedVolumeMl / targetVolumeMl;
  if (ratio >= 0.85) return 'media';
  return 'alta';
}

function statusBelowTarget(
  estimatedVolumeMl: number,
  targetVolumeMl: number,
): SensorAttemptEvaluationStatus {
  const margin = estimatedVolumeMl - targetVolumeMl;
  const closeThreshold = -0.1 * targetVolumeMl;
  return margin >= closeThreshold ? 'ready' : 'volume_below_target';
}

function unavailableMessage(estimationStatus: string): string {
  switch (estimationStatus) {
    case 'sensor_disconnected':
      return 'Conecta el sensor para evaluar el volumen del intento.';
    case 'no_active_model':
    case 'missing_curve':
    case 'no_spirometer':
    case 'not_ready_for_therapy':
      return 'Se requiere calibración activa para evaluar el intento.';
    case 'model_stale':
      return 'El modelo de calibración debe actualizarse.';
    default:
      return 'La estimación del sensor no está disponible.';
  }
}

export function evaluateSensorAttemptVolume(
  params: EvaluateSensorAttemptVolumeParams,
): SensorAttemptEvaluation {
  const { estimationStatus, inCalibratedRange, clamped, targetVolumeMl } = params;
  const estimatedVolumeMl = isFiniteNumber(params.estimatedVolumeMl) ? params.estimatedVolumeMl : null;
  const lowerBoundMl = isFiniteNumber(params.lowerBoundMl) ? params.lowerBoundMl : null;

  if (NOT_APPLICABLE_STATUSES.has(estimationStatus)) {
    return buildEvaluation(
      {
        status: 'not_applicable',
        confidenceLabel: 'no_disponible',
        message: 'Evaluación del sensor en preparación.',
        estimatedVolumeMl: null,
      },
      params,
    );
  }

  if (estimatedVolumeMl === null || UNAVAILABLE_STATUSES.has(estimationStatus)) {
    return buildEvaluation(
      {
        status: 'sensor_unavailable',
        confidenceLabel: 'no_disponible',
        message: unavailableMessage(estimationStatus),
        estimatedVolumeMl: null,
      },
      params,
    );
  }

  if (clamped || !inCalibratedRange) {
    return buildEvaluation(
      {
        status: 'out_of_range',
        confidenceLabel: 'baja',
        message: 'La lectura está fuera del rango calibrado.',
        volumeMarginMl: estimatedVolumeMl - targetVolumeMl,
      },
      params,
    );
  }

  const volumeMarginMl = estimatedVolumeMl - targetVolumeMl;
  const reachesTargetByEstimate = estimatedVolumeMl >= targetVolumeMl;
  const reachesTargetConservatively =
    lowerBoundMl !== null && lowerBoundMl >= targetVolumeMl;

  if (reachesTargetConservatively) {
    return buildEvaluation(
      {
        status: 'target_reached',
        confidenceLabel: 'alta',
        message: 'El sensor confirma que el objetivo de volumen fue alcanzado.',
        reachesTargetByEstimate: true,
        reachesTargetConservatively: true,
        volumeMarginMl,
      },
      params,
    );
  }

  if (reachesTargetByEstimate) {
    return buildEvaluation(
      {
        status: 'uncertain',
        confidenceLabel: 'media',
        message:
          'El volumen estimado alcanza el objetivo, pero la incertidumbre cruza el umbral.',
        reachesTargetByEstimate: true,
        reachesTargetConservatively: false,
        volumeMarginMl,
      },
      params,
    );
  }

  const belowStatus = statusBelowTarget(estimatedVolumeMl, targetVolumeMl);
  const confidenceLabel = confidenceBelowTarget(estimatedVolumeMl, targetVolumeMl);

  return buildEvaluation(
    {
      status: belowStatus,
      confidenceLabel,
      message:
        belowStatus === 'ready'
          ? 'Te acercas al objetivo de volumen.'
          : 'Aún falta volumen para alcanzar el objetivo.',
      volumeMarginMl,
    },
    params,
  );
}

export type SensorAttemptEvaluationUiHint = {
  title: string;
  marginText: string | null;
  confidenceText: string | null;
  holdHint: string | null;
};

export function formatVolumeMarginMl(marginMl: number | null): string | null {
  if (marginMl === null || !Number.isFinite(marginMl)) return null;
  const rounded = Math.round(marginMl);
  if (rounded === 0) return '0 mL';
  return rounded > 0 ? `+${rounded} mL` : `${rounded} mL`;
}

function confidenceDisplayLabel(label: SensorAttemptConfidenceLabel): string | null {
  switch (label) {
    case 'alta':
      return 'Confianza alta';
    case 'media':
      return 'Confianza media';
    case 'baja':
      return 'Confianza baja';
    default:
      return null;
  }
}

export function getSensorAttemptEvaluationUiHint(
  evaluation: SensorAttemptEvaluation,
  options?: { needsHoldTime?: boolean },
): SensorAttemptEvaluationUiHint | null {
  const marginText = formatVolumeMarginMl(evaluation.volumeMarginMl);
  const confidenceText = confidenceDisplayLabel(evaluation.confidenceLabel);
  const holdHint = options?.needsHoldTime ? 'Sostén un poco más' : null;

  switch (evaluation.status) {
    case 'target_reached':
      return {
        title: 'Objetivo confirmado',
        marginText,
        confidenceText,
        holdHint,
      };
    case 'uncertain':
      return {
        title: 'Lectura cercana',
        marginText,
        confidenceText,
        holdHint: null,
      };
    case 'ready':
      return {
        title: 'Cerca del objetivo',
        marginText,
        confidenceText,
        holdHint: null,
      };
    case 'volume_below_target':
      return {
        title: 'Falta volumen',
        marginText,
        confidenceText,
        holdHint: null,
      };
    case 'out_of_range':
      return {
        title: 'Fuera de rango',
        marginText,
        confidenceText: null,
        holdHint: null,
      };
    case 'sensor_unavailable':
      return {
        title: 'Sensor no disponible',
        marginText: null,
        confidenceText: null,
        holdHint: null,
      };
    case 'not_applicable':
      return null;
    default:
      return null;
  }
}
