/**
 * Readiness para evaluación inicial: calibración + sensor + señal viva.
 */
import { useCallback, useEffect, useState } from 'react';

import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { evaluateDiagnosticSensorReadinessOnDemand } from '@/src/modules/device/volume-estimation';
import { checkSensorReadingLive } from '@/src/modules/session/sensor/sensor-live-reading';

export type InitialEvaluationReadiness = {
  loading: boolean;
  canStart: boolean;
  statusMessage: string;
  spirometerLabel: string | null;
};

const NOT_READY_MESSAGE = 'Conecta el sensor para realizar la evaluación inicial.';
const WAITING_SIGNAL_MESSAGE =
  'Esperando señal del sensor. Conecta tu espirómetro para continuar.';

export function useInitialEvaluationReadiness(enabled: boolean): InitialEvaluationReadiness {
  const { lastReading, status, mode, lastDataReceivedAt, sensorStreamState } =
    useSensorConnection();

  const sensorConnected =
    status === 'connected' || status === 'receiving' || mode === 'mock';

  const [state, setState] = useState<InitialEvaluationReadiness>({
    loading: enabled,
    canStart: false,
    statusMessage: NOT_READY_MESSAGE,
    spirometerLabel: null,
  });

  const refresh = useCallback(async () => {
    if (!enabled) {
      setState({
        loading: false,
        canStart: false,
        statusMessage: NOT_READY_MESSAGE,
        spirometerLabel: null,
      });
      return;
    }

    const gate = await evaluateDiagnosticSensorReadinessOnDemand({ sensorConnected });
    const liveCheck = checkSensorReadingLive({
      lastReading,
      sensorConnected,
      receivedAtMs: lastDataReceivedAt,
      sensorStreamState: mode === 'mock' ? 'receiving_data' : sensorStreamState,
    });

    const calibrationOk = gate.canStartDiagnostic;
    const signalLive = liveCheck.live;
    const canStart = calibrationOk && signalLive;

    let statusMessage = '';
    if (!calibrationOk) {
      statusMessage = NOT_READY_MESSAGE;
    } else if (!signalLive) {
      statusMessage = WAITING_SIGNAL_MESSAGE;
    }

    setState({
      loading: false,
      canStart,
      statusMessage,
      spirometerLabel: gate.context.spirometerLabel,
    });
  }, [
    enabled,
    lastDataReceivedAt,
    lastReading,
    mode,
    sensorConnected,
    sensorStreamState,
  ]);

  useEffect(() => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, 1500);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  return state;
}
