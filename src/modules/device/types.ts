/**
 * Purpose: Base device integration types.
 * Module: device
 * Dependencies: none
 * Notes: Lightweight contract for future Bluetooth ingestion.
 */
export type DeviceConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export type RespiratorySample = {
  timestamp: number;
  flow: number;
};

