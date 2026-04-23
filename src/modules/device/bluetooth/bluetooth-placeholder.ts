/**
 * Purpose: Placeholder entry for Bluetooth transport.
 * Module: device
 * Dependencies: device/types
 * Notes: Keeps UI decoupled while Bluetooth integration is pending.
 */
import type { DeviceConnectionStatus } from '@/src/modules/device/types';

export const bluetoothPlaceholder = {
  status: 'disconnected' as DeviceConnectionStatus,
};

