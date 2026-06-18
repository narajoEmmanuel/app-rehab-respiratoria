/**
 * Purpose: Configure local therapy reminders — option 6 day/night adherence layout.
 * Module: notifications
 */

import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isConsentActive } from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { AwakeWindowCard } from '@/src/modules/notifications/components/AwakeWindowCard';
import { DayNightVisualCard } from '@/src/modules/notifications/components/DayNightVisualCard';
import { NextReminderCard } from '@/src/modules/notifications/components/NextReminderCard';
import { ReminderHeroCard } from '@/src/modules/notifications/components/ReminderHeroCard';
import { TestNotificationButton } from '@/src/modules/notifications/components/TestNotificationButton';
import { TodayReminderTimeline } from '@/src/modules/notifications/components/TodayReminderTimeline';
import { reminderUi } from '@/src/modules/notifications/components/reminder-ui-tokens';
import {
  describeWebLimitation,
  formatAwakeWindowScheduleMessage,
  NOTIFICATIONS_DISABLED_BY_BUILD_MESSAGE,
} from '@/src/modules/notifications/notification-copy';
import { useNotificationSettings } from '@/src/modules/notifications/use-notification-settings';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppText } from '@/src/shared/ui/AppText';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset } from '@/src/shared/theme/wellness-theme';

const ACCENT = reminderUi.teal;

export function NotificationSettingsScreen() {
  const router = useRouter();
  const { patient, hydrated } = usePatientSession();
  const patientKey = patient ? String(patient.paciente_id) : null;
  const [consentOk, setConsentOk] = useState<boolean | null>(null);
  const [startDraft, setStartDraft] = useState('08:00');
  const [endDraft, setEndDraft] = useState('22:00');

  const {
    settings,
    loading,
    busy,
    nativeSupported,
    notificationsGloballyEnabled,
    previewTimes,
    previewDisplay,
    activeWindowInvalid,
    setEnabled,
    setActiveWindow,
    sendTestReminder,
  } = useNotificationSettings(patientKey);

  useEffect(() => {
    if (settings == null) return;
    setStartDraft(settings.activeWindowStart);
    setEndDraft(settings.activeWindowEnd);
  }, [settings?.activeWindowStart, settings?.activeWindowEnd, settings]);

  const loadConsent = useCallback(async () => {
    if (!patient) {
      setConsentOk(null);
      return;
    }
    setConsentOk(await isConsentActive());
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      if (!hydrated) return;
      void loadConsent();
    }, [hydrated, loadConsent]),
  );

  const blockedByConsent = patient != null && consentOk === false;
  const buildNotificationsDisabled = !notificationsGloballyEnabled;
  const controlsDisabled = busy || blockedByConsent || buildNotificationsDisabled;
  const scheduleDisabled = controlsDisabled || !settings?.enabled;
  const remindersDimmed = !settings?.enabled || buildNotificationsDisabled;

  const commitStartTime = useCallback(() => {
    if (!settings) return;
    void setActiveWindow(startDraft, settings.activeWindowEnd);
  }, [setActiveWindow, settings, startDraft]);

  const commitEndTime = useCallback(() => {
    if (!settings) return;
    void setActiveWindow(settings.activeWindowStart, endDraft);
  }, [endDraft, setActiveWindow, settings]);

  const scheduleMessage =
    settings == null
      ? ''
      : formatAwakeWindowScheduleMessage(
          settings.activeWindowStart,
          settings.activeWindowEnd,
          settings.enabled,
        );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar
        showBackButton
        backFallbackHref="/profile"
        onPressProfile={() => router.push('/profile')}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: wellnessFloatingTabBarInset + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="titleLarge" style={styles.title}>
            Recordatorios
          </AppText>
          <AppText variant="bodyMedium" style={styles.subtitle}>
            Pequeños avisos para cuidar tu recuperación
          </AppText>
        </View>

        {!hydrated || (patient != null && (consentOk === null || loading)) ? (
          <View style={styles.centerRow}>
            <ActivityIndicator color={ACCENT} />
            <AppText variant="bodySmall" style={styles.muted}>
              Cargando…
            </AppText>
          </View>
        ) : null}

        {patient == null ? (
          <AppText variant="bodySmall" style={styles.note}>
            Inicia sesión para configurar.
          </AppText>
        ) : null}

        {blockedByConsent ? (
          <View style={styles.consentCard}>
            <AppText variant="bodySmall" style={styles.note}>
              Acepta los documentos legales para activar recordatorios.
            </AppText>
            <Pressable
              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
              onPress={() => router.push(LEGAL_ACCEPT_HREF)}
              accessibilityRole="button">
              <AppText variant="bodyMedium" style={styles.linkBtnText}>
                Revisar documentos
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {!nativeSupported ? (
          <AppText variant="bodySmall" style={styles.note}>
            {describeWebLimitation()}
          </AppText>
        ) : null}

        {buildNotificationsDisabled ? (
          <AppText variant="bodySmall" style={styles.note}>
            {NOTIFICATIONS_DISABLED_BY_BUILD_MESSAGE}
          </AppText>
        ) : null}

        {patient && consentOk === true && settings != null ? (
          <>
            <ReminderHeroCard
              enabled={settings.enabled}
              intervalHours={settings.intervalHours}
              remindersToday={previewDisplay.totalCount}
              onToggle={(value) => void setEnabled(value)}
              toggleDisabled={controlsDisabled}
            />

            <AwakeWindowCard
              invalid={activeWindowInvalid}
              dimmed={remindersDimmed}
              editDisabled={scheduleDisabled}
              startDraft={startDraft}
              endDraft={endDraft}
              onChangeStartDraft={setStartDraft}
              onChangeEndDraft={setEndDraft}
              onCommitStart={commitStartTime}
              onCommitEnd={commitEndTime}
            />

            <DayNightVisualCard
              scheduleMessage={activeWindowInvalid ? undefined : scheduleMessage}
              dimmed={remindersDimmed}
            />

            <TodayReminderTimeline
              times={previewTimes}
              dimmed={remindersDimmed || activeWindowInvalid}
            />

            <NextReminderCard
              times={previewTimes}
              dimmed={remindersDimmed || activeWindowInvalid}
            />

            {nativeSupported && notificationsGloballyEnabled ? (
              <TestNotificationButton
                onPress={() => void sendTestReminder()}
                disabled={controlsDisabled}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellness.screenBg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  header: {
    gap: 4,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: wellness.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: wellness.textSecondary,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  muted: {
    color: wellness.textSecondary,
  },
  note: {
    color: wellness.textSecondary,
  },
  consentCard: {
    backgroundColor: wellness.card,
    borderRadius: reminderUi.cardRadius,
    borderWidth: 1,
    borderColor: reminderUi.mintBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  linkBtn: {
    alignSelf: 'flex-start',
  },
  linkBtnText: {
    fontWeight: '600',
    color: wellness.primaryDark,
  },
  pressed: {
    opacity: 0.88,
  },
});
