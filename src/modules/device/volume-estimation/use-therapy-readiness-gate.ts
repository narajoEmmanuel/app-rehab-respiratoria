/**
 * Hook de compuerta para iniciar terapia. Reutiliza useActiveVolumeEstimate; no abre WebSocket.
 */
import { useMemo } from 'react';

import {
  buildTherapyReadinessGate,
  type TherapyReadinessInputState,
} from '@/src/modules/device/volume-estimation/therapy-readiness-service';
import type { TherapyReadinessGate } from '@/src/modules/device/volume-estimation/therapy-readiness-types';
import {
  useActiveVolumeEstimate,
  type UseActiveVolumeEstimateOptions,
} from '@/src/modules/device/volume-estimation/use-active-volume-estimate';
import type {
  ActiveVolumeEstimationContext,
  VolumeEstimationReadinessStatus,
} from '@/src/modules/device/volume-estimation/volume-estimation-types';
import type { ActiveVolumeEstimateResult } from '@/src/modules/device/calibration/active-volume-estimation-types';
import type { SensorConnectionStatus, SensorReading } from '@/src/modules/device/types/sensor-reading';

export type UseTherapyReadinessGateOptions = UseActiveVolumeEstimateOptions;

export type UseTherapyReadinessGateResult = {
  loading: boolean;
  gate: TherapyReadinessGate;
  volumeEstimate: ActiveVolumeEstimateResult;
  refresh: () => Promise<void>;
  /** Estado de preparación del servicio de estimación (antes de mapear a terapia). */
  rawStatus: VolumeEstimationReadinessStatus;
  message: string;
  context: ActiveVolumeEstimationContext;
  sensorConnected: boolean;
  sensorStatus: SensorConnectionStatus;
  lastReading: SensorReading | null;
};

export function useTherapyReadinessGate(
  options?: UseTherapyReadinessGateOptions,
): UseTherapyReadinessGateResult {
  const volume = useActiveVolumeEstimate(options);

  const gateInput: TherapyReadinessInputState = useMemo(
    () => ({
      loading: volume.loading,
      context: volume.context,
      estimate: volume.estimate,
      status: volume.status,
      message: volume.message,
      loadError: volume.loadError,
    }),
    [
      volume.context,
      volume.estimate,
      volume.loadError,
      volume.loading,
      volume.message,
      volume.status,
    ],
  );

  const gate = useMemo(() => buildTherapyReadinessGate(gateInput), [gateInput]);

  return {
    loading: volume.loading,
    gate,
    volumeEstimate: volume.estimate,
    refresh: volume.refresh,
    rawStatus: volume.status,
    message: gate.message,
    context: volume.context,
    sensorConnected: volume.sensorConnected,
    sensorStatus: volume.sensorStatus,
    lastReading: volume.lastReading,
  };
}
