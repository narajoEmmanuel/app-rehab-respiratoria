/**
 * Purpose: Adapter placeholder between raw device payload and app model.
 * Module: device
 * Dependencies: device/types
 * Notes: Enables swapping ESP32 protocol without touching UI modules.
 */
import type { RespiratorySample } from '@/src/modules/device/types';

export function adaptRawDevicePayload(): RespiratorySample {
  return { timestamp: Date.now(), flow: 0 };
}

