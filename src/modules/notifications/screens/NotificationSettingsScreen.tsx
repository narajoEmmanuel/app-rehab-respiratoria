/**

 * Purpose: Configure local therapy reminders — simplified adherence layout.

 * Module: notifications

 */



import { useFocusEffect } from '@react-navigation/native';

import { useRouter } from 'expo-router';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

import {

  ActivityIndicator,

  Pressable,

  ScrollView,

  StyleSheet,

  Switch,

  Text,

  TextInput,

  View,

} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';



import { isConsentActive } from '@/src/modules/legal/consent-service';

import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';

import {
  describeWebLimitation,
  formatAwakeWindowScheduleMessage,
  FREQUENCY_FIXED_DESCRIPTION,
  TODAY_PREVIEW_DESCRIPTION,
  TODAY_PREVIEW_TITLE,
} from '@/src/modules/notifications/notification-copy';

import {
  ACTIVE_WINDOW_INVALID_MESSAGE,
  isReminderTimePassed,
} from '@/src/modules/notifications/notification-settings.types';

import { useNotificationSettings } from '@/src/modules/notifications/use-notification-settings';

import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';

import { AppTopBar } from '@/src/shared/ui/AppTopBar';

import { spacing } from '@/src/shared/theme/spacing';

import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';



const ACCENT = wellness.primary;



function Card({ children }: { children: ReactNode }) {

  return <View style={styles.card}>{children}</View>;

}



function CardTitle({ children }: { children: string }) {

  return <Text style={styles.cardTitle}>{children}</Text>;

}



function formatTimeDraftInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

type AwakeTimeFieldProps = {

  label: string;

  value: string;

  onChangeText: (value: string) => void;

  onCommit: () => void;

  disabled?: boolean;

};



function AwakeTimeField({ label, value, onChangeText, onCommit, disabled }: AwakeTimeFieldProps) {
  return (
    <View style={styles.timeField}>
      <Text style={styles.timeFieldLabel}>{label}</Text>
      <TextInput
        style={styles.timeInput}
        value={value}
        onChangeText={(text) => onChangeText(formatTimeDraftInput(text))}
        onBlur={onCommit}
        onSubmitEditing={onCommit}
        placeholder="HH:mm"
        keyboardType="number-pad"
        maxLength={5}
        editable={!disabled}
        accessibilityLabel={label}
      />
    </View>
  );
}



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

    previewDisplay,

    activeWindowInvalid,

    refresh,

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

      void refresh();

    }, [hydrated, loadConsent, refresh]),

  );



  const blockedByConsent = patient != null && consentOk === false;

  const controlsDisabled = busy || blockedByConsent;

  const scheduleDisabled = controlsDisabled || !settings?.enabled;



  const commitStartTime = useCallback(() => {

    if (!settings) return;

    void setActiveWindow(startDraft, settings.activeWindowEnd);

  }, [setActiveWindow, settings, startDraft]);



  const commitEndTime = useCallback(() => {

    if (!settings) return;

    void setActiveWindow(settings.activeWindowStart, endDraft);

  }, [endDraft, setActiveWindow, settings]);



  return (

    <SafeAreaView style={styles.safe} edges={['top']}>

      <AppTopBar

        showBackButton

        backFallbackHref="/profile"

        onPressProfile={() => router.push('/profile')}

      />

      <ScrollView

        contentContainerStyle={[styles.scroll, { paddingBottom: wellnessFloatingTabBarInset + spacing.xl }]}

        showsVerticalScrollIndicator={false}>

        <View style={styles.header}>

          <Text style={styles.title}>Recordatorios</Text>

          <Text style={styles.subtitle}>Configura cuándo quieres recibir tus sesiones</Text>

        </View>



        {!hydrated || (patient != null && (consentOk === null || loading)) ? (

          <View style={styles.centerRow}>

            <ActivityIndicator color={ACCENT} />

            <Text style={styles.muted}>Cargando…</Text>

          </View>

        ) : null}



        {patient == null ? <Text style={styles.note}>Inicia sesión para configurar.</Text> : null}



        {blockedByConsent ? (

          <Card>

            <Text style={styles.note}>Acepta los documentos legales para activar recordatorios.</Text>

            <Pressable

              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}

              onPress={() => router.push(LEGAL_ACCEPT_HREF)}

              accessibilityRole="button">

              <Text style={styles.linkBtnText}>Revisar documentos</Text>

            </Pressable>

          </Card>

        ) : null}



        {!nativeSupported ? <Text style={styles.note}>{describeWebLimitation()}</Text> : null}



        {patient && consentOk === true && settings != null ? (

          <>

            <Card>

              <View style={styles.toggleRow}>

                <Text style={styles.rowLabel}>Recordatorios</Text>

                <Switch

                  accessibilityLabel="Activar recordatorios"

                  value={settings.enabled}

                  onValueChange={(value) => void setEnabled(value)}

                  disabled={controlsDisabled}

                  trackColor={{ false: '#E5E7EB', true: 'rgba(52, 171, 165, 0.35)' }}

                  thumbColor={settings.enabled ? ACCENT : '#F3F4F6'}

                  ios_backgroundColor="#E5E7EB"

                />

              </View>

              <Text style={styles.statusText}>{settings.enabled ? 'Activos' : 'Inactivos'}</Text>

              {nativeSupported ? (

                <Pressable

                  onPress={() => void sendTestReminder()}

                  disabled={controlsDisabled}

                  style={({ pressed }) => [

                    styles.testBtn,

                    controlsDisabled && styles.disabled,

                    pressed && styles.pressed,

                  ]}

                  accessibilityRole="button"

                  accessibilityLabel="Enviar notificación de prueba">

                  <Text style={styles.testBtnText}>Enviar prueba</Text>

                </Pressable>

              ) : null}

            </Card>



            <Card>
              <View style={styles.frequencyHero}>
                <View style={styles.frequencyBadge}>
                  <Text style={styles.frequencyValue}>2</Text>
                  <Text style={styles.frequencyUnit}>h</Text>
                </View>
                <View style={styles.frequencyCopy}>
                  <Text style={styles.frequencyDescription}>{FREQUENCY_FIXED_DESCRIPTION}</Text>
                  <Text style={styles.recommendedInline}>Recomendado</Text>
                </View>
              </View>
            </Card>



            <Card>

              <CardTitle>Horario despierto</CardTitle>

              <Text style={styles.awakeHint}>Recibir recordatorios entre</Text>

              <View style={styles.customWindowRow}>

                <AwakeTimeField

                  label="Inicio"

                  value={startDraft}

                  onChangeText={setStartDraft}

                  onCommit={commitStartTime}

                  disabled={scheduleDisabled}

                />

                <Text style={styles.windowSeparator}>a</Text>

                <AwakeTimeField

                  label="Fin"

                  value={endDraft}

                  onChangeText={setEndDraft}

                  onCommit={commitEndTime}

                  disabled={scheduleDisabled}

                />

              </View>

              {activeWindowInvalid ? (
                <Text style={styles.windowError}>{ACTIVE_WINDOW_INVALID_MESSAGE}</Text>
              ) : (
                <View style={styles.windowConfirm}>
                  <Text style={styles.windowConfirmText}>
                    {formatAwakeWindowScheduleMessage(
                      settings.activeWindowStart,
                      settings.activeWindowEnd,
                      settings.enabled,
                    )}
                  </Text>
                </View>
              )}
            </Card>

            <Card>
              <View style={styles.previewHeader}>
                <View style={styles.previewHeaderCopy}>
                  <Text style={styles.previewTitle}>{TODAY_PREVIEW_TITLE}</Text>
                  <Text style={styles.previewExplainer}>{TODAY_PREVIEW_DESCRIPTION}</Text>
                </View>
                {previewDisplay.totalCount > 0 ? (
                  <View style={styles.previewCountBadge}>
                    <Text style={styles.previewCountBadgeValue}>{previewDisplay.totalCount}</Text>
                    <Text style={styles.previewCountBadgeLabel}>
                      {previewDisplay.totalCount === 1 ? 'aviso' : 'avisos'}
                    </Text>
                  </View>
                ) : null}
              </View>

              {previewDisplay.totalCount > 0 ? (
                <View style={styles.previewPanel}>
                  <View style={styles.previewTimeline}>
                    {previewDisplay.visibleTimes.map((time, index) => {
                      const passed = isReminderTimePassed(time);
                      const nextTime = previewDisplay.visibleTimes[index + 1];
                      const linePassed =
                        nextTime != null
                          ? isReminderTimePassed(nextTime)
                          : previewDisplay.remainingCount > 0
                            ? false
                            : passed;

                      return (
                      <View key={time} style={styles.previewTimelineItem}>
                        <View style={styles.previewTimelineRail}>
                          <View
                            style={[
                              styles.previewTimelineDot,
                              passed ? styles.previewTimelineDotPassed : styles.previewTimelineDotUpcoming,
                            ]}
                          />
                          {index < previewDisplay.visibleTimes.length - 1 ||
                          previewDisplay.remainingCount > 0 ? (
                            <View
                              style={[
                                styles.previewTimelineLine,
                                linePassed
                                  ? styles.previewTimelineLinePassed
                                  : styles.previewTimelineLineUpcoming,
                              ]}
                            />
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.previewTimeChip,
                            passed && styles.previewTimeChipPassed,
                          ]}>
                          <Text
                            style={[
                              styles.previewTimeChipText,
                              passed && styles.previewTimeChipTextPassed,
                            ]}>
                            {time}
                          </Text>
                        </View>
                      </View>
                      );
                    })}
                    {previewDisplay.remainingCount > 0 ? (
                      <View style={styles.previewTimelineItem}>
                        <View style={styles.previewTimelineRail}>
                          <View style={styles.previewTimelineDotMuted} />
                        </View>
                        <View style={styles.previewMoreChip}>
                          <Text style={styles.previewMoreText}>
                            +{previewDisplay.remainingCount} más
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View style={styles.previewEmpty}>
                  <Text style={styles.previewEmptyText}>
                    {activeWindowInvalid
                      ? 'Corrige el horario despierto para ver la vista previa.'
                      : 'Configura tu horario despierto para ver los avisos de hoy.'}
                  </Text>
                </View>
              )}
            </Card>
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

    fontSize: 15,

    color: wellness.textSecondary,

  },

  centerRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.sm,

    paddingVertical: spacing.lg,

  },

  muted: {

    fontSize: 14,

    color: wellness.textSecondary,

  },

  note: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.textSecondary,
  },
  card: {

    backgroundColor: wellness.card,

    borderRadius: wellnessRadii.card,

    borderWidth: StyleSheet.hairlineWidth,

    borderColor: wellness.border,

    padding: spacing.md,

    gap: spacing.sm,

  },

  cardTitle: {

    fontSize: 13,

    fontWeight: '600',

    color: wellness.textSecondary,

    textTransform: 'uppercase',

    letterSpacing: 0.5,

  },

  toggleRow: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    minHeight: 44,

  },

  rowLabel: {

    fontSize: 16,

    fontWeight: '500',

    color: wellness.text,

  },

  statusText: {

    fontSize: 14,

    color: wellness.textSecondary,

    marginTop: -spacing.xs,

  },

  testBtn: {

    alignSelf: 'flex-start',

    paddingVertical: 6,

    paddingHorizontal: spacing.sm,

    borderRadius: wellnessRadii.pill,

    borderWidth: 1,

    borderColor: wellness.border,

    backgroundColor: wellness.screenBg,

    marginTop: spacing.xs,

  },

  testBtnText: {

    fontSize: 13,

    fontWeight: '600',

    color: wellness.primaryDark,

  },

  frequencyHero: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.md,

  },

  frequencyBadge: {

    width: 72,

    height: 72,

    borderRadius: 36,

    backgroundColor: 'rgba(52, 171, 165, 0.14)',

    alignItems: 'center',

    justifyContent: 'center',

    flexDirection: 'row',

    gap: 2,

  },

  frequencyValue: {

    fontSize: 32,

    fontWeight: '700',

    color: wellness.primaryDark,

    lineHeight: 36,

  },

  frequencyUnit: {

    fontSize: 18,

    fontWeight: '700',

    color: wellness.primaryDark,

    marginTop: 8,

  },

  frequencyCopy: {
    flex: 1,
    gap: 6,
  },
  frequencyDescription: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    color: wellness.text,
  },
  recommendedInline: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F7E7A',
  },

  awakeHint: {

    fontSize: 14,

    color: wellness.textSecondary,

  },

  customWindowRow: {

    flexDirection: 'row',

    alignItems: 'flex-end',

    gap: spacing.sm,

  },

  timeField: {

    flex: 1,

    gap: 4,

  },

  timeFieldLabel: {

    fontSize: 13,

    fontWeight: '600',

    color: wellness.textSecondary,

  },

  timeInput: {

    height: 40,

    borderRadius: 10,

    borderWidth: 1,

    borderColor: wellness.border,

    backgroundColor: wellness.screenBg,

    paddingHorizontal: spacing.sm,

    fontSize: 16,

    fontWeight: '600',

    color: wellness.text,

    textAlign: 'center',

    fontVariant: ['tabular-nums'],

  },

  windowSeparator: {

    fontSize: 14,

    fontWeight: '600',

    color: wellness.textSecondary,

    paddingBottom: 10,

  },

  windowError: {
    fontSize: 13,
    lineHeight: 18,
    color: '#9A5248',
  },
  windowConfirm: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 171, 165, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.2)',
  },
  windowConfirmText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1F5E59',
    fontWeight: '500',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  previewHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.text,
  },
  previewExplainer: {
    fontSize: 13,
    lineHeight: 18,
    color: wellness.textSecondary,
  },
  previewCountBadge: {
    minWidth: 52,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 171, 165, 0.14)',
    alignItems: 'center',
  },
  previewCountBadgeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: wellness.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  previewCountBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F7E7A',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  previewPanel: {
    borderRadius: 14,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.border,
    padding: spacing.sm,
  },
  previewTimeline: {
    gap: 2,
  },
  previewTimelineItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  previewTimelineRail: {
    width: 16,
    alignItems: 'center',
  },
  previewTimelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 9,
  },
  previewTimelineDotPassed: {
    backgroundColor: ACCENT,
    borderWidth: 0,
  },
  previewTimelineDotUpcoming: {
    backgroundColor: wellness.card,
    borderWidth: 2,
    borderColor: 'rgba(52, 171, 165, 0.45)',
  },
  previewTimelineDotMuted: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C5CCC8',
    marginTop: 11,
  },
  previewTimelineLine: {
    flex: 1,
    width: 3,
    marginVertical: 2,
    borderRadius: 2,
  },
  previewTimelineLinePassed: {
    backgroundColor: ACCENT,
  },
  previewTimelineLineUpcoming: {
    backgroundColor: 'rgba(52, 171, 165, 0.18)',
  },
  previewTimeChip: {
    flex: 1,
    marginBottom: spacing.xs,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  previewTimeChipPassed: {
    backgroundColor: 'rgba(52, 171, 165, 0.08)',
    borderColor: 'rgba(52, 171, 165, 0.25)',
  },
  previewTimeChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: wellness.text,
    fontVariant: ['tabular-nums'],
  },
  previewTimeChipTextPassed: {
    color: wellness.textSecondary,
  },
  previewMoreChip: {
    flex: 1,
    marginBottom: spacing.xs,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: '#EEF2EF',
  },
  previewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  previewEmpty: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.border,
    borderStyle: 'dashed',
  },
  previewEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: wellness.textSecondary,
    textAlign: 'center',
  },

  linkBtn: {

    alignSelf: 'flex-start',

  },

  linkBtnText: {

    fontSize: 15,

    fontWeight: '600',

    color: wellness.primaryDark,

  },

  pressed: {

    opacity: 0.88,

  },

  disabled: {

    opacity: 0.4,

  },

});


