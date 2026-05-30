import type { ActiveVolumeEstimateResult } from '@/src/modules/device/calibration/active-volume-estimation-types';
import type { SensorConnectionStatus } from '@/src/modules/device/types/sensor-reading';
import type { VolumeEstimationReadinessStatus } from '@/src/modules/device/volume-estimation/volume-estimation-types';
import type { SensorLiveReadingCheck } from '@/src/modules/session/sensor/sensor-live-reading';

export type ResolveTherapyVolumeEstimateStatusParams = {
  modelReady: boolean;
  sensorConnected: boolean;
  liveCheck: SensorLiveReadingCheck;
  estimateStatus?: ActiveVolumeEstimateResult['status'];
};

/** Estado de estimación para terapia en vivo (modelo + conexión + lectura viva). */
export function resolveTherapyVolumeEstimateStatus(
  params: ResolveTherapyVolumeEstimateStatusParams,
): VolumeEstimationReadinessStatus {
  const { modelReady, sensorConnected, liveCheck, estimateStatus } = params;

  if (!modelReady) return 'no_active_model';
  if (!sensorConnected) return 'sensor_disconnected';

  if (!liveCheck.live) {
    if (liveCheck.reason === 'sensor_not_connected') return 'sensor_disconnected';
    return 'invalid_sensor_reading';
  }

  if (estimateStatus === 'out_of_range_low' || estimateStatus === 'out_of_range_high') {
    return 'out_of_range';
  }
  if (estimateStatus === 'ok') return 'ready';
  if (estimateStatus === 'sensor_disconnected') return 'sensor_disconnected';
  if (estimateStatus === 'invalid_sensor_reading') return 'invalid_sensor_reading';

  return 'ready';
}

/** Mensaje breve para el HUD de terapia (sin detalle técnico). */
export function therapyVolumeHudMessage(
  status: VolumeEstimationReadinessStatus,
  sensorStatus: SensorConnectionStatus,
): string {
  if (
    status === 'sensor_disconnected' ||
    sensorStatus === 'disconnected' ||
    sensorStatus === 'connecting' ||
    sensorStatus === 'error'
  ) {
    return 'Reconectando sensor';
  }
  return 'Esperando señal del sensor';
}

export function therapyHudShowsEstimatedVolume(
  status: VolumeEstimationReadinessStatus,
  hasLiveReading: boolean,
): boolean {
  if (!hasLiveReading) return false;
  return status === 'ready' || status === 'out_of_range';
}
