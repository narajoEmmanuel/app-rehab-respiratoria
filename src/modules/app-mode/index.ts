/**
 * Purpose: Barrel exports for global app mode (online / offline sensor test).
 * Module: app-mode
 */

export type { AppMode } from '@/src/modules/app-mode/app-mode-types';
export {
  isCloudAuthEnabled,
  isHardwareLabAccessible,
  isOfflineSensorTestEnabled,
} from '@/src/modules/app-mode/app-mode-config';
export { AppModeProvider, useAppMode } from '@/src/modules/app-mode/app-mode-context';
export type { AppModeContextValue } from '@/src/modules/app-mode/app-mode-context';
