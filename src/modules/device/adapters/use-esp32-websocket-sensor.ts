/**
 * Purpose: UI adapter hook for ESP32 websocket data and demo mode.
 * Module: device
 * Dependencies: React, device websocket client, device mocks
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getMockSensorReading } from '@/src/modules/device/mocks/mock-sensor-readings';
import type {
  SensorConnectionStatus,
  SensorReading,
  SensorSourceMode,
} from '@/src/modules/device/types/sensor-reading';
import { Esp32WebSocketClient } from '@/src/modules/device/websocket/esp32-websocket-client';

const DEFAULT_WS_URL = 'ws://192.168.4.1:81';
const MOCK_INTERVAL_MS = 900;

export function useEsp32WebSocketSensor() {
  const [status, setStatus] = useState<SensorConnectionStatus>('idle');
  const [mode, setMode] = useState<SensorSourceMode>('mock');
  const [lastReading, setLastReading] = useState<SensorReading | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [url, setUrl] = useState(DEFAULT_WS_URL);

  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockIndexRef = useRef(0);
  const clientRef = useRef<Esp32WebSocketClient | null>(null);

  const stopMock = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
    setStatus((prev) => (prev === 'receiving' && mode === 'mock' ? 'disconnected' : prev));
  }, [mode]);

  const disconnect = useCallback(() => {
    stopMock();
    clientRef.current?.disconnect();
    setStatus('disconnected');
  }, [stopMock]);

  const client = useMemo(
    () =>
      new Esp32WebSocketClient({
        onOpen: () => {
          setStatus('connected');
          setErrorMessage(null);
        },
        onReading: (reading) => {
          setLastReading(reading);
          setStatus('receiving');
        },
        onError: (message) => {
          setErrorMessage(message);
          setStatus('error');
        },
        onClose: () => {
          setStatus((prev) => (prev === 'error' ? prev : 'disconnected'));
        },
      }),
    []
  );

  useEffect(() => {
    clientRef.current = client;
    return () => {
      stopMock();
      client.disconnect();
      clientRef.current = null;
    };
  }, [client, stopMock]);

  const startMock = useCallback(() => {
    clientRef.current?.disconnect();
    stopMock();
    setMode('mock');
    setErrorMessage(null);
    setStatus('receiving');
    mockIndexRef.current = 0;
    setLastReading(getMockSensorReading(mockIndexRef.current));

    mockIntervalRef.current = setInterval(() => {
      mockIndexRef.current += 1;
      setLastReading(getMockSensorReading(mockIndexRef.current));
      setStatus('receiving');
    }, MOCK_INTERVAL_MS);
  }, [stopMock]);

  const connect = useCallback(() => {
    stopMock();
    setMode('websocket');
    setStatus('connecting');
    setErrorMessage(null);

    const connected = clientRef.current?.connect(url.trim());
    if (!connected) {
      setStatus('error');
      setErrorMessage('No se pudo iniciar la conexión WebSocket con el ESP32.');
    }
  }, [stopMock, url]);

  return {
    status,
    mode,
    lastReading,
    errorMessage,
    url,
    setUrl,
    connect,
    disconnect,
    startMock,
    stopMock,
  };
}
