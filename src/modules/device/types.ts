/**
 * Purpose: Base device integration types.
 * Module: device
 * Dependencies: none
 * Notes: Lightweight contract for future WebSocket ingestion from the ESP32.
 */
export type DeviceConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export type RespiratorySample = {
  timestamp: number;
  flow: number;
};

