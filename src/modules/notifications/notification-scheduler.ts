/**
 * Purpose: Schedule and cancel local therapy reminder notifications.
 * Module: notifications
 */

import * as Notifications from 'expo-notifications';
import {
  type DailyTriggerInput,
  SchedulableTriggerInputTypes,
} from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { RESPIRA_NOTIFICATIONS_ENABLED } from '@/src/config/runtime-flags';
import {
  motivationalReminderMessages,
  pickMotivationalReminderCopy,
  pickMotivationalReminderCopyBySlot,
} from '@/src/modules/notifications/notification-copy';
import {
  ensureAndroidReminderChannel,
  RESPIRA_ANDROID_CHANNEL_ID,
  RESPIRA_LEGACY_THERAPY_REMINDER_CATEGORY,
  RESPIRA_THERAPY_REMINDER_CATEGORY,
  supportsNativeLocalNotifications,
} from '@/src/modules/notifications/notification-permissions';
import {
  applyNotificationDefaults,
  isActiveWindowValid,
  isValidTimeHHmm,
  normalizeTimeHHmm,
  parseTimeHHmm,
  resolveEffectiveReminderTimes,
  resolveSchedulableReminderTimes,
  type NotificationSettings,
} from '@/src/modules/notifications/notification-settings.types';

export const RESPIRA_NOTIFICATION_APP_ID = 'RESPIRA_PLUS';
export const RESPIRA_NOTIFICATION_SCHEDULER_ID = 'respira-notification-service';

const LEGACY_DATA_CATEGORIES = new Set(['reminder', 'therapy']);

const RESPIRA_REMINDER_COPY_KEYS = new Set(
  motivationalReminderMessages.map((copy) => `${copy.title}\u0000${copy.body}`),
);

/**
 * Serializes every operation that schedules/cancels RESPIRA+ notifications.
 * Composite flows (cancel stored IDs → sweep orphans → schedule batch) must
 * run inside a single exclusive task so they cannot interleave.
 */
let notificationOpQueue: Promise<unknown> = Promise.resolve();

export function runNotificationExclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = notificationOpQueue.then(task, task);
  notificationOpQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** At most one notification per normalized HH:mm slot. */
function dedupeReminderTimesHHmm(reminderTimes: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const time of reminderTimes) {
    if (!isValidTimeHHmm(time)) continue;
    const normalized = normalizeTimeHHmm(time, time);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

function devLog(message: string): void {
  if (__DEV__) {
    console.log(`[notifications] ${message}`);
  }
}

function isLegacyRespiraCopyMatch(title: string | null | undefined, body: string | null | undefined): boolean {
  if (title == null || body == null) return false;
  return RESPIRA_REMINDER_COPY_KEYS.has(`${title}\u0000${body}`);
}

function isRespiraScheduledNotification(
  req: Notifications.NotificationRequest,
): boolean {
  const data = req.content.data as Record<string, unknown> | undefined;
  if (data?.app === RESPIRA_NOTIFICATION_APP_ID) return true;

  const category = data?.category;
  if (typeof category === 'string') {
    if (category === RESPIRA_THERAPY_REMINDER_CATEGORY) return true;
    if (category === RESPIRA_LEGACY_THERAPY_REMINDER_CATEGORY) return true;
    if (LEGACY_DATA_CATEGORIES.has(category)) return true;
  }

  return isLegacyRespiraCopyMatch(req.content.title, req.content.body);
}

export async function cancelScheduledNotificationIds(
  notificationIds: readonly string[],
): Promise<void> {
  if (!supportsNativeLocalNotifications() || notificationIds.length === 0) return;
  await Promise.all(
    notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
  );
}

/**
 * Cancels every locally scheduled notification owned by RESPIRA+.
 * Identifies by stable data tags and legacy title/body migration sweep.
 */
export async function cancelRespiraScheduledNotifications(): Promise<number> {
  if (!supportsNativeLocalNotifications()) return 0;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter(isRespiraScheduledNotification);
  const beforeCount = toCancel.length;

  if (beforeCount > 0) {
    devLog(`RESPIRA+ pendientes antes de cancelar: ${beforeCount}`);
  }

  await Promise.all(
    toCancel.map((req) => Notifications.cancelScheduledNotificationAsync(req.identifier)),
  );

  if (beforeCount > 0) {
    devLog(`Canceladas ${beforeCount} notificación(es) RESPIRA+`);
  }

  return beforeCount;
}

async function countRemainingRespiraScheduledNotifications(): Promise<number> {
  if (!supportsNativeLocalNotifications()) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter(isRespiraScheduledNotification).length;
}

export type RespiraNotificationCleanupReason = 'startup' | 'foreground' | 'refresh';

export type RespiraNotificationCleanupResult = {
  respiraCancelled: number;
  devFallbackUsed: boolean;
  remainingRespiraCount: number;
};

/**
 * Clears pending RESPIRA+ notifications when the global build flag is off.
 * In __DEV__ only, may call cancelAllScheduledNotificationsAsync to flush orphaned
 * Expo Go / iOS queue entries that survive targeted cancellation.
 */
export async function cleanupRespiraNotificationsWhenGloballyDisabled(
  reason: RespiraNotificationCleanupReason,
): Promise<RespiraNotificationCleanupResult> {
  if (Platform.OS === 'web' || RESPIRA_NOTIFICATIONS_ENABLED) {
    return { respiraCancelled: 0, devFallbackUsed: false, remainingRespiraCount: 0 };
  }

  devLog(`EXPO_PUBLIC_RESPIRA_NOTIFICATIONS_ENABLED=false — limpieza (${reason})`);

  const respiraCancelled = await cancelRespiraScheduledNotifications();
  let remainingRespiraCount = await countRemainingRespiraScheduledNotifications();
  let devFallbackUsed = false;

  if (__DEV__ && remainingRespiraCount > 0) {
    // Expo Go migration: orphans may remain listed by iOS after selective cancel.
    devLog(
      `Quedan ${remainingRespiraCount} RESPIRA+ pendiente(s); ejecutando cancelAllScheduledNotificationsAsync (solo __DEV__, flag apagada)`,
    );
    await Notifications.cancelAllScheduledNotificationsAsync();
    devFallbackUsed = true;
    remainingRespiraCount = await countRemainingRespiraScheduledNotifications();
    devLog(
      devFallbackUsed
        ? `Fallback dev cancelAllScheduled aplicado (${reason}); RESPIRA+ restantes: ${remainingRespiraCount}`
        : `Limpieza (${reason}) completada`,
    );
  } else if (respiraCancelled > 0) {
    devLog(`Limpieza (${reason}): canceladas ${respiraCancelled} notificación(es) RESPIRA+`);
  }

  return { respiraCancelled, devFallbackUsed, remainingRespiraCount };
}

const FOREGROUND_CLEANUP_MIN_INTERVAL_MS = 3000;
let lastForegroundCleanupAt = 0;

/** Subscribes to AppState and cleans when the app returns to foreground (native, flag off). */
export function subscribeRespiraNotificationCleanupOnForeground(): () => void {
  if (Platform.OS === 'web' || RESPIRA_NOTIFICATIONS_ENABLED) {
    return () => undefined;
  }

  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState !== 'active') return;

    const now = Date.now();
    if (now - lastForegroundCleanupAt < FOREGROUND_CLEANUP_MIN_INTERVAL_MS) return;
    lastForegroundCleanupAt = now;

    void runNotificationExclusive(() =>
      cleanupRespiraNotificationsWhenGloballyDisabled('foreground'),
    );
  });

  return () => subscription.remove();
}

/** @deprecated Use cancelRespiraScheduledNotifications */
export const cancelAllRespiraReminders = cancelRespiraScheduledNotifications;

export type ScheduleDailyRemindersResult = {
  notificationIds: string[];
  lastMessageKey: string | null;
};

export async function scheduleDailyReminders(
  reminderTimes: readonly string[],
  previousMessageKey?: string | null,
): Promise<ScheduleDailyRemindersResult> {
  if (Platform.OS === 'web') {
    throw new Error('Los recordatorios locales no están disponibles en la versión web.');
  }
  if (!RESPIRA_NOTIFICATIONS_ENABLED) {
    throw new Error('Los recordatorios están desactivados en esta versión de la app.');
  }

  const uniqueTimes = dedupeReminderTimesHHmm(reminderTimes);
  if (uniqueTimes.length === 0) {
    return { notificationIds: [], lastMessageKey: previousMessageKey ?? null };
  }

  await ensureAndroidReminderChannel();
  const ids: string[] = [];
  let lastKey: string | null = previousMessageKey ?? null;

  for (let index = 0; index < uniqueTimes.length; index += 1) {
    const timeHHmm = uniqueTimes[index];
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
          app: RESPIRA_NOTIFICATION_APP_ID,
          category: RESPIRA_THERAPY_REMINDER_CATEGORY,
          slotId: timeHHmm,
          scheduledBy: RESPIRA_NOTIFICATION_SCHEDULER_ID,
          tone: 'motivador',
          time: timeHHmm,
          messageKey,
        },
      },
      trigger,
    });
    ids.push(identifier);
  }

  devLog(`Programados ${ids.length} recordatorio(s) diario(s).`);
  return { notificationIds: ids, lastMessageKey: lastKey };
}

export async function scheduleRemindersFromSettings(
  settings: NotificationSettings,
): Promise<ScheduleDailyRemindersResult> {
  const reminderTimes = resolveSchedulableReminderTimes(settings);
  return scheduleDailyReminders(reminderTimes, settings.lastReminderMessageKey);
}

/**
 * Single entry point to align OS scheduled notifications with persisted settings.
 * Always cancels the previous RESPIRA+ batch before scheduling a new one.
 */
export async function syncRespiraNotifications(
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  if (Platform.OS === 'web') {
    return applyNotificationDefaults(settings);
  }

  const normalized = applyNotificationDefaults(settings);

  if (!RESPIRA_NOTIFICATIONS_ENABLED) {
    devLog('Omitiendo programación: EXPO_PUBLIC_RESPIRA_NOTIFICATIONS_ENABLED=false');
    if (normalized.scheduledNotificationIds.length > 0) {
      await cancelScheduledNotificationIds(normalized.scheduledNotificationIds);
    }
    await cleanupRespiraNotificationsWhenGloballyDisabled('refresh');
    return {
      ...normalized,
      enabled: false,
      scheduledNotificationIds: [],
      lastScheduledAt: null,
    };
  }

  if (!normalized.enabled) {
    if (normalized.scheduledNotificationIds.length > 0) {
      await cancelScheduledNotificationIds(normalized.scheduledNotificationIds);
    }
    await cancelRespiraScheduledNotifications();
    return {
      ...normalized,
      scheduledNotificationIds: [],
      lastScheduledAt: null,
    };
  }

  const effectiveTimes = resolveEffectiveReminderTimes(normalized);
  const canSchedule =
    effectiveTimes.length > 0 &&
    isActiveWindowValid(normalized.activeWindowStart, normalized.activeWindowEnd);

  if (normalized.scheduledNotificationIds.length > 0) {
    await cancelScheduledNotificationIds(normalized.scheduledNotificationIds);
  }
  await cancelRespiraScheduledNotifications();

  if (!canSchedule) {
    return {
      ...normalized,
      scheduledNotificationIds: [],
      lastScheduledAt: null,
    };
  }

  const { notificationIds, lastMessageKey } = await scheduleRemindersFromSettings(normalized);
  return {
    ...normalized,
    scheduledNotificationIds: notificationIds,
    lastScheduledAt: new Date().toISOString(),
    lastReminderMessageKey: lastMessageKey,
  };
}

/** Clears pending RESPIRA+ notifications on cold start when globally disabled. */
export async function initializeRespiraNotificationsOnStartup(): Promise<void> {
  await cleanupRespiraNotificationsWhenGloballyDisabled('startup');
}

export async function sendTestNotification(excludeMessageKey?: string | null): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('Las notificaciones de prueba no están disponibles en la versión web.');
  }
  if (!RESPIRA_NOTIFICATIONS_ENABLED) {
    throw new Error('Los recordatorios están desactivados en esta versión de la app.');
  }

  await ensureAndroidReminderChannel();
  const { copy, messageKey } = pickMotivationalReminderCopy(excludeMessageKey);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      data: {
        app: RESPIRA_NOTIFICATION_APP_ID,
        category: RESPIRA_THERAPY_REMINDER_CATEGORY,
        slotId: 'test',
        scheduledBy: RESPIRA_NOTIFICATION_SCHEDULER_ID,
        test: true,
      },
      ...(Platform.OS === 'android' ? { channelId: RESPIRA_ANDROID_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
  return messageKey;
}
