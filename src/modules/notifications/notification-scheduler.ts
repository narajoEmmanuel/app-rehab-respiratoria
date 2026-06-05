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
  pickMotivationalReminderCopy,
  pickMotivationalReminderCopyBySlot,
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

export type ScheduleDailyRemindersResult = {
  notificationIds: string[];
  lastMessageKey: string | null;
};

export async function scheduleDailyReminders(
  reminderTimes: readonly string[],
  previousMessageKey?: string | null,
): Promise<ScheduleDailyRemindersResult> {
  if (!supportsNativeLocalNotifications()) {
    throw new Error('Los recordatorios locales no están disponibles en la versión web.');
  }
  if (reminderTimes.length === 0) {
    return { notificationIds: [], lastMessageKey: previousMessageKey ?? null };
  }

  await ensureAndroidReminderChannel();
  const ids: string[] = [];
  let lastKey: string | null = previousMessageKey ?? null;

  for (let index = 0; index < reminderTimes.length; index += 1) {
    const timeHHmm = reminderTimes[index];
    const { hour, minute } = parseTimeHHmm(timeHHmm);
    const { copy, messageKey } = pickMotivationalReminderCopyBySlot(index, lastKey);
    lastKey = messageKey;
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
          messageKey,
        },
      },
      trigger,
    });
    ids.push(identifier);
  }

  return { notificationIds: ids, lastMessageKey: lastKey };
}

export async function scheduleRemindersFromSettings(
  settings: NotificationSettings,
): Promise<ScheduleDailyRemindersResult> {
  const reminderTimes = resolveSchedulableReminderTimes(settings);
  return scheduleDailyReminders(reminderTimes, settings.lastReminderMessageKey);
}

export async function sendTestNotification(excludeMessageKey?: string | null): Promise<string> {
  if (!supportsNativeLocalNotifications()) {
    throw new Error('Las notificaciones de prueba no están disponibles en la versión web.');
  }
  await ensureAndroidReminderChannel();
  const { copy, messageKey } = pickMotivationalReminderCopy(excludeMessageKey);
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
  return messageKey;
}

