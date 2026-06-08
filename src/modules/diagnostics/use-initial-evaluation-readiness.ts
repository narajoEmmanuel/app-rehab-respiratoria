/**
 * Readiness para evaluación inicial: sensor (prioridad) o touch fallback.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { runtimeEnv } from '@/src/config/runtime-env';
import { isSensorRuntimeEnabled } from '@/src/config/sensor-runtime-guards';
import type { DiagnosticInputMode } from '@/src/modules/diagnostics/diagnostic-input-mode';
import { resolveDiagnosticLaunchInputMode } from '@/src/modules/diagnostics/resolve-diagnostic-launch';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { evaluateDiagnosticSensorReadinessOnDemand } from '@/src/modules/device/volume-estimation';
import { checkSensorReadingLive } from '@/src/modules/session/sensor/sensor-live-reading';

export type InitialEvaluationReadiness = {
  loading: boolean;
  /** Estado estabilizado para UI (evita parpadeo por fluctuaciones breves). */
  canStart: boolean;
  /** Estado inmediato para validación al pulsar Comenzar. */
  canStartNow: boolean;
  statusMessage: string;
  spirometerLabel: string | null;
  /** Modo efectivo cuando la URL usa sensor/auto y hay fallback táctil. */
  resolvedInputMode: DiagnosticInputMode;
};

const NOT_READY_MESSAGE = 'Conecta y calibra el espirómetro para continuar.';
const TOUCH_DISABLED_MESSAGE =
  'La evaluación táctil no está habilitada en este modo. Revisa la configuración de la app.';
const WAITING_SIGNAL_MESSAGE =
  'Esperando señal del sensor. Conecta el espirómetro para continuar.';
const POLL_MS = 1500;
const STABLE_READY_MS = 800;
const STABLE_NOT_READY_MS = 500;

type ReadinessSnapshot = {
  canStartNow: boolean;
  statusMessage: string;
  spirometerLabel: string | null;
  resolvedInputMode: DiagnosticInputMode;
  sensorReadinessCanStart: boolean;
};

export type UseInitialEvaluationReadinessOptions = {
  /** Poll sensor/calibration when true (false for URL touch/touch_practice explícito). */
  enabled: boolean;
  /** Profile + feature flag; web_touch no requiere perfil. */
  allowTouchFallback: boolean;
  effectiveTouchPracticeEnabled: boolean;
};

export function useInitialEvaluationReadiness(
  options: UseInitialEvaluationReadinessOptions,
): InitialEvaluationReadiness {
  const { enabled, allowTouchFallback, effectiveTouchPracticeEnabled } = options;

  const { lastReading, status, mode, lastDataReceivedAt, sensorStreamState } =
    useSensorConnection();

  const sensorConnected =
    status === 'connected' || status === 'receiving' || mode === 'mock';

  const lastReadingRef = useRef(lastReading);
  const lastDataReceivedAtRef = useRef(lastDataReceivedAt);
  const sensorStreamStateRef = useRef(sensorStreamState);
  const modeRef = useRef(mode);
  const sensorConnectedRef = useRef(sensorConnected);

  lastReadingRef.current = lastReading;
  lastDataReceivedAtRef.current = lastDataReceivedAt;
  sensorStreamStateRef.current = sensorStreamState;
  modeRef.current = mode;
  sensorConnectedRef.current = sensorConnected;

  const [loading, setLoading] = useState(enabled && isSensorRuntimeEnabled());
  const [canStartNow, setCanStartNow] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [statusMessage, setStatusMessage] = useState(NOT_READY_MESSAGE);
  const [spirometerLabel, setSpirometerLabel] = useState<string | null>(null);
  const [resolvedInputMode, setResolvedInputMode] = useState<DiagnosticInputMode>('sensor');

  const stableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const applyStableCanStart = useCallback((nextCanStart: boolean) => {
    if (stableTimerRef.current) {
      clearTimeout(stableTimerRef.current);
      stableTimerRef.current = null;
    }

    const delay = nextCanStart ? STABLE_READY_MS : STABLE_NOT_READY_MS;
    stableTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setCanStart(nextCanStart);
    }, delay);
  }, []);

  const applySnapshot = useCallback(
    (snapshot: ReadinessSnapshot, options?: { initialLoad?: boolean }) => {
      setCanStartNow(snapshot.canStartNow);
      setStatusMessage(snapshot.statusMessage);
      setSpirometerLabel(snapshot.spirometerLabel);
      setResolvedInputMode(snapshot.resolvedInputMode);
      if (options?.initialLoad) {
        setCanStart(snapshot.canStartNow);
        setLoading(false);
        return;
      }
      applyStableCanStart(snapshot.canStartNow);
    },
    [applyStableCanStart],
  );

  const evaluateSnapshot = useCallback(async (): Promise<ReadinessSnapshot> => {
    const sensorRuntimeEnabled = isSensorRuntimeEnabled();
    let sensorReadinessCanStart = false;
    let nextStatusMessage = NOT_READY_MESSAGE;
    let nextSpirometerLabel: string | null = null;

    if (sensorRuntimeEnabled && enabled) {
      const connected = sensorConnectedRef.current;
      const gate = await evaluateDiagnosticSensorReadinessOnDemand({
        sensorConnected: connected,
      });
      const liveCheck = checkSensorReadingLive({
        lastReading: lastReadingRef.current,
        sensorConnected: connected,
        receivedAtMs: lastDataReceivedAtRef.current,
        sensorStreamState:
          modeRef.current === 'mock' ? 'receiving_data' : sensorStreamStateRef.current,
      });

      const calibrationOk = gate.canStartDiagnostic;
      const signalLive = liveCheck.live;
      sensorReadinessCanStart = calibrationOk && signalLive;

      if (!calibrationOk) {
        nextStatusMessage = NOT_READY_MESSAGE;
      } else if (!signalLive) {
        nextStatusMessage = WAITING_SIGNAL_MESSAGE;
      } else {
        nextStatusMessage = '';
      }
      nextSpirometerLabel = gate.context.spirometerLabel;
    }

    const launchMode = resolveDiagnosticLaunchInputMode({
      sensorReadinessCanStart,
      effectiveTouchPracticeEnabled,
    });

    const touchReady =
      allowTouchFallback &&
      launchMode !== 'sensor' &&
      (launchMode === 'touch' || effectiveTouchPracticeEnabled || !sensorRuntimeEnabled);

    const readyNow =
      launchMode === 'sensor'
        ? sensorReadinessCanStart
        : touchReady;

    if (!readyNow && !sensorRuntimeEnabled && !allowTouchFallback) {
      nextStatusMessage = TOUCH_DISABLED_MESSAGE;
    } else if (!readyNow && launchMode === 'sensor' && !sensorReadinessCanStart) {
      // keep sensor-specific message from above
    } else if (readyNow && launchMode !== 'sensor') {
      nextStatusMessage = '';
      nextSpirometerLabel = null;
    }

    return {
      canStartNow: readyNow,
      statusMessage: nextStatusMessage,
      spirometerLabel: nextSpirometerLabel,
      resolvedInputMode: readyNow ? launchMode : 'sensor',
      sensorReadinessCanStart,
    };
  }, [allowTouchFallback, effectiveTouchPracticeEnabled, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled && allowTouchFallback) {
      const launchMode = resolveDiagnosticLaunchInputMode({
        sensorReadinessCanStart: false,
        effectiveTouchPracticeEnabled,
      });
      const touchReady =
        launchMode !== 'sensor' &&
        (launchMode === 'touch' || effectiveTouchPracticeEnabled || !isSensorRuntimeEnabled());
      setLoading(false);
      setCanStart(touchReady);
      setCanStartNow(touchReady);
      setStatusMessage('');
      setSpirometerLabel(null);
      setResolvedInputMode(touchReady ? launchMode : 'sensor');
      return;
    }

    if (!enabled) {
      setLoading(false);
      return;
    }

    if (!isSensorRuntimeEnabled() && !allowTouchFallback) {
      setLoading(false);
      setCanStart(false);
      setCanStartNow(false);
      setStatusMessage(
        runtimeEnv.isWebTouch ? TOUCH_DISABLED_MESSAGE : NOT_READY_MESSAGE,
      );
      setSpirometerLabel(null);
      setResolvedInputMode('sensor');
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const snapshot = await evaluateSnapshot();
      if (cancelled || !mountedRef.current) return;
      applySnapshot(snapshot, { initialLoad: true });
    })();

    const id = setInterval(() => {
      void (async () => {
        const snapshot = await evaluateSnapshot();
        if (cancelled || !mountedRef.current) return;
        applySnapshot(snapshot);
      })();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [
    allowTouchFallback,
    applySnapshot,
    effectiveTouchPracticeEnabled,
    enabled,
    evaluateSnapshot,
  ]);

  return {
    loading,
    canStart,
    canStartNow,
    statusMessage,
    spirometerLabel,
    resolvedInputMode,
  };
}
