import { useCallback, useEffect, useRef, useState } from 'react';

import { getMockSensorReading } from '@/src/modules/device/mocks/mock-sensor-readings';
import { SENSOR_STREAM_DATA_TIMEOUT_MS } from '@/src/modules/device/stream/sensor-stream-state';
import type {
  SensorConnectionStatus,
  SensorReading,
  SensorSourceMode,
  SensorStreamState,
} from '@/src/modules/device/types/sensor-reading';
import { Esp32WebSocketClient } from '@/src/modules/device/websocket/esp32-websocket-client';

const DEFAULT_WS_URL = 'ws://192.168.4.1:81';
const MOCK_INTERVAL_MS = 900;
const MPS_WINDOW_MS = 5000;
const STREAM_STATE_TICK_MS = 400;
/** Si el handshake WebSocket no avanza en este tiempo, marcamos timeout y soltamos el socket. */
const CONNECTING_TIMEOUT_MS = 9000;

export function useEsp32WebSocketSensor() {
  const [status, setStatus] = useState<SensorConnectionStatus>('idle');
  const [mode, setMode] = useState<SensorSourceMode>('mock');
  const [lastReading, setLastReading] = useState<SensorReading | null>(null);
  const [lastRawMessage, setLastRawMessage] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [messagesPerSecond, setMessagesPerSecond] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [closeCode, setCloseCode] = useState<number | null>(null);
  const [closeReason, setCloseReason] = useState<string | null>(null);
  const [url, setUrl] = useState(DEFAULT_WS_URL);
  const [sensorStreamState, setSensorStreamState] = useState<SensorStreamState>('idle');
  const [lastDataReceivedAt, setLastDataReceivedAt] = useState<number | null>(null);

  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockIndexRef = useRef(0);
  const clientRef = useRef<Esp32WebSocketClient | null>(null);
  const messageTimestampsRef = useRef<number[]>([]);
  const statusRef = useRef<SensorConnectionStatus>('idle');
  const modeRef = useRef<SensorSourceMode>('mock');
  const lastDataReceivedAtRef = useRef<number | null>(null);
  const hasReceivedDataRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    lastDataReceivedAtRef.current = lastDataReceivedAt;
  }, [lastDataReceivedAt]);

  const markDataReceived = useCallback(() => {
    const now = Date.now();
    hasReceivedDataRef.current = true;
    lastDataReceivedAtRef.current = now;
    setLastDataReceivedAt(now);
    setSensorStreamState('receiving_data');
  }, []);

  const resetStreamState = useCallback(() => {
    hasReceivedDataRef.current = false;
    lastDataReceivedAtRef.current = null;
    setLastDataReceivedAt(null);
    setSensorStreamState('idle');
  }, []);

  const resetMessageMetrics = useCallback(() => {
    messageTimestampsRef.current = [];
    setMessageCount(0);
    setMessagesPerSecond(0);
    setLastRawMessage(null);
  }, []);

  const recordIncomingMessage = useCallback((rawData: string | null) => {
    const now = Date.now();
    const buffer = messageTimestampsRef.current;
    buffer.push(now);
    while (buffer.length > 0 && now - buffer[0] > MPS_WINDOW_MS) {
      buffer.shift();
    }
    setMessageCount((prev) => prev + 1);
    const windowSeconds = MPS_WINDOW_MS / 1000;
    setMessagesPerSecond(Number((buffer.length / windowSeconds).toFixed(1)));
    if (rawData !== null) {
      setLastRawMessage(rawData);
    }
  }, []);

  const stopMock = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    stopMock();
    clientRef.current?.disconnect();
    setCloseCode(1000);
    setCloseReason('manual disconnect');
    setStatus('disconnected');
    resetStreamState();
  }, [resetStreamState, stopMock]);

  /**
   * Limpia el socket actual (incluso si quedó atorado en CONNECTING tras un cambio de red),
   * borra error/closeCode/closeReason y vuelve a 'idle' para permitir reintentar.
   * No hace reconexión automática.
   */
  const resetConnection = useCallback(() => {
    stopMock();
    clientRef.current?.disconnect();
    resetMessageMetrics();
    setLastReading(null);
    setErrorMessage(null);
    setCloseCode(null);
    setCloseReason(null);
    setStatus('idle');
    resetStreamState();
  }, [resetMessageMetrics, resetStreamState, stopMock]);

  useEffect(() => {
    if (status !== 'connecting') return;
    const timer = setTimeout(() => {
      if (statusRef.current !== 'connecting') return;
      clientRef.current?.disconnect();
      setErrorMessage(
        `Timeout esperando respuesta del WebSocket (${Math.round(CONNECTING_TIMEOUT_MS / 1000)} s). Limpia la conexión y reintenta.`,
      );
      setStatus('error');
    }, CONNECTING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (mode !== 'websocket') return;

    const tick = setInterval(() => {
      const currentStatus = statusRef.current;
      if (currentStatus !== 'connected' && currentStatus !== 'receiving') {
        return;
      }

      const lastAt = lastDataReceivedAtRef.current;
      const now = Date.now();

      if (lastAt === null) {
        setSensorStreamState('connected_waiting_stream');
        return;
      }

      if (now - lastAt > SENSOR_STREAM_DATA_TIMEOUT_MS) {
        setSensorStreamState('stream_paused');
      } else {
        setSensorStreamState('receiving_data');
      }
    }, STREAM_STATE_TICK_MS);

    return () => clearInterval(tick);
  }, [mode]);

  useEffect(() => {
    clientRef.current = new Esp32WebSocketClient({
      onOpen: () => {
        setStatus('connected');
        setErrorMessage(null);
        if (modeRef.current === 'websocket') {
          hasReceivedDataRef.current = false;
          lastDataReceivedAtRef.current = null;
          setLastDataReceivedAt(null);
          setSensorStreamState('connected_waiting_stream');
        }
      },
      onRawMessage: (rawData) => {
        recordIncomingMessage(rawData);
      },
      onParseError: (message) => {
        // No tumbamos toda la conexión por un frame inválido.
        setErrorMessage(message);
      },
      onReading: (reading) => {
        setLastReading(reading);
        setStatus('receiving');
        setErrorMessage(null);
        if (modeRef.current === 'websocket') {
          markDataReceived();
        }
      },
      onError: (message) => {
        setErrorMessage(message);
        setStatus('error');
      },
      onClose: ({ code, reason }) => {
        setCloseCode(code);
        setCloseReason(reason);
        setStatus((prev) => (prev === 'error' ? prev : 'disconnected'));
        resetStreamState();
      },
    });
    return () => {
      stopMock();
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [markDataReceived, recordIncomingMessage, resetStreamState, stopMock]);

  const startMock = useCallback(() => {
    clientRef.current?.disconnect();
    stopMock();
    resetMessageMetrics();
    setMode('mock');
    setErrorMessage(null);
    setCloseCode(null);
    setCloseReason(null);
    setStatus('connected');
    setSensorStreamState('receiving_data');
    mockIndexRef.current = 0;
    const first = getMockSensorReading(mockIndexRef.current);
    setLastReading(first);
    markDataReceived();

    mockIntervalRef.current = setInterval(() => {
      mockIndexRef.current += 1;
      setLastReading(getMockSensorReading(mockIndexRef.current));
      setStatus('connected');
      markDataReceived();
    }, MOCK_INTERVAL_MS);
  }, [markDataReceived, resetMessageMetrics, stopMock]);

  const connect = useCallback(() => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setStatus('error');
      setErrorMessage('La URL WebSocket no puede estar vacía.');
      return;
    }

    const existingClient = clientRef.current;
    if (!existingClient) {
      setStatus('error');
      setErrorMessage('El cliente WebSocket no está disponible.');
      return;
    }

    stopMock();
    resetMessageMetrics();
    resetStreamState();
    setMode('websocket');
    setStatus('connecting');
    setErrorMessage(null);
    setCloseCode(null);
    setCloseReason(null);

    const connected = existingClient.connect(trimmedUrl);
    if (!connected) {
      setStatus('error');
      setErrorMessage('No se pudo iniciar la conexión WebSocket con el ESP32.');
    }
  }, [resetMessageMetrics, resetStreamState, stopMock, url]);

  return {
    status,
    mode,
    sensorStreamState,
    lastDataReceivedAt,
    lastReading,
    lastRawMessage,
    messageCount,
    messagesPerSecond,
    errorMessage,
    closeCode,
    closeReason,
    url,
    setUrl,
    connect,
    disconnect,
    resetConnection,
    startMock,
    stopMock,
  };
}
