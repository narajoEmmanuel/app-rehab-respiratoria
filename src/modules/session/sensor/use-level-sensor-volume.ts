/**
 * Volumen en vivo para Nivel 1: lecturas en refs + UI throttled (sin re-render por frame).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ActiveVolumeEstimateResult } from '@/src/modules/device/calibration/active-volume-estimation-types';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import {
  estimateVolumeForCurrentSensorReading,
  loadActiveVolumeEstimationContext,
  type LoadActiveVolumeEstimationContextResult,
} from '@/src/modules/device/volume-estimation/volume-estimation-service';
import type { VolumeEstimationReadinessStatus } from '@/src/modules/device/volume-estimation/volume-estimation-types';
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';
import {
  logLevelSensorSessionStart,
  logLevelSensorSubscribe,
  logLevelSensorUnsubscribe,
} from '@/src/modules/session/sensor/level-sensor-debug';
import { resolveTherapyVolumeEstimateStatus } from '@/src/modules/session/sensor/level-sensor-volume-status';
import { checkSensorReadingLive } from '@/src/modules/session/sensor/sensor-live-reading';

const DISPLAY_THROTTLE_MS = 120;
/** Re-evalúa lectura obsoleta aunque lastReading no cambie. */
const LIVE_STALE_POLL_MS = 400;

const EMPTY_ESTIMATE: ActiveVolumeEstimateResult = {
  estimatedVolumeMl: null,
  roundedVolumeMl: null,
  u95Ml: null,
  lowerBoundMl: null,
  upperBoundMl: null,
  distanceMm: null,
  modelKind: null,
  spirometerDeviceId: null,
  spirometerProfileId: null,
  inCalibratedRange: false,
  clamped: false,
  status: 'sensor_disconnected',
  warning: null,
  usedSegment: null,
};

export type LevelSensorVolumeSnapshot = {
  estimatedVolumeMl: number;
  distanceMm: number | null;
  estimate: ActiveVolumeEstimateResult;
  hasLiveReading: boolean;
  sensorConnected: boolean;
  modelReady: boolean;
};

export type UseLevelSensorVolumeOptions = {
  enabled: boolean;
  levelId: string;
  inputMode: SessionInputMode;
  sessionRunId?: string;
  calibrationId?: string | null;
};

export type UseLevelSensorVolumeResult = {
  modelReady: boolean;
  sensorConnected: boolean;
  hasLiveReading: boolean;
  sensorStatus: string;
  /** Solo para chip de volumen en HUD (throttled). */
  displayVolumeMl: number;
  displayU95Ml: number | null;
  volumeEstimateStatus: VolumeEstimationReadinessStatus;
  calibrationId: string | null;
  getSnapshot: () => LevelSensorVolumeSnapshot;
};

export function useLevelSensorVolume(
  options: UseLevelSensorVolumeOptions,
): UseLevelSensorVolumeResult {
  const { enabled, levelId, inputMode, sessionRunId, calibrationId: calibrationIdProp } = options;
  const {
    lastReading,
    status: sensorStatus,
    mode,
    lastDataReceivedAt,
    sensorStreamState,
  } = useSensorConnection();

  const bundleRef = useRef<LoadActiveVolumeEstimationContextResult | null>(null);
  const snapshotRef = useRef<LevelSensorVolumeSnapshot>({
    estimatedVolumeMl: 0,
    distanceMm: null,
    estimate: EMPTY_ESTIMATE,
    hasLiveReading: false,
    sensorConnected: false,
    modelReady: false,
  });
  const lastReceivedAtRef = useRef<number | null>(null);
  const displayPendingRef = useRef(0);
  const displayFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribeLoggedRef = useRef(false);
  const sessionStartLoggedRef = useRef(false);

  const [modelReady, setModelReady] = useState(false);
  const [calibrationId, setCalibrationId] = useState<string | null>(null);
  const [displayVolumeMl, setDisplayVolumeMl] = useState(0);
  const [displayU95Ml, setDisplayU95Ml] = useState<number | null>(null);
  const [hasLiveReading, setHasLiveReading] = useState(false);
  const [volumeEstimateStatus, setVolumeEstimateStatus] =
    useState<VolumeEstimationReadinessStatus>('loading');

  const sensorConnected =
    sensorStatus === 'connected' || sensorStatus === 'receiving' || mode === 'mock';

  const scheduleDisplayFlush = useCallback(() => {
    if (displayFlushTimerRef.current) return;
    displayFlushTimerRef.current = setTimeout(() => {
      displayFlushTimerRef.current = null;
      const ml = displayPendingRef.current;
      setDisplayVolumeMl(ml);
      setDisplayU95Ml(snapshotRef.current.estimate.u95Ml);
      setHasLiveReading(snapshotRef.current.hasLiveReading);
    }, DISPLAY_THROTTLE_MS);
  }, []);

  const getSnapshot = useCallback(() => snapshotRef.current, []);

  const applyReading = useCallback(() => {
    const bundle = bundleRef.current;
    const distanceMm =
      typeof lastReading?.distanceMm === 'number' && Number.isFinite(lastReading.distanceMm)
        ? lastReading.distanceMm
        : null;

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
    const modelActive = bundle?.activeModel != null;

    let estimate = EMPTY_ESTIMATE;
    if (readingIsLive && modelActive && sensorConnected && distanceMm !== null) {
      estimate = estimateVolumeForCurrentSensorReading({
        context: bundle.context,
        activeModel: bundle.activeModel,
        calibrationProfile: bundle.calibrationProfile,
        distanceMm,
        sensorConnected,
        hasUnsavedChanges: false,
      });
    }

    const readinessStatus = resolveTherapyVolumeEstimateStatus({
      modelReady: modelActive,
      sensorConnected,
      liveCheck,
      estimateStatus: readingIsLive ? estimate.status : undefined,
    });

    const ml = readingIsLive ? Math.max(0, estimate.roundedVolumeMl ?? 0) : 0;

    snapshotRef.current = {
      estimatedVolumeMl: ml,
      distanceMm: readingIsLive ? distanceMm : null,
      estimate: readingIsLive ? estimate : EMPTY_ESTIMATE,
      hasLiveReading: readingIsLive,
      sensorConnected,
      modelReady: modelActive,
    };

    displayPendingRef.current = ml;
    setVolumeEstimateStatus(readinessStatus);
    scheduleDisplayFlush();
  }, [
    lastDataReceivedAt,
    lastReading,
    mode,
    scheduleDisplayFlush,
    sensorConnected,
    sensorStreamState,
  ]);

  useEffect(() => {
    if (!enabled) {
      if (subscribeLoggedRef.current) {
        logLevelSensorUnsubscribe();
        subscribeLoggedRef.current = false;
      }
      bundleRef.current = null;
      setModelReady(false);
      setCalibrationId(null);
      setHasLiveReading(false);
      sessionStartLoggedRef.current = false;
      if (displayFlushTimerRef.current) {
        clearTimeout(displayFlushTimerRef.current);
        displayFlushTimerRef.current = null;
      }
      return;
    }

    if (!subscribeLoggedRef.current) {
      subscribeLoggedRef.current = true;
      logLevelSensorSubscribe();
    }

    let cancelled = false;
    void loadActiveVolumeEstimationContext().then((loaded) => {
      if (cancelled) return;
      bundleRef.current = loaded;
      const ready = loaded.activeModel != null;
      setModelReady(ready);
      setCalibrationId(loaded.context.activeModelId ?? null);
      if (!ready) {
        setVolumeEstimateStatus('no_active_model');
      }
    });

    return () => {
      cancelled = true;
      if (subscribeLoggedRef.current) {
        logLevelSensorUnsubscribe();
        subscribeLoggedRef.current = false;
      }
      if (displayFlushTimerRef.current) {
        clearTimeout(displayFlushTimerRef.current);
        displayFlushTimerRef.current = null;
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !modelReady || sessionStartLoggedRef.current) return;
    sessionStartLoggedRef.current = true;
    logLevelSensorSessionStart({
      sessionRunId: sessionRunId ?? null,
      inputMode,
      calibrationId: calibrationIdProp ?? calibrationId ?? bundleRef.current?.context.activeModelId ?? null,
      levelId,
    });
  }, [
    calibrationId,
    calibrationIdProp,
    enabled,
    inputMode,
    levelId,
    modelReady,
    sessionRunId,
  ]);

  useEffect(() => {
    if (!enabled || !modelReady) return;
    applyReading();
  }, [applyReading, enabled, modelReady]);

  useEffect(() => {
    if (!enabled || !modelReady) return;
    const id = setInterval(applyReading, LIVE_STALE_POLL_MS);
    return () => clearInterval(id);
  }, [applyReading, enabled, modelReady]);

  return {
    modelReady,
    sensorConnected,
    hasLiveReading,
    sensorStatus,
    displayVolumeMl,
    displayU95Ml,
    volumeEstimateStatus,
    calibrationId,
    getSnapshot,
  };
}
