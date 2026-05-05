/**
 * Purpose: Local notification scheduling for RESPIRA+ therapy reminders (no remote push).
 * Module: notifications
 */

import type { PermissionStatus } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import {
  AndroidImportance,
  type DailyTriggerInput,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';
import { Platform } from 'react-native';

/** Matches `content.data.category` on scheduled reminders so we can cancel only our app's therapy alerts. */
export const RESPIRA_THERAPY_REMINDER_CATEGORY = 'respira-therapy-reminder';

const RESPIRA_DEFAULT_ANDROID_CHANNEL_ID = 'respira-therapy-reminders';

const TIME_HH_MM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function parseTimeHHmm(timeHHmm: string): { hour: number; minute: number } {
  const m = TIME_HH_MM.exec(timeHHmm.trim());
  if (!m) {
    throw new Error(`Hora inválida: se esperaba HH:mm, recibido "${timeHHmm}".`);
  }
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return { hour, minute };
}

function isRespiraTherapyReminderData(data: Record<string, unknown> | undefined): boolean {
  if (data == null) return false;
  return data.category === RESPIRA_THERAPY_REMINDER_CATEGORY;
}

async function ensureAndroidReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(RESPIRA_DEFAULT_ANDROID_CHANNEL_ID, {
    name: 'Recordatorios de terapia',
    importance: AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#34aba5',
    description: 'Avisos diarios para sesiones de terapia respiratoria en RESPIRA+.',
  });
}

/** True when native local scheduling is expected to work (not in the browser bundle). */
export function supportsScheduledLocalReminders(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function getNotificationPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermissions(): Promise<PermissionStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return current.status;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status;
}

export async function scheduleDailyTherapyReminder(timeHHmm: string): Promise<string[]> {
  if (!supportsScheduledLocalReminders()) {
    throw new Error('Los recordatorios locales no están disponibles en la versión web.');
  }
  const { hour, minute } = parseTimeHHmm(timeHHmm);
  await ensureAndroidReminderChannel();

  const trigger: DailyTriggerInput = {
    type: SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    ...(Platform.OS === 'android' ? { channelId: RESPIRA_DEFAULT_ANDROID_CHANNEL_ID } : {}),
  };

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'RESPIRA+',
      body: 'Es un buen momento para tu sesión de terapia respiratoria.',
      data: { category: RESPIRA_THERAPY_REMINDER_CATEGORY },
    },
    trigger,
  });

  return [identifier];
}

export async function cancelScheduledReminders(notificationIds: readonly string[]): Promise<void> {
  await Promise.all(
    notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
}

/** Cancels every locally scheduled notification tagged as a RESPIRA+ therapy reminder for this app. */
export async function cancelAllRespiraReminders(): Promise<void> {
  if (!supportsScheduledLocalReminders()) {
    return;
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter((req) =>
    isRespiraTherapyReminderData(req.content.data as Record<string, unknown> | undefined),
  );
  await Promise.all(toCancel.map((req) => Notifications.cancelScheduledNotificationAsync(req.identifier)));
}
