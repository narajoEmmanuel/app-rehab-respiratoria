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
  cancelScheduledNotificationIds,
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
      let stored = applyNotificationDefaults(await loadNotificationSettings(patientId));

      if (nativeSupported) {
        const permissionStatus = await readNotificationPermissionStatus();
        if (permissionStatus !== stored.permissionStatus) {
          stored = { ...stored, permissionStatus };
        }
        if (stored.enabled) {
          stored = await rescheduleIfActive(patientId, stored);
        }
      }

      await saveNotificationSettings(patientId, stored);
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
        let next = applyNotificationDefaults(updater(settings));
        if (nativeSupported && next.enabled) {
          next = await rescheduleIfActive(patientId, next);
        } else if (nativeSupported && !next.enabled) {
          if (next.scheduledNotificationIds.length > 0) {
            await cancelScheduledNotificationIds(next.scheduledNotificationIds);
          }
          next = {
            ...next,
            scheduledNotificationIds: [],
            lastScheduledAt: null,
          };
          await saveNotificationSettings(patientId, next);
        } else {
          await saveNotificationSettings(patientId, next);
        }
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
          await saveNotificationSettings(patientId, denied);
          setSettings(denied);
          showInfoAlert('Recordatorios', PERMISSION_DENIED_MESSAGE);
          return;
        }

        const enabledSettings = applyNotificationDefaults({
          ...settings,
          enabled: true,
          permissionStatus,
        });
        const scheduled = await rescheduleIfActive(patientId, enabledSettings);
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
        await saveNotificationSettings(patientId, denied);
        setSettings(denied);
        showInfoAlert('Recordatorios', TEST_NOTIFICATION_DENIED_MESSAGE);
        return;
      }

      if (settings.permissionStatus !== permissionStatus) {
        const updated = applyNotificationDefaults({
          ...settings,
          permissionStatus,
        });
        await saveNotificationSettings(patientId, updated);
        setSettings(updated);
      }

      const messageKey = await sendTestNotification(settings.lastReminderMessageKey);
      const updated = applyNotificationDefaults({
        ...settings,
        lastReminderMessageKey: messageKey,
      });
      await saveNotificationSettings(patientId, updated);
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
