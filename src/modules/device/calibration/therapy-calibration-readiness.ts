/**
 * Estado unificado de calibración para terapia (perfil + modelo activo).
 */
import {
  hasActiveCalibrationCurveSnapshot,
  isActiveCalibrationModelStale,
} from '@/src/modules/device/calibration/active-calibration-model';
import { loadActiveCalibrationModelForSpirometer } from '@/src/modules/device/calibration/active-calibration-storage';
import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import { loadCalibrationProfileForSpirometer } from '@/src/modules/device/calibration/calibration-storage';
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';
import { ensureRespira3000PredefinedCalibrationInstalled } from '@/src/modules/device/calibration/predefined-calibration-service';
import {
  getActiveSpirometerDevice,
  listSpirometerDevices,
  SPIROMETER_DEVICE_3000ML_ID,
} from '@/src/modules/device/spirometer';

export type TherapyCalibrationStatus = 'ready' | 'pending' | 'needs_review';

export type TherapyCalibrationReadiness = {
  spirometerDeviceId: string | null;
  spirometerLabel: string | null;
  profile: CalibrationProfile | null;
  activeModel: ActiveCalibrationModel | null;
  isModelStale: boolean;
  hasActiveModel: boolean;
  isReadyForTherapy: boolean;
  status: TherapyCalibrationStatus;
  statusLabel: string;
  detailMessage: string | null;
};

export function therapyCalibrationStatusLabel(status: TherapyCalibrationStatus): string {
  switch (status) {
    case 'ready':
      return 'Calibración verificada';
    case 'pending':
      return 'Calibración pendiente';
    case 'needs_review':
      return 'Requiere revisión';
    default:
      return 'Calibración pendiente';
  }
}

function modelHasUsableCoefficients(model: ActiveCalibrationModel): boolean {
  const slope = model.recommendedModel.coefficients.slope;
  const intercept = model.recommendedModel.coefficients.intercept;
  return typeof slope === 'number' && typeof intercept === 'number' && Number.isFinite(slope) && Number.isFinite(intercept);
}

function isUsableActiveModel(model: ActiveCalibrationModel | null): boolean {
  if (!model) return false;
  if (hasActiveCalibrationCurveSnapshot(model)) return true;
  return modelHasUsableCoefficients(model);
}

export async function resolveTherapyCalibrationReadiness(
  spirometerDeviceId?: string,
): Promise<TherapyCalibrationReadiness> {
  const devices = await listSpirometerDevices();
  const resolvedDevice = spirometerDeviceId
    ? devices.find((d) => d.id === spirometerDeviceId) ?? (await getActiveSpirometerDevice())
    : await getActiveSpirometerDevice();

  if (!resolvedDevice) {
    return {
      spirometerDeviceId: null,
      spirometerLabel: null,
      profile: null,
      activeModel: null,
      isModelStale: true,
      hasActiveModel: false,
      isReadyForTherapy: false,
      status: 'pending',
      statusLabel: therapyCalibrationStatusLabel('pending'),
      detailMessage: 'Configura la calibración del espirómetro RESPIRA+ 3000 mL.',
    };
  }

  const deviceId =
    resolvedDevice.id === SPIROMETER_DEVICE_3000ML_ID
      ? SPIROMETER_DEVICE_3000ML_ID
      : SPIROMETER_DEVICE_3000ML_ID;

  await ensureRespira3000PredefinedCalibrationInstalled(deviceId);

  const profile = await loadCalibrationProfileForSpirometer(deviceId);
  const activeModel = await loadActiveCalibrationModelForSpirometer(deviceId);
  const isModelStale = isActiveCalibrationModelStale(activeModel, profile, false);
  const hasActiveModel = isUsableActiveModel(activeModel) && !isModelStale;
  const isReadyForTherapy = hasActiveModel && Boolean(activeModel?.isReadyForTherapy);

  let status: TherapyCalibrationStatus = 'pending';
  let detailMessage: string | null = null;

  if (isReadyForTherapy) {
    status = 'ready';
  } else if (isModelStale) {
    status = 'needs_review';
    detailMessage = 'La calibración guardada cambió. Vuelve a verificar la configuración técnica.';
  } else if (activeModel && !activeModel.isReadyForTherapy) {
    status = 'needs_review';
    detailMessage = activeModel.therapyReadinessReason;
  } else {
    status = 'pending';
    detailMessage =
      'Realiza la calibración técnica del espirómetro RESPIRA+ 3000 mL para habilitar la terapia con sensor.';
  }

  return {
    spirometerDeviceId: deviceId,
    spirometerLabel: resolvedDevice.label,
    profile,
    activeModel,
    isModelStale,
    hasActiveModel,
    isReadyForTherapy,
    status,
    statusLabel: therapyCalibrationStatusLabel(status),
    detailMessage,
  };
}

