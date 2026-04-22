/**
 * Purpose: Mock sample stream for local development.
 * Module: device
 * Dependencies: device/types
 * Notes: Used while hardware integration is unavailable.
 */
import type { RespiratorySample } from '@/src/modules/device/types';

export const mockRespiratorySamples: RespiratorySample[] = [
  { timestamp: 0, flow: 0.1 },
  { timestamp: 1, flow: 0.2 },
  { timestamp: 2, flow: 0.15 },
];

