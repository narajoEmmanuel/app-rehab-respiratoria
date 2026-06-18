/**
 * Purpose: System notification permissions and Android channel setup.
 * Module: notifications
 */

import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { RESPIRA_NOTIFICATIONS_ENABLED } from '@/src/config/runtime-flags';
import type { NotificationPermissionStatus } from '@/src/modules/notifications/notification-settings.types';

export const RESPIRA_ANDROID_CHANNEL_ID = 'respira-adherence-reminders';

/** Current category tag written into scheduled notification data. */
export const RESPIRA_THERAPY_REMINDER_CATEGORY = 'therapy-reminder';

/** Legacy category value from earlier builds — used only for migration cleanup. */
export const RESPIRA_LEGACY_THERAPY_REMINDER_CATEGORY = 'respira-therapy-reminder';

/** True when native local scheduling is expected to work (not in the browser bundle). */
export function supportsNativeLocalNotifications(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function mapPermissionStatus(status: Notifications.PermissionStatus): NotificationPermissionStatus {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function readNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!supportsNativeLocalNotifications() || !RESPIRA_NOTIFICATIONS_ENABLED) {
    return 'undetermined';
  }
  const { status } = await Notifications.getPermissionsAsync();
  return mapPermissionStatus(status);
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!supportsNativeLocalNotifications() || !RESPIRA_NOTIFICATIONS_ENABLED) {
    return 'undetermined';
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return mapPermissionStatus(current.status);
  }
  const requested = await Notifications.requestPermissionsAsync();
  return mapPermissionStatus(requested.status);
}

export async function ensureAndroidReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(RESPIRA_ANDROID_CHANNEL_ID, {
    name: 'Recordatorios RESPIRA+',
    importance: AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#34aba5',
    description: 'Recordatorios locales para sesiones de terapia respiratoria.',
  });
}
