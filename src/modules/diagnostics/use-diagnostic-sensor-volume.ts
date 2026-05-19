/**
 * Volumen en vivo para diagnóstico con sensor: modelo cargado una vez, estimación por lectura.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import {
  estimateVolumeForCurrentSensorReading,
  loadActiveVolumeEstimationContext,
  type LoadActiveVolumeEstimationContextResult,
} from '@/src/modules/device/volume-estimation/volume-estimation-service';

const UI_THROTTLE_MS = 48;

export type UseDiagnosticSensorVolumeOptions = {
  enabled: boolean;
  sampling: boolean;
  onVolumeSample: (volumeMl: number) => void;
};

export type UseDiagnosticSensorVolumeResult = {
  modelReady: boolean;
  sensorConnected: boolean;
  spirometerLabel: string | null;
};

export function useDiagnosticSensorVolume(
  options: UseDiagnosticSensorVolumeOptions,
): UseDiagnosticSensorVolumeResult {
  const { enabled, sampling, onVolumeSample } = options;
  const { lastReading, status: sensorStatus, mode } = useSensorConnection();

  const bundleRef = useRef<LoadActiveVolumeEstimationContextResult | null>(null);
  const lastUiPushRef = useRef(0);
  const pendingMlRef = useRef(0);
  const onVolumeSampleRef = useRef(onVolumeSample);
  const [modelReady, setModelReady] = useState(false);
  const [spirometerLabel, setSpirometerLabel] = useState<string | null>(null);

  onVolumeSampleRef.current = onVolumeSample;

  const sensorConnected =
    sensorStatus === 'connected' || sensorStatus === 'receiving' || mode === 'mock';

  useEffect(() => {
    if (!enabled) {
      bundleRef.current = null;
      setModelReady(false);
      setSpirometerLabel(null);
      return;
    }
    let cancelled = false;
    void loadActiveVolumeEstimationContext().then((loaded) => {
      if (cancelled) return;
      bundleRef.current = loaded;
      setModelReady(loaded.activeModel != null);
      setSpirometerLabel(loaded.context.spirometerLabel);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const flushVolume = useCallback((force: boolean) => {
    const ml = pendingMlRef.current;
    const now = Date.now();
    if (!force && now - lastUiPushRef.current < UI_THROTTLE_MS) return;
    lastUiPushRef.current = now;
    onVolumeSampleRef.current(ml);
  }, []);

  useEffect(() => {
    if (!enabled || !sampling) return;

    const bundle = bundleRef.current;
    if (!bundle?.activeModel) return;

    const distanceMm = lastReading?.distanceMm;
    const distanceIsFinite = typeof distanceMm === 'number' && Number.isFinite(distanceMm);

    const estimate = estimateVolumeForCurrentSensorReading({
      context: bundle.context,
      activeModel: bundle.activeModel,
      calibrationProfile: bundle.calibrationProfile,
      distanceMm: sensorConnected && distanceIsFinite ? distanceMm : null,
      sensorConnected,
      hasUnsavedChanges: false,
    });

    pendingMlRef.current = Math.max(0, estimate.roundedVolumeMl ?? 0);
    flushVolume(false);
  }, [enabled, flushVolume, lastReading, sampling, sensorConnected]);

  useEffect(() => {
    if (!enabled || !sampling) return;
    const id = setInterval(() => flushVolume(true), UI_THROTTLE_MS);
    return () => clearInterval(id);
  }, [enabled, flushVolume, sampling]);

  return {
    modelReady,
    sensorConnected,
    spirometerLabel,
  };
}
