/**
 * Purpose: React hook for therapy reminder settings (load, persist, schedule).
 * Module: notifications
 */

import { useCallback, useEffect, useState } from 'react';

import { showInfoAlert } from '@/src/shared/utils/cross-platform-dialogs';
import {
  describeWebLimitation,
  PERMISSION_DENIED_MESSAGE,
  TEST_NOTIFICATION_DENIED_MESSAGE,
} from '@/src/modules/notifications/notification-copy';
import {
  readNotificationPermissionStatus,
  requestNotificationPermission,
  supportsNativeLocalNotifications,
} from '@/src/modules/notifications/notification-permissions';
import {
  cancelAllRespiraReminders,
  cancelScheduledNotificationIds,
  runNotificationExclusive,
  scheduleRemindersFromSettings,
  sendTestNotification,
} from '@/src/modules/notifications/notification-scheduler';
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from '@/src/modules/notifications/notification-settings.storage';
import {
  applyNotificationDefaults,
  buildPreviewDisplay,
  exceedsDailyScheduleLimit,
  formatProfileReminderSummary,
  isActiveWindowValid,
  normalizeTimeHHmm,
  resolveEffectiveReminderTimes,
  type NotificationSettings,
} from '@/src/modules/notifications/notification-settings.types';

type PreviewDisplay = ReturnType<typeof buildPreviewDisplay>;

type UseNotificationSettingsResult = {
  settings: NotificationSettings | null;
  loading: boolean;
  busy: boolean;
  nativeSupported: boolean;
  scheduleSummary: string;
  previewTimes: string[];
  previewDisplay: PreviewDisplay;
  exceedsScheduleLimit: boolean;
  activeWindowInvalid: boolean;
  refresh: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  setActiveWindow: (start: string, end: string) => Promise<void>;
  sendTestReminder: () => Promise<void>;
};
async function rescheduleIfActive(
  patientId: string,
  draft: NotificationSettings,
): Promise<NotificationSettings> {
  const normalized = applyNotificationDefaults(draft);

  if (normalized.scheduledNotificationIds.length > 0) {
    await cancelScheduledNotificationIds(normalized.scheduledNotificationIds);
  }
  // Sweep by category to also remove orphaned/duplicated reminders whose IDs
  // were never persisted (race conditions, crashes, stale storage).
  await cancelAllRespiraReminders();

  const effectiveTimes = resolveEffectiveReminderTimes(normalized);
  const canSchedule =
    normalized.enabled &&
    effectiveTimes.length > 0 &&
    isActiveWindowValid(normalized.activeWindowStart, normalized.activeWindowEnd);

  if (!canSchedule) {
    const cleared: NotificationSettings = {
      ...normalized,
      scheduledNotificationIds: [],
      lastScheduledAt: null,
    };
    await saveNotificationSettings(patientId, cleared);
    return cleared;
  }

  const { notificationIds, lastMessageKey } = await scheduleRemindersFromSettings(normalized);
  const scheduled: NotificationSettings = {
    ...normalized,
    scheduledNotificationIds: notificationIds,
    lastScheduledAt: new Date().toISOString(),
    lastReminderMessageKey: lastMessageKey,
  };
  await saveNotificationSettings(patientId, scheduled);
  return scheduled;
}

export function useNotificationSettings(patientId: string | null): UseNotificationSettingsResult {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const nativeSupported = supportsNativeLocalNotifications();

  const refresh = useCallback(async () => {
    if (!patientId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const stored = await runNotificationExclusive(async () => {
        let next = applyNotificationDefaults(await loadNotificationSettings(patientId));

        if (nativeSupported) {
          const permissionStatus = await readNotificationPermissionStatus();
          if (permissionStatus !== next.permissionStatus) {
            next = { ...next, permissionStatus };
          }
          if (next.enabled) {
            // rescheduleIfActive persists the freshly scheduled IDs itself;
            // saving again here could overwrite them with stale data.
            return rescheduleIfActive(patientId, next);
          }
        }

        await saveNotificationSettings(patientId, next);
        return next;
      });
      setSettings(stored);
    } finally {
      setLoading(false);
    }
  }, [nativeSupported, patientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applySettings = useCallback(
    async (updater: (current: NotificationSettings) => NotificationSettings) => {
      if (!patientId || settings == null) return;
      setBusy(true);
      try {
        const next = await runNotificationExclusive(async () => {
          let draft = applyNotificationDefaults(updater(settings));
          if (nativeSupported && draft.enabled) {
            draft = await rescheduleIfActive(patientId, draft);
          } else if (nativeSupported && !draft.enabled) {
            if (draft.scheduledNotificationIds.length > 0) {
              await cancelScheduledNotificationIds(draft.scheduledNotificationIds);
            }
            await cancelAllRespiraReminders();
            draft = {
              ...draft,
              scheduledNotificationIds: [],
              lastScheduledAt: null,
            };
            await saveNotificationSettings(patientId, draft);
          } else {
            await saveNotificationSettings(patientId, draft);
          }
          return draft;
        });
        setSettings(next);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo actualizar la configuración.';
        showInfoAlert('Error', message);
      } finally {
        setBusy(false);
      }
    },
    [nativeSupported, patientId, settings],
  );

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!patientId || settings == null) return;

      if (!enabled) {
        await applySettings((current) => ({ ...current, enabled: false }));
        return;
      }

      if (!nativeSupported) {
        showInfoAlert('Versión web', describeWebLimitation());
        return;
      }

      setBusy(true);
      try {
        const permissionStatus = await requestNotificationPermission();
        if (permissionStatus !== 'granted') {
          const denied = applyNotificationDefaults({
            ...settings,
            enabled: false,
            permissionStatus,
          });
          await runNotificationExclusive(async () => {
            await saveNotificationSettings(patientId, denied);
          });
          setSettings(denied);
          showInfoAlert('Recordatorios', PERMISSION_DENIED_MESSAGE);
          return;
        }

        const enabledSettings = applyNotificationDefaults({
          ...settings,
          enabled: true,
          permissionStatus,
        });
        const scheduled = await runNotificationExclusive(() =>
          rescheduleIfActive(patientId, enabledSettings),
        );
        setSettings(scheduled);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo activar los recordatorios.';
        showInfoAlert('Error', message);
      } finally {
        setBusy(false);
      }
    },
    [applySettings, nativeSupported, patientId, settings],
  );

  const sendTestReminder = useCallback(async () => {
    if (!patientId || settings == null) return;

    if (!nativeSupported) {
      showInfoAlert('Versión web', describeWebLimitation());
      return;
    }

    setBusy(true);
    try {
      const permissionStatus = await requestNotificationPermission();
      if (permissionStatus !== 'granted') {
        const denied = applyNotificationDefaults({
          ...settings,
          permissionStatus,
        });
        await runNotificationExclusive(async () => {
          await saveNotificationSettings(patientId, denied);
        });
        setSettings(denied);
        showInfoAlert('Recordatorios', TEST_NOTIFICATION_DENIED_MESSAGE);
        return;
      }

      const updated = await runNotificationExclusive(async () => {
        // Re-read storage so a concurrent reschedule can't be overwritten with
        // stale scheduled IDs, and so the test excludes the latest message key.
        const fresh = applyNotificationDefaults(await loadNotificationSettings(patientId));
        const messageKey = await sendTestNotification(fresh.lastReminderMessageKey);
        const next = applyNotificationDefaults({
          ...fresh,
          permissionStatus,
          lastReminderMessageKey: messageKey,
        });
        await saveNotificationSettings(patientId, next);
        return next;
      });
      setSettings(updated);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo enviar la notificación de prueba.';
      showInfoAlert('Error', message);
    } finally {
      setBusy(false);
    }
  }, [nativeSupported, patientId, settings]);

  const setActiveWindow = useCallback(
    async (start: string, end: string) => {
      await applySettings((current) => ({
        ...current,
        activeWindowStart: normalizeTimeHHmm(start, current.activeWindowStart),
        activeWindowEnd: normalizeTimeHHmm(end, current.activeWindowEnd),
      }));
    },
    [applySettings],
  );

  const previewTimes = settings == null ? [] : resolveEffectiveReminderTimes(settings);
  const previewDisplay = buildPreviewDisplay(previewTimes);
  const exceedsScheduleLimit = settings != null && exceedsDailyScheduleLimit(settings);
  const activeWindowInvalid =
    settings != null &&
    !isActiveWindowValid(settings.activeWindowStart, settings.activeWindowEnd);

  return {
    settings,
    loading,
    busy,
    nativeSupported,
    scheduleSummary: settings == null ? '—' : formatProfileReminderSummary(settings),
    previewTimes,
    previewDisplay,
    exceedsScheduleLimit,
    activeWindowInvalid,
    refresh,
    setEnabled,
    setActiveWindow,
    sendTestReminder,
  };
}
