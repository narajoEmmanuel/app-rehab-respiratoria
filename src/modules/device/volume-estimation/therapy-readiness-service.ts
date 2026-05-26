/**
 * Compuerta de seguridad para iniciar terapia (sensor + modelo activo + estimación en rango).
 */
import { Alert } from 'react-native';

import {
  resolveDiagnosticCalibration,
  type DiagnosticCalibrationBlockReason,
} from '@/src/modules/device/calibration/diagnostic-calibration-readiness';
import type { ActiveVolumeEstimateResult } from '@/src/modules/device/calibration/active-volume-estimation-types';
import {
  deriveVolumeEstimationReadiness,
  estimateVolumeForCurrentSensorReading,
  loadActiveVolumeEstimationContext,
  type LoadActiveVolumeEstimationContextResult,
} from '@/src/modules/device/volume-estimation/volume-estimation-service';
import type {
  ActiveVolumeEstimationContext,
  ActiveVolumeEstimationState,
  VolumeEstimationReadinessStatus,
} from '@/src/modules/device/volume-estimation/volume-estimation-types';
import type {
  TherapyReadinessActionRoute,
  TherapyReadinessGate,
  TherapyReadinessGateEstimate,
  TherapyReadinessStatus,
} from '@/src/modules/device/volume-estimation/therapy-readiness-types';

export type DiagnosticSensorReadinessGate = TherapyReadinessGate & {
  canStartDiagnostic: boolean;
};

const EMPTY_GATE_ESTIMATE: TherapyReadinessGateEstimate = {
  estimatedVolumeMl: null,
  u95Ml: null,
  inCalibratedRange: false,
  clamped: false,
};

export type TherapyReadinessInputState = Pick<
  ActiveVolumeEstimationState,
  'loading' | 'context' | 'estimate' | 'status' | 'message'
> & {
  loadError?: string | null;
};

function resolveTherapyStatus(state: TherapyReadinessInputState): TherapyReadinessStatus {
  if (state.loading) return 'loading';
  if (state.loadError || state.status === 'error') return 'error';
  if (!state.context.spirometerDeviceId) return 'no_spirometer';
  if (state.status === 'no_active_model') return 'no_active_model';
  if (state.status === 'model_stale' || state.context.isModelStale) return 'model_stale';
  if (state.status === 'not_ready_for_therapy' || !state.context.isReadyForTherapy) {
    return 'model_not_ready_for_therapy';
  }
  if (state.status === 'sensor_disconnected') return 'sensor_disconnected';
  if (state.status === 'invalid_sensor_reading') return 'invalid_sensor_reading';
  if (state.status === 'missing_curve') return 'missing_curve';
  if (state.status === 'out_of_range') return 'out_of_range';
  if (
    state.status === 'ready' &&
    state.estimate.status === 'ok' &&
    state.estimate.inCalibratedRange &&
    state.estimate.roundedVolumeMl !== null
  ) {
    return 'ready';
  }
  if (
    state.estimate.status === 'out_of_range_low' ||
    state.estimate.status === 'out_of_range_high'
  ) {
    return 'out_of_range';
  }
  return 'error';
}

function gateEstimateFromResult(
  estimate: ActiveVolumeEstimateResult,
): TherapyReadinessGate['estimate'] {
  return {
    estimatedVolumeMl: estimate.roundedVolumeMl,
    u95Ml: estimate.u95Ml,
    inCalibratedRange: estimate.inCalibratedRange,
    clamped: estimate.clamped,
  };
}

function gateContextFromVolume(
  context: ActiveVolumeEstimationContext,
): TherapyReadinessGate['context'] {
  return {
    spirometerDeviceId: context.spirometerDeviceId,
    spirometerLabel: context.spirometerLabel,
    modelKind: context.activeModelKind,
    activeModelId: context.activeModelId,
    calibratedRangeMl: context.calibratedRangeMl,
    maxU95Ml: context.maxU95Ml,
    clinicalStatusLabel: context.clinicalStatusLabel,
  };
}

type GateCopy = Pick<
  TherapyReadinessGate,
  'canStartTherapy' | 'title' | 'message' | 'actionLabel' | 'actionRoute'
>;

function copyForStatus(status: TherapyReadinessStatus): GateCopy {
  switch (status) {
    case 'loading':
      return {
        canStartTherapy: false,
        title: 'Preparación necesaria',
        message: 'Comprobando sensor y calibración…',
        actionLabel: null,
        actionRoute: null,
      };
    case 'no_spirometer':
      return {
        canStartTherapy: false,
        title: 'Revisa la calibración',
        message: 'Selecciona el espirómetro que vas a usar antes de comenzar.',
        actionLabel: 'Ir a calibración',
        actionRoute: '/sensor-calibration',
      };
    case 'no_active_model':
      return {
        canStartTherapy: false,
        title: 'Revisa la calibración',
        message:
          'Antes de iniciar, activa un modelo de calibración para el espirómetro seleccionado.',
        actionLabel: 'Ir a calibración',
        actionRoute: '/sensor-calibration',
      };
    case 'model_stale':
      return {
        canStartTherapy: false,
        title: 'Modelo desactualizado',
        message:
          'El modelo activo está desactualizado. Revisa la calibración antes de comenzar.',
        actionLabel: 'Actualizar calibración',
        actionRoute: '/sensor-calibration',
      };
    case 'model_not_ready_for_therapy':
      return {
        canStartTherapy: false,
        title: 'Revisa la calibración',
        message: 'Esta actividad requiere sensor y calibración activa.',
        actionLabel: 'Ir a calibración',
        actionRoute: '/sensor-calibration',
      };
    case 'sensor_disconnected':
      return {
        canStartTherapy: false,
        title: 'Conecta el sensor',
        message: 'Para iniciar la actividad, conecta el sensor RESPIRA+.',
        actionLabel: 'Conectar sensor',
        actionRoute: '/sensor-connection',
      };
    case 'invalid_sensor_reading':
      return {
        canStartTherapy: false,
        title: 'Preparación necesaria',
        message: 'La lectura del sensor no es válida. Revisa la conexión antes de comenzar.',
        actionLabel: 'Revisar sensor',
        actionRoute: '/sensor-connection',
      };
    case 'missing_curve':
      return {
        canStartTherapy: false,
        title: 'Revisa la calibración',
        message: 'El modelo activo requiere reactivación antes de comenzar.',
        actionLabel: 'Ir a calibración',
        actionRoute: '/sensor-calibration',
      };
    case 'out_of_range':
      return {
        canStartTherapy: false,
        title: 'Lectura fuera de rango',
        message:
          'La lectura actual está fuera del rango calibrado. Ajusta el espirómetro o revisa el montaje.',
        actionLabel: 'Revisar calibración',
        actionRoute: '/sensor-calibration',
      };
    case 'ready':
      return {
        canStartTherapy: true,
        title: 'Sistema listo',
        message: 'Puedes iniciar la actividad.',
        actionLabel: null,
        actionRoute: null,
      };
    case 'error':
    default:
      return {
        canStartTherapy: false,
        title: 'Preparación necesaria',
        message: 'Esta actividad requiere sensor y calibración activa.',
        actionLabel: 'Conectar sensor',
        actionRoute: '/sensor-connection',
      };
  }
}

export function buildTherapyReadinessGate(
  state: TherapyReadinessInputState,
): TherapyReadinessGate {
  const status = resolveTherapyStatus(state);
  const copy = copyForStatus(status);
  const userWarning =
    status !== 'ready' && state.estimate.warning ? state.estimate.warning : null;

  return {
    status,
    ...copy,
    message: userWarning ?? copy.message,
    estimate: gateEstimateFromResult(state.estimate),
    context: gateContextFromVolume(state.context),
  };
}

export function therapyReadinessCardStatusLabel(status: TherapyReadinessStatus): string {
  switch (status) {
    case 'ready':
      return 'Sistema listo';
    case 'sensor_disconnected':
      return 'Conectar sensor';
    case 'no_spirometer':
      return 'Seleccionar espirómetro';
    case 'no_active_model':
      return 'Sin modelo activo';
    case 'model_stale':
      return 'Modelo desactualizado';
    case 'model_not_ready_for_therapy':
      return 'Modelo no apto';
    case 'invalid_sensor_reading':
      return 'Lectura no válida';
    case 'missing_curve':
      return 'Reactivar modelo';
    case 'out_of_range':
      return 'Fuera de rango';
    case 'loading':
      return 'Revisando…';
    case 'error':
      return 'Error de verificación';
    default:
      return 'Preparar dispositivo';
  }
}

/** Mapea el estado de estimación al estado de la compuerta (prioridad terapia). */
export function volumeEstimationStatusToTherapy(
  volumeStatus: VolumeEstimationReadinessStatus,
  context: ActiveVolumeEstimationContext,
  estimate: ActiveVolumeEstimateResult,
  loading: boolean,
  loadError?: string | null,
): TherapyReadinessStatus {
  return resolveTherapyStatus({
    loading,
    context,
    estimate,
    status: volumeStatus,
    message: '',
    loadError,
  });
}

export type EvaluateTherapyReadinessOnDemandParams = {
  spirometerDeviceId?: string;
  distanceMm: number | null;
  sensorConnected: boolean;
  hasUnsavedChanges?: boolean;
};

/** Evalúa la compuerta al instante (p. ej. tras elegir «Con sensor»). */
export async function evaluateTherapyReadinessOnDemand(
  params: EvaluateTherapyReadinessOnDemandParams,
): Promise<TherapyReadinessGate> {
  const loaded = await loadActiveVolumeEstimationContext(params.spirometerDeviceId);
  const estimate = estimateVolumeForCurrentSensorReading({
    context: loaded.context,
    activeModel: loaded.activeModel,
    calibrationProfile: loaded.calibrationProfile,
    distanceMm: params.distanceMm,
    sensorConnected: params.sensorConnected,
    hasUnsavedChanges: params.hasUnsavedChanges,
  });
  const volumeStatus = deriveVolumeEstimationReadiness({
    loading: false,
    error: null,
    context: loaded.context,
    estimate,
  });
  return buildTherapyReadinessGate({
    loading: false,
    context: loaded.context,
    estimate,
    status: volumeStatus,
    message: '',
    loadError: null,
  });
}

function buildDiagnosticSensorReadinessGate(
  status: TherapyReadinessStatus,
  loaded: LoadActiveVolumeEstimationContextResult,
  options?: { notEligibleReason?: string },
): DiagnosticSensorReadinessGate {
  const canStart = status === 'ready';
  const copy = copyForStatus(status);
  const spirometerLabel = loaded.context.spirometerLabel;
  const deviceSuffix = spirometerLabel ? ` para ${spirometerLabel}` : '';

  return {
    status,
    canStartTherapy: canStart,
    canStartDiagnostic: canStart,
    title: canStart ? 'Sensor conectado' : copy.title,
    message: canStart
      ? `Calibración activa detectada${deviceSuffix}. Puedes iniciar la evaluación con medición real.`
      : (options?.notEligibleReason ?? copy.message),
    actionLabel: canStart ? null : copy.actionLabel,
    actionRoute: canStart ? null : copy.actionRoute,
    estimate: EMPTY_GATE_ESTIMATE,
    context: gateContextFromVolume(loaded.context),
  };
}

export type EvaluateDiagnosticSensorReadinessParams = {
  spirometerDeviceId?: string;
  sensorConnected: boolean;
  patientId?: number | null;
};

function mapBlockReasonToTherapyStatus(
  reason: DiagnosticCalibrationBlockReason,
): TherapyReadinessStatus {
  switch (reason) {
    case 'no_spirometer':
      return 'no_spirometer';
    case 'sensor_disconnected':
      return 'sensor_disconnected';
    case 'no_saved_calibration':
    case 'no_active_model':
      return 'no_active_model';
    case 'model_stale':
      return 'model_stale';
    case 'model_missing_curve':
      return 'missing_curve';
    case 'model_not_ready':
    case 'profile_not_eligible':
    case 'activation_failed':
      return 'model_not_ready_for_therapy';
    default:
      return 'error';
  }
}

/** Evalúa si el diagnóstico con sensor puede iniciarse (calibración guardada + modelo usable + sensor). */
export async function evaluateDiagnosticSensorReadinessOnDemand(
  params: EvaluateDiagnosticSensorReadinessParams,
): Promise<DiagnosticSensorReadinessGate> {
  const audit = await resolveDiagnosticCalibration({
    preferredSpirometerDeviceId: params.spirometerDeviceId,
    sensorConnected: params.sensorConnected,
    patientId: params.patientId,
  });

  const loaded = await loadActiveVolumeEstimationContext(
    audit.resolvedSpirometerId ?? params.spirometerDeviceId,
  );

  if (audit.canStartDiagnostic && audit.activeModel) {
    return buildDiagnosticSensorReadinessGate('ready', {
      ...loaded,
      activeModel: audit.activeModel,
      isModelStale: false,
    });
  }

  const status = audit.blockReason
    ? mapBlockReasonToTherapyStatus(audit.blockReason)
    : 'no_active_model';

  return buildDiagnosticSensorReadinessGate(status, loaded, {
    notEligibleReason: audit.blockDetail ?? undefined,
  });
}

export type DiagnosticSensorReadyConfirmationOptions = {
  gate: DiagnosticSensorReadinessGate;
  isRepeat: boolean;
  onConfirm: () => void;
};

/** Confirmación cuando sensor y calibración están listos antes de entrar al diagnóstico. */
export function showDiagnosticSensorReadyConfirmation(
  options: DiagnosticSensorReadyConfirmationOptions,
): void {
  const { gate, isRepeat, onConfirm } = options;
  const confirmLabel = isRepeat ? 'Repetir evaluación' : 'Iniciar evaluación';

  Alert.alert(gate.title, gate.message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}

export type TherapyReadinessAlertOptions = {
  onPracticeWithoutSensor?: () => void;
  practiceButtonLabel?: string;
};

export type LevelPlayModePickerOptions = {
  onWithSensor: () => void;
  onPracticeMode: () => void;
};

export type DiagnosticPlayModePickerOptions = {
  onWithSensor: () => void;
  onPracticeMode: () => void;
};

const LEVEL_PLAY_MODE_TITLE = '¿Cómo quieres jugar este nivel?';
const LEVEL_PLAY_MODE_MESSAGE =
  'Elige si quieres iniciar una sesión oficial con sensor o practicar sin medición real.';

const DIAGNOSTIC_PLAY_MODE_TITLE = '¿Cómo quieres realizar la evaluación inicial?';
const DIAGNOSTIC_PLAY_MODE_MESSAGE =
  'Con sensor se estima tu volumen de referencia. Modo práctica simula el flujo con el dedo y no guarda una evaluación oficial.';

const TOUCH_PRACTICE_ALERT_NOTE =
  'Puedes practicar la actividad sin sensor. Esta opción no usa medición real.';

/** Pop-up tras «Jugar nivel»: elige Con sensor vs Modo práctica (sin validar calibración). */
export function showLevelPlayModePicker(options: LevelPlayModePickerOptions): void {
  const { onWithSensor, onPracticeMode } = options;

  Alert.alert(LEVEL_PLAY_MODE_TITLE, LEVEL_PLAY_MODE_MESSAGE, [
    { text: 'Con sensor', onPress: onWithSensor },
    { text: 'Modo práctica', onPress: onPracticeMode },
    { text: 'Cancelar', style: 'cancel' },
  ]);
}

/** Antes de entrar al diagnóstico: sensor oficial vs práctica táctil. */
export function showDiagnosticPlayModePicker(options: DiagnosticPlayModePickerOptions): void {
  const { onWithSensor, onPracticeMode } = options;

  Alert.alert(DIAGNOSTIC_PLAY_MODE_TITLE, DIAGNOSTIC_PLAY_MODE_MESSAGE, [
    { text: 'Con sensor', onPress: onWithSensor },
    { text: 'Modo práctica', onPress: onPracticeMode },
    { text: 'Cancelar', style: 'cancel' },
  ]);
}

export function showTherapyReadinessAlert(
  gate: TherapyReadinessGate,
  onNavigate: (route: TherapyReadinessActionRoute) => void,
  options?: TherapyReadinessAlertOptions,
): void {
  if (gate.canStartTherapy) return;

  const alertCopy = copyForStatus(gate.status);
  const practiceNote = options?.onPracticeWithoutSensor ? `\n\n${TOUCH_PRACTICE_ALERT_NOTE}` : '';
  const body = `${alertCopy.message}${practiceNote}`;

  const buttons: {
    text: string;
    style?: 'cancel' | 'default' | 'destructive';
    onPress?: () => void;
  }[] = [{ text: 'Cancelar', style: 'cancel' }];

  if (alertCopy.actionLabel && alertCopy.actionRoute) {
    buttons.push({
      text: alertCopy.actionLabel,
      onPress: () => onNavigate(alertCopy.actionRoute!),
    });
  }

  if (options?.onPracticeWithoutSensor) {
    buttons.push({
      text: options.practiceButtonLabel ?? 'Modo práctica',
      onPress: options.onPracticeWithoutSensor,
    });
  }

  if (buttons.length > 1) {
    Alert.alert(alertCopy.title, body, buttons);
    return;
  }

  Alert.alert(alertCopy.title, body, [{ text: 'Entendido', style: 'default' }]);
}
