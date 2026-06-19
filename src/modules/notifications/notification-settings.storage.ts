/**
 * Purpose: Persist notification settings per patient (AsyncStorage).
 * Module: notifications
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { RESPIRA_NOTIFICATIONS_ENABLED } from '@/src/config/runtime-flags';
import {
  readNotificationPermissionStatus,
  supportsNativeLocalNotifications,
} from '@/src/modules/notifications/notification-permissions';
import {
  applyNotificationDefaults,
  createDefaultNotificationSettings,
  normalizePauseUntil,
  resolveIntervalHoursFromRaw,
  type NotificationPermissionStatus,
  type NotificationSettings,
  type NotificationTone,
} from '@/src/modules/notifications/notification-settings.types';

const SETTINGS_KEY_PREFIX = 'respira_notification_settings_';
const SETTINGS_FALLBACK_KEY = `${SETTINGS_KEY_PREFIX}anonymous`;

const LEGACY_PREFS_KEY_PREFIX = 'respira_notification_preferences_';

const TONES: ReadonlySet<NotificationTone> = new Set(['suave', 'motivador', 'clinico']);
const PERMISSION_STATUSES: ReadonlySet<NotificationPermissionStatus> = new Set([
  'undetermined',
  'granted',
  'denied',
]);

function storageKeyForPatient(patientId: string): string {
  const trimmed = patientId.trim();
  if (trimmed.length > 0) {
    return `${SETTINGS_KEY_PREFIX}${trimmed}`;
  }
  return SETTINGS_FALLBACK_KEY;
}

function legacyKeyForPatient(patientId: string): string {
  const trimmed = patientId.trim();
  if (trimmed.length > 0) {
    return `${LEGACY_PREFS_KEY_PREFIX}${trimmed}`;
  }
  return `${LEGACY_PREFS_KEY_PREFIX}anonymous`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isStoredNotificationSettings(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  const hasInterval =
    typeof o.intervalMinutes === 'number' || typeof o.intervalHours === 'number';
  return (
    typeof o.enabled === 'boolean' &&
    typeof o.permissionStatus === 'string' &&
    PERMISSION_STATUSES.has(o.permissionStatus as NotificationPermissionStatus) &&
    isStringArray(o.reminderTimes) &&
    typeof o.tone === 'string' &&
    TONES.has(o.tone as NotificationTone) &&
    (o.pauseUntil === null || typeof o.pauseUntil === 'string') &&
    isStringArray(o.scheduledNotificationIds) &&
    (o.lastScheduledAt === null || typeof o.lastScheduledAt === 'string') &&
    (o.lastReminderMessageKey === null ||
      o.lastReminderMessageKey === undefined ||
      typeof o.lastReminderMessageKey === 'string') &&
    hasInterval
  );
}

function normalizeSettings(raw: unknown): NotificationSettings {
  const base = createDefaultNotificationSettings();
  if (!isStoredNotificationSettings(raw)) {
    return base;
  }

  const o = raw;

  return applyNotificationDefaults({
    enabled: o.enabled as boolean,
    permissionStatus: o.permissionStatus as NotificationPermissionStatus,
    reminderTimes: [...(o.reminderTimes as string[])],
    tone: 'motivador',
    pauseUntil: null,
    scheduledNotificationIds: [...(o.scheduledNotificationIds as string[])],
    lastScheduledAt: (o.lastScheduledAt as string | null) ?? null,
    lastReminderMessageKey:
      typeof o.lastReminderMessageKey === 'string' ? o.lastReminderMessageKey : null,
    scheduleMode: 'interval',
    intervalHours: resolveIntervalHoursFromRaw(o),
    activeWindowStart:
      typeof o.activeWindowStart === 'string' && o.activeWindowStart.length > 0
        ? o.activeWindowStart
        : base.activeWindowStart,
    activeWindowEnd:
      typeof o.activeWindowEnd === 'string' && o.activeWindowEnd.length > 0
        ? o.activeWindowEnd
        : base.activeWindowEnd,
  });
}

type LegacyNotificationPreferences = {
  remindersEnabled?: boolean;
  preferredReminderTime?: string;
  scheduledNotificationIds?: string[];
};

function migrateLegacyPreferences(raw: unknown): NotificationSettings | null {
  if (raw == null || typeof raw !== 'object') return null;
  const legacy = raw as LegacyNotificationPreferences;
  if (typeof legacy.remindersEnabled !== 'boolean') return null;

  const next = createDefaultNotificationSettings();
  next.enabled = legacy.remindersEnabled;
  if (typeof legacy.preferredReminderTime === 'string' && legacy.preferredReminderTime.length > 0) {
    next.reminderTimes = [legacy.preferredReminderTime];
  }
  if (isStringArray(legacy.scheduledNotificationIds)) {
    next.scheduledNotificationIds = [...legacy.scheduledNotificationIds];
  }
  return next;
}

/** Forces reminders off in memory when the global build flag disables scheduling. */
export function coerceNotificationSettingsWhenGloballyDisabled(
  settings: NotificationSettings,
): NotificationSettings {
  if (RESPIRA_NOTIFICATIONS_ENABLED) {
    return applyNotificationDefaults(settings);
  }
  return applyNotificationDefaults({
    ...settings,
    enabled: false,
    scheduledNotificationIds: [],
    lastScheduledAt: null,
  });
}

/** Read-only snapshot for UI (Perfil, etc.) — same storage key as NotificationSettingsScreen. */
export async function readNotificationSettingsForDisplay(
  patientId: string,
): Promise<NotificationSettings> {
  let stored = applyNotificationDefaults(await loadNotificationSettings(patientId));
  if (supportsNativeLocalNotifications() && RESPIRA_NOTIFICATIONS_ENABLED) {
    const permissionStatus = await readNotificationPermissionStatus();
    if (permissionStatus !== stored.permissionStatus) {
      stored = applyNotificationDefaults({
        ...stored,
        permissionStatus,
      });
    }
  }
  return stored;
}

export async function loadNotificationSettings(patientId: string): Promise<NotificationSettings> {
  const key = storageKeyForPatient(patientId);
  const stored = await AsyncStorage.getItem(key);
  if (stored) {
    try {
      return coerceNotificationSettingsWhenGloballyDisabled(
        normalizeSettings(JSON.parse(stored) as unknown),
      );
    } catch {
      return createDefaultNotificationSettings();
    }
  }

  const legacyStored = await AsyncStorage.getItem(legacyKeyForPatient(patientId));
  if (legacyStored) {
    try {
      const migrated = migrateLegacyPreferences(JSON.parse(legacyStored) as unknown);
      if (migrated) {
        const coerced = coerceNotificationSettingsWhenGloballyDisabled(migrated);
        await saveNotificationSettings(patientId, coerced);
        return coerced;
      }
    } catch {
      // fall through to defaults
    }
  }

  return createDefaultNotificationSettings();
}

export async function saveNotificationSettings(
  patientId: string,
  settings: NotificationSettings,
): Promise<void> {
  const normalized = coerceNotificationSettingsWhenGloballyDisabled(normalizeSettings(settings));
  await AsyncStorage.setItem(storageKeyForPatient(patientId), JSON.stringify(normalized));
}

export async function updateNotificationSettings(
  patientId: string,
  patch: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
  const current = await loadNotificationSettings(patientId);
  const next: NotificationSettings = {
    ...current,
    ...patch,
    reminderTimes: patch.reminderTimes ?? current.reminderTimes,
    scheduledNotificationIds: patch.scheduledNotificationIds ?? current.scheduledNotificationIds,
    pauseUntil:
      patch.pauseUntil !== undefined
        ? normalizePauseUntil(patch.pauseUntil)
        : normalizePauseUntil(current.pauseUntil),
  };
  await saveNotificationSettings(patientId, next);
  return next;
}

export async function clearNotificationSettings(patientId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKeyForPatient(patientId));
  await AsyncStorage.removeItem(legacyKeyForPatient(patientId));
}
