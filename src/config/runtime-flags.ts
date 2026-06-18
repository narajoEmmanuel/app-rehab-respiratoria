/**
 * Build-time feature flags for RESPIRA+ (client-safe EXPO_PUBLIC_* only).
 */

/** When false, local therapy reminders are fully disabled (default: off). */
export const RESPIRA_NOTIFICATIONS_ENABLED =
  process.env.EXPO_PUBLIC_RESPIRA_NOTIFICATIONS_ENABLED === 'true';
