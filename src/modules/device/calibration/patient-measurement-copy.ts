/**
 * Copy de medición para vista paciente (sin jerga de calibración cuando el modo técnico está off).
 */
import { isTechnicalCalibrationEnabled } from '@/src/modules/device/calibration/technical-calibration-flags';
import type { TherapyCalibrationStatus } from '@/src/modules/device/calibration/therapy-calibration-readiness';

export const PATIENT_MEASUREMENT_LOAD_ERROR =
  'No fue posible cargar la medición RESPIRA+.';
export const PATIENT_MEASUREMENT_LOAD_ERROR_HELPER =
  'Reinicia la app o revisa la conexión del sensor.';
export const PATIENT_MEASUREMENT_CONNECT_HELPER =
  'Conecta el sensor para ver tu volumen en vivo.';
export const PATIENT_MEASUREMENT_CONNECT_SENSOR =
  'Conecta el sensor para medir';

export type PatientMeasurementPhase =
  | 'loading'
  | 'preparing'
  | 'load_error'
  | 'measurement_ready'
  | 'sensor_ready'
  | 'technical_pending'
  | 'technical_ready'
  | 'technical_needs_review';

export type ResolvePatientMeasurementPhaseParams = {
  technicalMode?: boolean;
  snapshotLoading?: boolean;
  snapshotCorrupt?: boolean;
  therapyReady: boolean;
  therapyStatus: TherapyCalibrationStatus;
  sensorConnected?: boolean;
  signalLive?: boolean;
};

export function resolvePatientMeasurementPhase(
  params: ResolvePatientMeasurementPhaseParams,
): PatientMeasurementPhase {
  const technical = params.technicalMode ?? isTechnicalCalibrationEnabled();

  if (params.snapshotLoading) {
    return technical ? 'technical_pending' : 'loading';
  }
  if (params.snapshotCorrupt) {
    return technical ? 'technical_needs_review' : 'load_error';
  }

  if (technical) {
    if (params.therapyReady) return 'technical_ready';
    if (params.therapyStatus === 'needs_review') return 'technical_needs_review';
    return 'technical_pending';
  }

  if (params.therapyReady) {
    if (params.signalLive) return 'sensor_ready';
    return 'measurement_ready';
  }

  if (params.therapyStatus === 'needs_review') {
    return 'load_error';
  }

  return 'preparing';
}

export function patientMeasurementStatusLabel(
  phase: PatientMeasurementPhase,
  technicalMode?: boolean,
): string {
  const technical = technicalMode ?? isTechnicalCalibrationEnabled();

  if (technical) {
    switch (phase) {
      case 'technical_ready':
        return 'Calibración verificada';
      case 'technical_needs_review':
        return 'Calibración con errores';
      case 'loading':
      case 'preparing':
      case 'technical_pending':
      default:
        return 'Calibración pendiente';
    }
  }

  switch (phase) {
    case 'loading':
    case 'preparing':
      return 'Preparando medición';
    case 'load_error':
      return PATIENT_MEASUREMENT_LOAD_ERROR;
    case 'measurement_ready':
      return 'Calibración activa';
    case 'sensor_ready':
      return 'Sensor listo para medir';
    default:
      return 'Preparando medición';
  }
}

export function patientMeasurementHelper(
  phase: PatientMeasurementPhase,
  technicalMode?: boolean,
): string | null {
  const technical = technicalMode ?? isTechnicalCalibrationEnabled();

  if (technical) {
    switch (phase) {
      case 'technical_ready':
        return null;
      case 'technical_needs_review':
        return 'El perfil guardado no se pudo leer. Configura de nuevo el espirómetro.';
      case 'loading':
        return 'Comprobando configuración…';
      default:
        return 'Configura tu espirómetro para estimar el volumen en terapia.';
    }
  }

  switch (phase) {
    case 'loading':
    case 'preparing':
      return 'Verificando medición…';
    case 'load_error':
      return PATIENT_MEASUREMENT_LOAD_ERROR_HELPER;
    case 'measurement_ready':
      return PATIENT_MEASUREMENT_CONNECT_HELPER;
    case 'sensor_ready':
      return null;
    default:
      return PATIENT_MEASUREMENT_CONNECT_HELPER;
  }
}

export function patientMeasurementMetricLabel(technicalMode?: boolean): string {
  return (technicalMode ?? isTechnicalCalibrationEnabled()) ? 'Calibración' : 'Medición';
}

export function patientMeasurementSectionTitle(technicalMode?: boolean): string {
  return (technicalMode ?? isTechnicalCalibrationEnabled())
    ? 'Sensor y calibración'
    : 'Sensor y medición';
}

export function patientMeasurementSectionSubtitle(technicalMode?: boolean): string {
  return (technicalMode ?? isTechnicalCalibrationEnabled())
    ? 'Conecta el sensor por WiFi y revisa la calibración del espirómetro.'
    : 'Conecta el sensor por WiFi para ver tu volumen en vivo.';
}

export function patientMeasurementConnectionHint(params: {
  technicalMode?: boolean;
  readyForTherapy: boolean;
  isOnline: boolean;
  therapyReady: boolean;
  streamStateMessage?: string;
  therapyDetailMessage?: string | null;
}): string {
  const technical = params.technicalMode ?? isTechnicalCalibrationEnabled();

  if (params.streamStateMessage) return params.streamStateMessage;

  if (params.readyForTherapy) {
    return technical
      ? 'Conexión activa y calibración verificada. Listo para terapia.'
      : 'Sensor listo para medir. Puedes comenzar tu actividad.';
  }

  if (params.isOnline) {
    if (params.therapyReady) {
      return 'Sensor conectado. Revisa la señal si el volumen no aparece en vivo.';
    }
    return technical
      ? (params.therapyDetailMessage ??
          'Sensor conectado. Completa la calibración verificada del espirómetro.')
      : 'Sensor conectado. Verificando medición…';
  }

  return technical
    ? 'Conecta el dispositivo por WiFi local al ESP32.'
    : PATIENT_MEASUREMENT_CONNECT_SENSOR;
}

export function patientMeasurementConnectionPillLabel(params: {
  technicalMode?: boolean;
  statusError: boolean;
  readyForTherapy: boolean;
  liveReady: boolean;
  therapyReady: boolean;
  isOnline: boolean;
  isConnecting: boolean;
}): string {
  if (params.statusError) return 'Error';
  if (params.readyForTherapy) return 'Listo';
  if (params.liveReady && !params.therapyReady) {
    return (params.technicalMode ?? isTechnicalCalibrationEnabled())
      ? 'Falta calibración'
      : 'Preparando medición';
  }
  if (params.isOnline) return 'Conectado';
  if (params.isConnecting) return 'Conectando…';
  return 'Sin conexión';
}

export function patientMeasurementCardTitle(
  phase: PatientMeasurementPhase,
  technicalMode?: boolean,
): string {
  const technical = technicalMode ?? isTechnicalCalibrationEnabled();

  if (technical) {
    switch (phase) {
      case 'technical_ready':
        return 'Calibración verificada';
      case 'technical_needs_review':
        return 'Calibración con errores';
      case 'loading':
        return 'Revisando calibración…';
      default:
        return 'Calibración pendiente';
    }
  }

  switch (phase) {
    case 'loading':
    case 'preparing':
      return 'Preparando medición';
    case 'load_error':
      return PATIENT_MEASUREMENT_LOAD_ERROR;
    case 'measurement_ready':
    case 'sensor_ready':
      return 'Calibración activa';
    default:
      return 'Preparando medición';
  }
}

export function therapyCalibrationStatusLabelForUi(
  status: TherapyCalibrationStatus,
  options?: { technicalMode?: boolean; signalLive?: boolean; therapyReady?: boolean },
): string {
  const phase = resolvePatientMeasurementPhase({
    technicalMode: options?.technicalMode,
    snapshotLoading: false,
    snapshotCorrupt: false,
    therapyReady: options?.therapyReady ?? status === 'ready',
    therapyStatus: status,
    signalLive: options?.signalLive,
  });
  return patientMeasurementStatusLabel(phase, options?.technicalMode);
}
