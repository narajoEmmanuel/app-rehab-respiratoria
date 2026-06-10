/**
 * Purpose: Local profile UI preferences (avatar, notification placeholders).
 * Module: patient
 */

import { runtimeEnv } from '@/src/config/runtime-env';

export type ProfilePreferences = {
  avatarUri: string | null;
  notificationsEnabled: boolean;
  /** Local time HH:mm when reminders are preferred; scheduling not implemented yet. */
  preferredReminderTime: string | null;
  /**
   * Permite sesiones con entrada por pantalla cuando no hay sensor conectado.
   * Se configura solo desde Perfil; no sustituye medición con sensor real.
   */
  allowTouchPracticeInput: boolean;
};

/**
 * En web_touch la práctica táctil es el único modo de sesión disponible, por lo
 * que el toggle inicia activado para usuarios sin preferencia guardada.
 * En local_sensor (y demás modos) se conserva el default histórico: desactivado.
 */
export const DEFAULT_ALLOW_TOUCH_PRACTICE_INPUT: boolean =
  runtimeEnv.isWebTouch && runtimeEnv.enableTouchPractice;

export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  avatarUri: null,
  notificationsEnabled: false,
  preferredReminderTime: null,
  allowTouchPracticeInput: DEFAULT_ALLOW_TOUCH_PRACTICE_INPUT,
};
