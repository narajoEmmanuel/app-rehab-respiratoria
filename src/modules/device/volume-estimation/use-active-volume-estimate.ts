/**
 * Hook React para estimación en vivo de volumen (modelo activo + sensor global).
 * Solo lee useSensorConnection(); no crea ni cierra WebSocket.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import type { ActiveVolumeEstimateResult } from '@/src/modules/device/calibration/active-volume-estimation-types';
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import type {
  SensorConnectionStatus,
  SensorReading,
} from '@/src/modules/device/types/sensor-reading';
import {
  deriveVolumeEstimationReadiness,
  estimateVolumeForCurrentSensorReading,
  getVolumeEstimationUserMessage,
  loadActiveVolumeEstimationContext,
} from '@/src/modules/device/volume-estimation/volume-estimation-service';
import {
  EMPTY_ACTIVE_VOLUME_ESTIMATION_CONTEXT,
  type ActiveVolumeEstimationContext,
  type VolumeEstimationReadinessStatus,
} from '@/src/modules/device/volume-estimation/volume-estimation-types';

export type UseActiveVolumeEstimateOptions = {
  /** Si se omite, usa el espirómetro activo global. */
  spirometerDeviceId?: string;
  /** Cambios sin guardar en calibración marcan el modelo como desactualizado. */
  hasUnsavedChanges?: boolean;
  /** Desactiva carga automática (p. ej. pantalla aún sin espirómetro listo). */
  enabled?: boolean;
};

export type UseActiveVolumeEstimateResult = {
  loading: boolean;
  refresh: () => Promise<void>;
  context: ActiveVolumeEstimationContext;
  estimate: ActiveVolumeEstimateResult;
  status: VolumeEstimationReadinessStatus;
  message: string;
  lastUpdatedAt: number | null;
  lastReading: SensorReading | null;
  sensorStatus: SensorConnectionStatus;
  sensorConnected: boolean;
  activeModel: ActiveCalibrationModel | null;
  calibrationProfile: CalibrationProfile | null;
  isModelStale: boolean;
  loadError: string | null;
};

export function useActiveVolumeEstimate(
  options?: UseActiveVolumeEstimateOptions,
): UseActiveVolumeEstimateResult {
  const { lastReading, status: sensorStatus, mode } = useSensorConnection();
  const enabled = options?.enabled !== false;
  const spirometerDeviceId = options?.spirometerDeviceId;
  const hasUnsavedChanges = options?.hasUnsavedChanges ?? false;

  const [loading, setLoading] = useState(enabled);
  const [context, setContext] = useState<ActiveVolumeEstimationContext>(
    EMPTY_ACTIVE_VOLUME_ESTIMATION_CONTEXT,
  );
  const [activeModel, setActiveModel] = useState<ActiveCalibrationModel | null>(null);
  const [calibrationProfile, setCalibrationProfile] = useState<CalibrationProfile | null>(null);
  const [isModelStale, setIsModelStale] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await loadActiveVolumeEstimationContext(spirometerDeviceId);
      setContext(loaded.context);
      setActiveModel(loaded.activeModel);
      setCalibrationProfile(loaded.calibrationProfile);
      setIsModelStale(loaded.isModelStale);
      setLastUpdatedAt(Date.now());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al cargar estimación de volumen';
      setLoadError(message);
      setContext({ ...EMPTY_ACTIVE_VOLUME_ESTIMATION_CONTEXT });
      setActiveModel(null);
      setCalibrationProfile(null);
      setIsModelStale(true);
    } finally {
      setLoading(false);
    }
  }, [enabled, spirometerDeviceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sensorConnected =
    sensorStatus === 'connected' || sensorStatus === 'receiving' || mode === 'mock';

  const distanceMm = lastReading?.distanceMm;
  const distanceIsFinite = typeof distanceMm === 'number' && Number.isFinite(distanceMm);

  const estimate = useMemo(
    () =>
      estimateVolumeForCurrentSensorReading({
        context,
        activeModel,
        calibrationProfile,
        distanceMm:
          sensorConnected && distanceIsFinite ? (distanceMm as number) : null,
        sensorConnected,
        hasUnsavedChanges,
      }),
    [
      activeModel,
      calibrationProfile,
      context,
      distanceIsFinite,
      distanceMm,
      hasUnsavedChanges,
      sensorConnected,
    ],
  );

  const readinessStatus = useMemo(
    () =>
      deriveVolumeEstimationReadiness({
        loading,
        error: loadError,
        context,
        estimate,
      }),
    [context, estimate, loadError, loading],
  );

  const message = useMemo(
    () => getVolumeEstimationUserMessage(readinessStatus, estimate),
    [estimate, readinessStatus],
  );

  return {
    loading,
    refresh,
    context,
    estimate,
    status: readinessStatus,
    message,
    lastUpdatedAt,
    lastReading,
    sensorStatus,
    sensorConnected,
    activeModel,
    calibrationProfile,
    isModelStale: isModelStale || hasUnsavedChanges,
    loadError,
  };
}
