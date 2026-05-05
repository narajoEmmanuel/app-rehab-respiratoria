/**
 * Purpose: Local profile UI preferences (avatar, notification placeholders).
 * Module: patient
 */

export type ProfilePreferences = {
  avatarUri: string | null;
  notificationsEnabled: boolean;
  /** Local time HH:mm when reminders are preferred; scheduling not implemented yet. */
  preferredReminderTime: string | null;
};

export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  avatarUri: null,
  notificationsEnabled: false,
  preferredReminderTime: null,
};
