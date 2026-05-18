import type { ActiveVolumeEstimateResult } from '@/src/modules/device/calibration/active-volume-estimation-types';
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';
import { isTouchPracticeSession } from '@/src/modules/session/session-input-mode';
import type { SensorAttemptEvaluation } from '@/src/modules/session/sensor-evaluation/sensor-attempt-evaluation-types';
import type {
  OfficialAttemptConfidenceLabel,
  OfficialAttemptValidationResult,
  OfficialAttemptValidationSource,
} from '@/src/modules/session/sensor-evaluation/session-attempt-validation-types';

export type EvaluateOfficialAttemptParams = {
  inputMode: SessionInputMode;
  targetVolumeMl: number;
  requiredHoldMs: number;
  currentHoldMs: number;
  simulatedVolumeMl: number;
  sensorAttemptEvaluation?: SensorAttemptEvaluation;
  activeVolumeEstimate?: Pick<
    ActiveVolumeEstimateResult,
    'roundedVolumeMl' | 'u95Ml'
  >;
};

function touchResult(
  params: EvaluateOfficialAttemptParams,
  source: OfficialAttemptValidationSource,
): OfficialAttemptValidationResult {
  const { targetVolumeMl, requiredHoldMs, currentHoldMs, simulatedVolumeMl } = params;
  const volumeReached = simulatedVolumeMl >= targetVolumeMl;
  const holdReached = currentHoldMs >= requiredHoldMs;
  const attemptValid = volumeReached && holdReached;

  let reason = 'Intento en curso.';
  if (attemptValid) {
    reason = 'Volumen y tiempo sostenido alcanzados (práctica táctil).';
  } else if (!holdReached && !volumeReached) {
    reason = 'Sostén la inspiración y alcanza el volumen objetivo.';
  } else if (!holdReached) {
    reason = 'Sostén un poco más para completar el intento.';
  } else {
    reason = 'Aún falta volumen para el objetivo.';
  }

  return {
    source,
    volumeReached,
    holdReached,
    attemptValid,
    officialVolumeMl: simulatedVolumeMl,
    targetVolumeMl,
    u95Ml: null,
    confidenceLabel: 'no_disponible',
    reason,
  };
}

function sensorUnavailableReason(evaluation: SensorAttemptEvaluation): string {
  switch (evaluation.status) {
    case 'sensor_unavailable':
      return 'El sensor aún no confirma el volumen objetivo.';
    case 'out_of_range':
      return 'La lectura está fuera de rango.';
    case 'uncertain':
      return 'La incertidumbre cruza el objetivo.';
    case 'not_applicable':
      return 'Evaluación del sensor en preparación.';
    default:
      return evaluation.message || 'El sensor aún no confirma el volumen objetivo.';
  }
}

export function evaluateOfficialAttempt(
  params: EvaluateOfficialAttemptParams,
): OfficialAttemptValidationResult {
  if (isTouchPracticeSession(params.inputMode)) {
    return touchResult(params, 'touch_simulation');
  }

  const evaluation = params.sensorAttemptEvaluation;
  const estimate = params.activeVolumeEstimate;
  const { targetVolumeMl, requiredHoldMs, currentHoldMs } = params;
  const holdReached = currentHoldMs >= requiredHoldMs;

  if (!evaluation) {
    return {
      source: 'sensor_model',
      volumeReached: false,
      holdReached,
      attemptValid: false,
      officialVolumeMl: estimate?.roundedVolumeMl ?? null,
      targetVolumeMl,
      u95Ml: estimate?.u95Ml ?? null,
      confidenceLabel: 'no_disponible',
      reason: 'El sensor aún no confirma el volumen objetivo.',
    };
  }

  const officialVolumeMl =
    estimate?.roundedVolumeMl ?? evaluation.estimatedVolumeMl;
  const u95Ml = evaluation.u95Ml ?? estimate?.u95Ml ?? null;
  const confidenceLabel = evaluation.confidenceLabel as OfficialAttemptConfidenceLabel;
  const volumeReached = evaluation.reachesTargetConservatively === true;
  const attemptValid = volumeReached && holdReached;

  if (attemptValid) {
    return {
      source: 'sensor_model',
      volumeReached: true,
      holdReached,
      attemptValid: true,
      officialVolumeMl,
      targetVolumeMl,
      u95Ml,
      confidenceLabel,
      reason: 'Objetivo de volumen confirmado por el sensor (límite inferior con U95).',
    };
  }

  if (!holdReached && volumeReached) {
    return {
      source: 'sensor_model',
      volumeReached: true,
      holdReached: false,
      attemptValid: false,
      officialVolumeMl,
      targetVolumeMl,
      u95Ml,
      confidenceLabel,
      reason: 'Sostén un poco más para completar el intento.',
    };
  }

  if (
    holdReached &&
    evaluation.reachesTargetByEstimate &&
    !evaluation.reachesTargetConservatively
  ) {
    return {
      source: 'sensor_model',
      volumeReached: false,
      holdReached: true,
      attemptValid: false,
      officialVolumeMl,
      targetVolumeMl,
      u95Ml,
      confidenceLabel,
      reason: 'La incertidumbre cruza el objetivo.',
    };
  }

  const blockedStatuses = new Set([
    'sensor_unavailable',
    'out_of_range',
    'uncertain',
    'not_applicable',
  ]);

  if (blockedStatuses.has(evaluation.status) || !volumeReached) {
    return {
      source: 'sensor_model',
      volumeReached: false,
      holdReached,
      attemptValid: false,
      officialVolumeMl,
      targetVolumeMl,
      u95Ml,
      confidenceLabel,
      reason: sensorUnavailableReason(evaluation),
    };
  }

  return {
    source: 'sensor_model',
    volumeReached: false,
    holdReached,
    attemptValid: false,
    officialVolumeMl,
    targetVolumeMl,
    u95Ml,
    confidenceLabel,
    reason: evaluation.message || 'Aún falta volumen para alcanzar el objetivo.',
  };
}

export function officialValidationModeLabel(
  source: OfficialAttemptValidationSource,
): string {
  return source === 'sensor_model' ? 'Validación con sensor' : 'Validación táctil';
}

export function officialValidationStatusHint(
  result: OfficialAttemptValidationResult,
  sensorStatus?: SensorAttemptEvaluation['status'],
): string | null {
  if (result.source === 'touch_simulation') {
    return 'Modo práctica táctil';
  }
  if (result.attemptValid) {
    return 'Objetivo confirmado';
  }
  if (sensorStatus === 'uncertain' || result.reason === 'La incertidumbre cruza el objetivo.') {
    return 'Lectura cercana';
  }
  if (sensorStatus === 'sensor_unavailable') {
    return 'Sensor no disponible';
  }
  return null;
}
