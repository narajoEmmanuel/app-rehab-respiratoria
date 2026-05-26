/**
 * TEMP DEV FLAGS — development only.
 *
 * Does NOT alter patient_levels, AsyncStorage progress, Supabase, or unlock rules.
 * Only bypasses UI lock on Terapia/Niveles so runner levels can be opened for QA.
 */

/** When true, levels blocked by progression still appear playable on the levels screen. */
export const DEV_UNLOCK_ALL_LEVELS =
  __DEV__ && process.env.EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW === 'true';

/**
 * UI-only: whether the level card should behave as locked (no play picker).
 * Without the review override, `comingSoon` levels stay locked.
 */
export function isLevelEntryLockedForUi(progressionLocked: boolean, comingSoon?: boolean): boolean {
  if (DEV_UNLOCK_ALL_LEVELS) return false;
  if (comingSoon) return true;
  return progressionLocked;
}
