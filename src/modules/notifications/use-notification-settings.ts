/**
 * Purpose: React hook for therapy reminder settings (load, persist, schedule).
 * Module: notifications
 */

import { useCallback, useEffect, useState } from 'react';

import { RESPIRA_NOTIFICATIONS_ENABLED } from '@/src/config/runtime-flags';
import { showInfoAlert } from '@/src/shared/utils/cross-platform-dialogs';
import {
  describeWebLimitation,
  NOTIFICATIONS_DISABLED_BY_BUILD_MESSAGE,
  PERMISSION_DENIED_MESSAGE,
  TEST_NOTIFICATION_DENIED_MESSAGE,
} from '@/src/modules/notifications/notification-copy';
import {
  readNotificationPermissionStatus,
  requestNotificationPermission,
  supportsNativeLocalNotifications,
} from '@/src/modules/notifications/notification-permissions';
import {
  runNotificationExclusive,
  sendTestNotification,
  syncRespiraNotifications,
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
  notificationsGloballyEnabled: boolean;
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

export function useNotificationSettings(patientId: string | null): UseNotificationSettingsResult {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const nativeSupported = supportsNativeLocalNotifications();
  const notificationsGloballyEnabled = RESPIRA_NOTIFICATIONS_ENABLED;

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

        if (nativeSupported && notificationsGloballyEnabled) {
          const permissionStatus = await readNotificationPermissionStatus();
          if (permissionStatus !== next.permissionStatus) {
            next = { ...next, permissionStatus };
            await saveNotificationSettings(patientId, next);
          }
        }

        return next;
      });
      setSettings(stored);
    } finally {
      setLoading(false);
    }
  }, [nativeSupported, notificationsGloballyEnabled, patientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applySettings = useCallback(
    async (updater: (current: NotificationSettings) => NotificationSettings) => {
      if (!patientId || settings == null) return;
      setBusy(true);
      try {
        const next = await runNotificationExclusive(async () => {
          const draft = applyNotificationDefaults(updater(settings));
          const synced = await syncRespiraNotifications(draft);
          await saveNotificationSettings(patientId, synced);
          return synced;
        });
        setSettings(next);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo actualizar la configuración.';
        showInfoAlert('Error', message);
      } finally {
        setBusy(false);
      }
    },
    [patientId, settings],
  );

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!patientId || settings == null) return;

      if (!notificationsGloballyEnabled) {
        showInfoAlert('Recordatorios', NOTIFICATIONS_DISABLED_BY_BUILD_MESSAGE);
        return;
      }

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
            const synced = await syncRespiraNotifications(denied);
            await saveNotificationSettings(patientId, synced);
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
        const scheduled = await runNotificationExclusive(async () => {
          const synced = await syncRespiraNotifications(enabledSettings);
          await saveNotificationSettings(patientId, synced);
          return synced;
        });
        setSettings(scheduled);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo activar los recordatorios.';
        showInfoAlert('Error', message);
      } finally {
        setBusy(false);
      }
    },
    [applySettings, nativeSupported, notificationsGloballyEnabled, patientId, settings],
  );

  const sendTestReminder = useCallback(async () => {
    if (!patientId || settings == null) return;

    if (!notificationsGloballyEnabled) {
      showInfoAlert('Recordatorios', NOTIFICATIONS_DISABLED_BY_BUILD_MESSAGE);
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
  }, [nativeSupported, notificationsGloballyEnabled, patientId, settings]);

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
    notificationsGloballyEnabled,
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
