/**
 * Volumen en vivo para diagnóstico con sensor: misma lectura viva que terapia.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import {
  estimateVolumeForCurrentSensorReading,
  loadActiveVolumeEstimationContext,
  type LoadActiveVolumeEstimationContextResult,
} from '@/src/modules/device/volume-estimation/volume-estimation-service';
import { checkSensorReadingLive } from '@/src/modules/session/sensor/sensor-live-reading';

const UI_THROTTLE_MS = 48;
/** Re-evalúa lectura obsoleta aunque lastReading no cambie. */
const LIVE_STALE_POLL_MS = 400;

export type DiagnosticVolumeSampleMeta = {
  live: boolean;
};

export type UseDiagnosticSensorVolumeOptions = {
  enabled: boolean;
  sampling: boolean;
  onVolumeSample: (volumeMl: number, meta: DiagnosticVolumeSampleMeta) => void;
};

export type UseDiagnosticSensorVolumeResult = {
  modelReady: boolean;
  sensorConnected: boolean;
  hasLiveReading: boolean;
  spirometerLabel: string | null;
};

export function useDiagnosticSensorVolume(
  options: UseDiagnosticSensorVolumeOptions,
): UseDiagnosticSensorVolumeResult {
  const { enabled, sampling, onVolumeSample } = options;
  const {
    lastReading,
    status: sensorStatus,
    mode,
    lastDataReceivedAt,
    sensorStreamState,
  } = useSensorConnection();

  const bundleRef = useRef<LoadActiveVolumeEstimationContextResult | null>(null);
  const lastUiPushRef = useRef(0);
  const pendingMlRef = useRef(0);
  const pendingLiveRef = useRef(false);
  const lastReceivedAtRef = useRef<number | null>(null);
  const onVolumeSampleRef = useRef(onVolumeSample);
  const [modelReady, setModelReady] = useState(false);
  const [hasLiveReading, setHasLiveReading] = useState(false);
  const [spirometerLabel, setSpirometerLabel] = useState<string | null>(null);

  onVolumeSampleRef.current = onVolumeSample;

  const sensorConnected =
    sensorStatus === 'connected' || sensorStatus === 'receiving' || mode === 'mock';

  useEffect(() => {
    if (!enabled) {
      bundleRef.current = null;
      setModelReady(false);
      setHasLiveReading(false);
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
    const live = pendingLiveRef.current;
    const now = Date.now();
    if (!force && now - lastUiPushRef.current < UI_THROTTLE_MS) return;
    lastUiPushRef.current = now;
    onVolumeSampleRef.current(ml, { live });
  }, []);

  const applyReading = useCallback(() => {
    const bundle = bundleRef.current;
    if (!bundle?.activeModel) return;

    if (lastDataReceivedAt !== null) {
      lastReceivedAtRef.current = lastDataReceivedAt;
    } else if (lastReading) {
      lastReceivedAtRef.current = Date.now();
    }

    const liveCheck = checkSensorReadingLive({
      lastReading,
      sensorConnected,
      receivedAtMs: lastReceivedAtRef.current,
      sensorStreamState: mode === 'mock' ? 'receiving_data' : sensorStreamState,
    });

    const readingIsLive = liveCheck.live;
    pendingLiveRef.current = readingIsLive;
    setHasLiveReading(readingIsLive);

    let ml = 0;
    if (readingIsLive && sensorConnected) {
      const distanceMm =
        typeof lastReading?.distanceMm === 'number' && Number.isFinite(lastReading.distanceMm)
          ? lastReading.distanceMm
          : null;

      if (distanceMm !== null) {
        const estimate = estimateVolumeForCurrentSensorReading({
          context: bundle.context,
          activeModel: bundle.activeModel,
          calibrationProfile: bundle.calibrationProfile,
          distanceMm,
          sensorConnected,
          hasUnsavedChanges: false,
        });
        ml = Math.max(0, estimate.therapyVolumeMl ?? estimate.roundedVolumeMl ?? 0);
      }
    }

    pendingMlRef.current = ml;
    flushVolume(false);
  }, [
    flushVolume,
    lastDataReceivedAt,
    lastReading,
    mode,
    sensorConnected,
    sensorStreamState,
  ]);

  useEffect(() => {
    if (!enabled || !sampling) {
      setHasLiveReading(false);
      return;
    }
    if (!modelReady) return;
    applyReading();
  }, [applyReading, enabled, modelReady, sampling]);

  useEffect(() => {
    if (!enabled || !sampling || !modelReady) return;
    const id = setInterval(applyReading, LIVE_STALE_POLL_MS);
    return () => clearInterval(id);
  }, [applyReading, enabled, modelReady, sampling]);

  useEffect(() => {
    if (!enabled || !sampling) return;
    const id = setInterval(() => flushVolume(true), UI_THROTTLE_MS);
    return () => clearInterval(id);
  }, [enabled, flushVolume, sampling]);

  return {
    modelReady,
    sensorConnected,
    hasLiveReading,
    spirometerLabel,
  };
}
