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
  onClose?: (details: {
    code: number | null;
    reason: string | null;
    intentional?: boolean;
  }) => void;
};

export class Esp32WebSocketClient {
  private ws: WebSocketLike | null = null;

  private intentionalClose = false;

  private callbacks: Esp32WebSocketCallbacks;

  constructor(callbacks: Esp32WebSocketCallbacks = {}) {
    this.callbacks = callbacks;
  }

  connect(url: string): boolean {
    if (typeof WebSocket === 'undefined') {
      this.callbacks.onError?.('WebSocket no está disponible en este entorno.');
      return false;
    }

    this.intentionalClose = false;

    const previous = this.ws;
    if (previous) {
      previous.onopen = null;
      previous.onmessage = null;
      previous.onerror = null;
      previous.onclose = null;
      try {
        previous.close();
      } catch {
        // Ignore errors cleaning up the previous socket.
      }
    }

    this.ws = null;

    try {
      const nextWs = new WebSocket(url) as unknown as WebSocketLike;
      this.ws = nextWs;

      nextWs.onopen = () => {
        if (this.ws !== nextWs) {
          return;
        }
        this.callbacks.onOpen?.();
      };

      nextWs.onmessage = (event) => {
        if (this.ws !== nextWs) {
          return;
        }
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
              String(event.data ?? ''),
            );
          }
          return;
        }
        this.callbacks.onReading?.(reading);
      };

      nextWs.onerror = () => {
        if (this.ws !== nextWs) {
          return;
        }
        this.callbacks.onError?.('No se pudo mantener la conexión WebSocket con el ESP32.');
      };

      nextWs.onclose = (event) => {
        if (this.ws !== nextWs) {
          return;
        }
        this.ws = null;
        const code = typeof event.code === 'number' ? event.code : null;
        const reason = typeof event.reason === 'string' && event.reason.length > 0 ? event.reason : null;
        this.callbacks.onClose?.({
          code,
          reason,
          intentional: this.intentionalClose,
        });
        this.intentionalClose = false;
      };

      return true;
    } catch {
      this.ws = null;
      this.callbacks.onError?.('No se pudo abrir la conexión WebSocket con el ESP32.');
      return false;
    }
  }

  disconnect(): void {
    if (!this.ws) {
      return;
    }

    this.intentionalClose = true;
    const active = this.ws;
    this.ws = null;

    try {
      active.onopen = null;
      active.onmessage = null;
      active.onerror = null;
      active.onclose = null;
      active.close();
    } catch {
      // Swallow transport shutdown errors to keep UI stable.
    }

    this.callbacks.onClose?.({
      code: 1000,
      reason: null,
      intentional: true,
    });
    this.intentionalClose = false;
  }
}
