/**
 * Readiness para evaluación inicial: calibración + sensor + señal viva.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

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
};

const NOT_READY_MESSAGE = 'Conecta y calibra el espirómetro para continuar.';
const WAITING_SIGNAL_MESSAGE =
  'Esperando señal del sensor. Conecta el espirómetro para continuar.';
const POLL_MS = 1500;
const STABLE_READY_MS = 800;
const STABLE_NOT_READY_MS = 500;

type ReadinessSnapshot = Omit<InitialEvaluationReadiness, 'canStart' | 'canStartNow' | 'loading'> & {
  canStartNow: boolean;
};

export function useInitialEvaluationReadiness(enabled: boolean): InitialEvaluationReadiness {
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

  const [loading, setLoading] = useState(enabled);
  const [canStartNow, setCanStartNow] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [statusMessage, setStatusMessage] = useState(NOT_READY_MESSAGE);
  const [spirometerLabel, setSpirometerLabel] = useState<string | null>(null);

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
    const connected = sensorConnectedRef.current;
    if (!enabled) {
      return {
        canStartNow: false,
        statusMessage: NOT_READY_MESSAGE,
        spirometerLabel: null,
      };
    }

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
    const readyNow = calibrationOk && signalLive;

    let nextStatusMessage = '';
    if (!calibrationOk) {
      nextStatusMessage = NOT_READY_MESSAGE;
    } else if (!signalLive) {
      nextStatusMessage = WAITING_SIGNAL_MESSAGE;
    }

    return {
      canStartNow: readyNow,
      statusMessage: nextStatusMessage,
      spirometerLabel: gate.context.spirometerLabel,
    };
  }, [enabled]);

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
    if (!enabled) {
      setLoading(false);
      setCanStart(false);
      setCanStartNow(false);
      setStatusMessage(NOT_READY_MESSAGE);
      setSpirometerLabel(null);
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
  }, [applySnapshot, enabled, evaluateSnapshot]);

  return {
    loading,
    canStart,
    canStartNow,
    statusMessage,
    spirometerLabel,
  };
}
