/**
 * Purpose: Minimal ESP32 websocket transport with callback events.
 * Module: device
 * Dependencies: device/ingestion/parse-sensor-message
 */
import { parseSensorMessage } from '@/src/modules/device/ingestion/parse-sensor-message';
import type { SensorReading } from '@/src/modules/device/types/sensor-reading';

type WebSocketLike = {
  close: () => void;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data?: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
};

export type Esp32WebSocketCallbacks = {
  onOpen?: () => void;
  onReading?: (reading: SensorReading) => void;
  onError?: (errorMessage: string) => void;
  onClose?: () => void;
};

export class Esp32WebSocketClient {
  private socket: WebSocketLike | null = null;

  private callbacks: Esp32WebSocketCallbacks;

  constructor(callbacks: Esp32WebSocketCallbacks = {}) {
    this.callbacks = callbacks;
  }

  connect(url: string): boolean {
    if (typeof WebSocket === 'undefined') {
      this.callbacks.onError?.('WebSocket no está disponible en este entorno.');
      return false;
    }

    this.disconnect();

    try {
      const nextSocket = new WebSocket(url) as unknown as WebSocketLike;
      this.socket = nextSocket;

      nextSocket.onopen = () => {
        this.callbacks.onOpen?.();
      };

      nextSocket.onmessage = (event) => {
        const reading = parseSensorMessage(event.data);
        if (!reading) {
          return;
        }
        this.callbacks.onReading?.(reading);
      };

      nextSocket.onerror = () => {
        this.callbacks.onError?.('No se pudo mantener la conexión WebSocket con el ESP32.');
      };

      nextSocket.onclose = () => {
        this.callbacks.onClose?.();
      };

      // TODO (phase 3): add reconnect/backoff strategy when transport is stable.
      return true;
    } catch {
      this.callbacks.onError?.('No se pudo abrir la conexión WebSocket con el ESP32.');
      return false;
    }
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    try {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket.close();
    } catch {
      // Swallow transport shutdown errors to keep UI stable.
    } finally {
      this.socket = null;
    }
  }
}
