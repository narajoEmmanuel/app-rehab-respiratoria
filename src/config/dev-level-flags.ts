/**
 * TEMP DEV FLAGS — development only.
 * Set DEV_UNLOCK_ALL_LEVELS to false before production / final demo.
 *
 * Does NOT alter patient_levels, AsyncStorage progress, Supabase, or unlock rules.
 * Only bypasses UI lock on Terapia/Niveles so runner levels can be opened for QA.
 */

/** When true, levels blocked by progression still appear playable on the levels screen. */
export const DEV_UNLOCK_ALL_LEVELS = false;

/**
 * UI-only: whether the level card should behave as locked (no play picker).
 * `comingSoon` levels (e.g. Nivel 5) stay locked regardless of this flag.
 */
export function isLevelEntryLockedForUi(progressionLocked: boolean, comingSoon?: boolean): boolean {
  if (comingSoon) return true;
  if (DEV_UNLOCK_ALL_LEVELS) return false;
  return progressionLocked;
}
