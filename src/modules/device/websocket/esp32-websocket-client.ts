import { parseSensorMessage } from '@/src/modules/device/ingestion/parse-sensor-message';
import type { SensorReading } from '@/src/modules/device/types/sensor-reading';

type WebSocketLike = {
  close: () => void;
  readyState?: number;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data?: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: { code?: unknown; reason?: unknown }) => void) | null;
};

export type Esp32WebSocketCallbacks = {
  onOpen?: () => void;
  onReading?: (reading: SensorReading) => void;
  onRawMessage?: (rawData: string) => void;
  onParseError?: (errorMessage: string, rawData: string) => void;
  onError?: (errorMessage: string) => void;
  onClose?: (details: { code: number | null; reason: string | null }) => void;
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

    if (this.socket) {
      this.disconnect();
    }

    try {
      const nextSocket = new WebSocket(url) as unknown as WebSocketLike;
      this.socket = nextSocket;

      nextSocket.onopen = () => {
        this.callbacks.onOpen?.();
      };

      nextSocket.onmessage = (event) => {
        if (typeof event.data === 'string') {
          this.callbacks.onRawMessage?.(event.data);
        }
        const reading = parseSensorMessage(event.data);
        if (!reading) {
          if (typeof event.data === 'string') {
            this.callbacks.onParseError?.('No se pudo parsear el JSON del sensor.', event.data);
          } else {
            this.callbacks.onParseError?.(
              'El mensaje del WebSocket no es texto JSON parseable.',
              String(event.data ?? '')
            );
          }
          return;
        }
        this.callbacks.onReading?.(reading);
      };

      nextSocket.onerror = () => {
        this.callbacks.onError?.('No se pudo mantener la conexión WebSocket con el ESP32.');
      };

      nextSocket.onclose = (event) => {
        if (this.socket === nextSocket) {
          this.socket = null;
        }
        this.callbacks.onClose?.({
          code: typeof event.code === 'number' ? event.code : null,
          reason: typeof event.reason === 'string' && event.reason.length > 0 ? event.reason : null,
        });
      };

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
