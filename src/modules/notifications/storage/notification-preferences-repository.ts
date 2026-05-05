/**
 * Purpose: Persist notification reminder preferences per patient (AsyncStorage).
 * Module: notifications
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createDefaultNotificationPreferences,
  type NotificationPreferences,
  type ReminderFrequency,
} from '@/src/modules/notifications/types/notification-preferences';

const NOTIFICATION_PREFS_KEY_PREFIX = 'respira_notification_preferences_';
const NOTIFICATION_PREFS_FALLBACK_KEY = `${NOTIFICATION_PREFS_KEY_PREFIX}anonymous`;

const REMINDER_FREQUENCIES: ReadonlySet<ReminderFrequency> = new Set(['daily']);

function storageKeyForPatient(patientId: string): string {
  const trimmed = patientId.trim();
  if (trimmed.length > 0) {
    return `${NOTIFICATION_PREFS_KEY_PREFIX}${trimmed}`;
  }
  return NOTIFICATION_PREFS_FALLBACK_KEY;
}

function isReminderFrequency(value: unknown): value is ReminderFrequency {
  return typeof value === 'string' && REMINDER_FREQUENCIES.has(value as ReminderFrequency);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNotificationPreferences(value: unknown): value is NotificationPreferences {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.patientId === 'string' &&
    typeof o.remindersEnabled === 'boolean' &&
    typeof o.preferredReminderTime === 'string' &&
    isReminderFrequency(o.reminderFrequency) &&
    typeof o.lastUpdatedAt === 'string' &&
    isStringArray(o.scheduledNotificationIds)
  );
}

function normalizePreferences(
  patientId: string,
  raw: unknown,
): NotificationPreferences {
  const base = createDefaultNotificationPreferences(patientId);
  if (!isNotificationPreferences(raw)) {
    return base;
  }
  return {
    patientId,
    remindersEnabled: raw.remindersEnabled,
    preferredReminderTime: raw.preferredReminderTime,
    reminderFrequency: raw.reminderFrequency,
    lastUpdatedAt: raw.lastUpdatedAt,
    scheduledNotificationIds: [...raw.scheduledNotificationIds],
  };
}

export async function getNotificationPreferences(patientId: string): Promise<NotificationPreferences> {
  const stored = await AsyncStorage.getItem(storageKeyForPatient(patientId));
  if (!stored) {
    return createDefaultNotificationPreferences(patientId);
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    return normalizePreferences(patientId, parsed);
  } catch {
    return createDefaultNotificationPreferences(patientId);
  }
}

export async function saveNotificationPreferences(
  patientId: string,
  preferences: NotificationPreferences,
): Promise<void> {
  const normalized: NotificationPreferences = {
    patientId,
    remindersEnabled: preferences.remindersEnabled,
    preferredReminderTime: preferences.preferredReminderTime,
    reminderFrequency: preferences.reminderFrequency,
    lastUpdatedAt: preferences.lastUpdatedAt,
    scheduledNotificationIds: [...preferences.scheduledNotificationIds],
  };
  await AsyncStorage.setItem(storageKeyForPatient(patientId), JSON.stringify(normalized));
}

export async function updateNotificationPreferences(
  patientId: string,
  patch: Partial<Omit<NotificationPreferences, 'patientId'>>,
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(patientId);
  const next: NotificationPreferences = {
    ...current,
    ...patch,
    patientId,
    scheduledNotificationIds: patch.scheduledNotificationIds ?? current.scheduledNotificationIds,
    lastUpdatedAt: new Date().toISOString(),
  };
  await saveNotificationPreferences(patientId, next);
  return next;
}

/** Clears stored notification preferences for one patient (tests / reset). */
export async function clearNotificationPreferences(patientId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKeyForPatient(patientId));
}
