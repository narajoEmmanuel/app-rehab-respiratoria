/**
 * Review / QA flags — UI-only progression override.
 *
 * Does NOT alter patient_levels, AsyncStorage progress, Supabase, or unlock rules.
 * Only bypasses UI lock on Terapia/Niveles so levels can be opened for review or demos.
 */

/** When true, levels blocked by progression still appear playable on the levels screen. */
export const REVIEW_UNLOCK_ALL_LEVELS =
  process.env.EXPO_PUBLIC_UNLOCK_ALL_LEVELS_FOR_REVIEW === 'true';

/** @deprecated Use REVIEW_UNLOCK_ALL_LEVELS */
export const DEV_UNLOCK_ALL_LEVELS = REVIEW_UNLOCK_ALL_LEVELS;

/**
 * UI-only: whether the level card should behave as locked (no play picker).
 * Without the review override, `comingSoon` levels stay locked.
 */
export function isLevelEntryLockedForUi(progressionLocked: boolean, comingSoon?: boolean): boolean {
  if (REVIEW_UNLOCK_ALL_LEVELS) return false;
  if (comingSoon) return true;
  return progressionLocked;
}
