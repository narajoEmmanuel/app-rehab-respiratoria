/**
 * Purpose: Schedule and cancel local therapy reminder notifications.
 * Module: notifications
 */

import * as Notifications from 'expo-notifications';
import {
  type DailyTriggerInput,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';
import { Platform } from 'react-native';

import {
  getMotivationalReminderCopyBySlot,
  getRandomMotivationalReminderCopy,
  motivationalReminderMessages,
} from '@/src/modules/notifications/notification-copy';
import {
  ensureAndroidReminderChannel,
  RESPIRA_ANDROID_CHANNEL_ID,
  RESPIRA_THERAPY_REMINDER_CATEGORY,
  supportsNativeLocalNotifications,
} from '@/src/modules/notifications/notification-permissions';
import {
  parseTimeHHmm,
  resolveSchedulableReminderTimes,
  type NotificationSettings,
} from '@/src/modules/notifications/notification-settings.types';

function isRespiraTherapyReminderData(data: Record<string, unknown> | undefined): boolean {
  if (data == null) return false;
  return data.category === RESPIRA_THERAPY_REMINDER_CATEGORY;
}

export async function cancelScheduledNotificationIds(
  notificationIds: readonly string[],
): Promise<void> {
  if (!supportsNativeLocalNotifications() || notificationIds.length === 0) return;
  await Promise.all(
    notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
}

/** Cancels every locally scheduled notification tagged as a RESPIRA+ therapy reminder. */
export async function cancelAllRespiraReminders(): Promise<void> {
  if (!supportsNativeLocalNotifications()) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter((req) =>
    isRespiraTherapyReminderData(req.content.data as Record<string, unknown> | undefined),
  );
  await Promise.all(
    toCancel.map((req) => Notifications.cancelScheduledNotificationAsync(req.identifier)),
  );
}

export async function scheduleDailyReminders(reminderTimes: readonly string[]): Promise<string[]> {
  if (!supportsNativeLocalNotifications()) {
    throw new Error('Los recordatorios locales no están disponibles en la versión web.');
  }
  if (reminderTimes.length === 0) {
    return [];
  }

  await ensureAndroidReminderChannel();
  const ids: string[] = [];
  const scheduleOffset = Math.floor(Math.random() * motivationalReminderMessages.length);

  for (let index = 0; index < reminderTimes.length; index += 1) {
    const timeHHmm = reminderTimes[index];
    const { hour, minute } = parseTimeHHmm(timeHHmm);
    const copy = getMotivationalReminderCopyBySlot(index + scheduleOffset);
    const trigger: DailyTriggerInput = {
      type: SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: RESPIRA_ANDROID_CHANNEL_ID } : {}),
    };

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.title,
        body: copy.body,
        data: {
          category: RESPIRA_THERAPY_REMINDER_CATEGORY,
          tone: 'motivador',
          time: timeHHmm,
          variantIndex: index + scheduleOffset,
        },
      },
      trigger,
    });
    ids.push(identifier);
  }

  return ids;
}

export async function scheduleRemindersFromSettings(
  settings: NotificationSettings,
): Promise<string[]> {
  const reminderTimes = resolveSchedulableReminderTimes(settings);
  return scheduleDailyReminders(reminderTimes);
}

export async function sendTestNotification(): Promise<void> {
  if (!supportsNativeLocalNotifications()) {
    throw new Error('Las notificaciones de prueba no están disponibles en la versión web.');
  }
  await ensureAndroidReminderChannel();
  const copy = getRandomMotivationalReminderCopy();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      data: {
        category: RESPIRA_THERAPY_REMINDER_CATEGORY,
        test: true,
      },
      ...(Platform.OS === 'android' ? { channelId: RESPIRA_ANDROID_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}
