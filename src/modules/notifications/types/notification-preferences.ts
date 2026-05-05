/**
 * Purpose: Persisted local notification preferences per patient (therapy reminders).
 * Module: notifications
 */

export type ReminderFrequency = 'daily';

export type NotificationPreferences = {
  patientId: string;
  remindersEnabled: boolean;
  /** Local time in 24h format, e.g. "09:00". */
  preferredReminderTime: string;
  reminderFrequency: ReminderFrequency;
  lastUpdatedAt: string;
  scheduledNotificationIds: string[];
};

export const REMINDER_TIME_OPTIONS: readonly string[] = ['08:00', '09:00', '10:00', '18:00', '20:00'];

export function createDefaultNotificationPreferences(patientId: string): NotificationPreferences {
  return {
    patientId,
    remindersEnabled: false,
    preferredReminderTime: '09:00',
    reminderFrequency: 'daily',
    lastUpdatedAt: new Date().toISOString(),
    scheduledNotificationIds: [],
  };
}
