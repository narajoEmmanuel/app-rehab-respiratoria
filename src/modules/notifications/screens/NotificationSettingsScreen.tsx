/**
 * Purpose: Configure local daily therapy reminders (permissions, time, persistence).
 * Module: notifications
 */

import { useFocusEffect } from '@react-navigation/native';
import type { PermissionStatus } from 'expo-modules-core';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isConsentActive } from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  scheduleDailyTherapyReminder,
  cancelScheduledReminders,
  supportsScheduledLocalReminders,
} from '@/src/modules/notifications/services/notification-service';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/src/modules/notifications/storage/notification-preferences-repository';
import {
  REMINDER_TIME_OPTIONS,
  type NotificationPreferences,
} from '@/src/modules/notifications/types/notification-preferences';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const ACCENT = '#34aba5';

function permissionLabel(status: PermissionStatus | null): string {
  if (status == null) return 'Comprobando…';
  if (status === 'granted') return 'Activas en el dispositivo';
  if (status === 'denied') return 'No disponibles (rechazadas o desactivadas)';
  return 'Aún no solicitadas';
}

function describeWebLimitation(): string {
  return 'En la versión web del prototipo no se pueden programar recordatorios locales de la misma forma que en iPhone o Android. Usa la app en un dispositivo móvil para recibir avisos diarios.';
}

export function NotificationSettingsScreen() {
  const router = useRouter();
  const { patient, hydrated } = usePatientSession();
  const patientKey = patient ? String(patient.paciente_id) : '';

  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [consentOk, setConsentOk] = useState<boolean | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [draftTime, setDraftTime] = useState('09:00');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!patient) {
      setPrefs(null);
      setConsentOk(null);
      setPermissionStatus(null);
      setDraftEnabled(false);
      setDraftTime('09:00');
      return;
    }
    const [active, stored, perm] = await Promise.all([
      isConsentActive(),
      getNotificationPreferences(patientKey),
      supportsScheduledLocalReminders() ? getNotificationPermissionStatus() : Promise.resolve(null),
    ]);
    setConsentOk(active);
    setPrefs(stored);
    setDraftEnabled(stored.remindersEnabled);
    setDraftTime(stored.preferredReminderTime);
    setPermissionStatus(perm);
  }, [patient, patientKey]);

  useFocusEffect(
    useCallback(() => {
      if (!hydrated) return;
      void refresh();
    }, [hydrated, refresh]),
  );

  const onSave = useCallback(async () => {
    if (!patient || prefs == null) return;
    if (consentOk !== true) {
      Alert.alert('Consentimiento', 'Activa el consentimiento digital para poder usar recordatorios.');
      return;
    }

    if (!draftEnabled) {
      setBusy(true);
      try {
        if (supportsScheduledLocalReminders() && prefs.scheduledNotificationIds.length > 0) {
          await cancelScheduledReminders(prefs.scheduledNotificationIds);
        }
        const next = await updateNotificationPreferences(patientKey, {
          remindersEnabled: false,
          scheduledNotificationIds: [],
        });
        setPrefs(next);
        if (supportsScheduledLocalReminders()) {
          setPermissionStatus(await getNotificationPermissionStatus());
        }
        Alert.alert('Listo', 'Los recordatorios están desactivados.');
      } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo actualizar.';
        Alert.alert('Error', message);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!supportsScheduledLocalReminders()) {
      Alert.alert('Versión web', describeWebLimitation());
      return;
    }

    setBusy(true);
    try {
      const perm = await requestNotificationPermissions();
      setPermissionStatus(perm);
      if (perm !== 'granted') {
        Alert.alert(
          'Permisos',
          'Activa las notificaciones desde la configuración del dispositivo para recibir recordatorios.',
        );
        setBusy(false);
        return;
      }

      if (prefs.scheduledNotificationIds.length > 0) {
        await cancelScheduledReminders(prefs.scheduledNotificationIds);
      }

      const ids = await scheduleDailyTherapyReminder(draftTime);
      const next = await updateNotificationPreferences(patientKey, {
        remindersEnabled: true,
        preferredReminderTime: draftTime,
        reminderFrequency: 'daily',
        scheduledNotificationIds: ids,
      });
      setPrefs(next);
      Alert.alert('Listo', `Recordatorio diario guardado a las ${draftTime}.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo programar el recordatorio.';
      Alert.alert('Error', message);
    } finally {
      setBusy(false);
    }
  }, [consentOk, draftEnabled, draftTime, patient, patientKey, prefs]);

  const blockedByConsent = patient != null && consentOk === false;
  const webLimited = supportsScheduledLocalReminders() === false;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar
        showBackButton
        backFallbackHref="/profile"
        onPressProfile={() => router.push('/profile')}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: wellnessFloatingTabBarInset + spacing.lg }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Recordatorios</Text>
        <Text style={styles.lead}>
          Los recordatorios te ayudan a mantener la constancia con la terapia respiratoria. Solo usamos notificaciones
          locales en tu dispositivo: no enviamos avisos desde servidores ni usamos mensajes push remotos.
        </Text>

        {!hydrated || (patient != null && (consentOk === null || prefs === null)) ? (
          <View style={styles.centerRow}>
            <ActivityIndicator />
            <Text style={styles.muted}>Cargando preferencias…</Text>
          </View>
        ) : null}

        {patient == null ? <Text style={styles.warning}>Inicia sesión para configurar recordatorios.</Text> : null}

        {blockedByConsent ? (
          <View style={styles.blockCard}>
            <Text style={styles.blockTitle}>Configuración no disponible</Text>
            <Text style={styles.blockText}>
              El consentimiento digital no está activo. Revisa y acepta los documentos legales para poder activar
              recordatorios.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              onPress={() => router.push(LEGAL_ACCEPT_HREF)}
              accessibilityRole="button"
              accessibilityLabel="Revisar documentos legales">
              <Text style={styles.primaryBtnText}>Revisar documentos</Text>
            </Pressable>
          </View>
        ) : null}

        {webLimited ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Navegador web</Text>
            <Text style={styles.infoText}>{describeWebLimitation()}</Text>
          </View>
        ) : null}

        {patient && consentOk === true && prefs != null ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Notificaciones del sistema</Text>
              <Text style={styles.cardValue}>
                {webLimited ? 'No aplica en el navegador' : permissionLabel(permissionStatus)}
              </Text>
              {permissionStatus === 'denied' && supportsScheduledLocalReminders() ? (
                <Text style={styles.warnInline}>
                  Activa las notificaciones desde la configuración del dispositivo para recibir recordatorios.
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.switchTextCol}>
                  <Text style={styles.cardLabel}>Recordatorios diarios</Text>
                  <Text style={styles.hint}>Un aviso cada día a la hora que elijas.</Text>
                </View>
                <Switch
                  accessibilityLabel="Activar recordatorios diarios"
                  value={draftEnabled}
                  onValueChange={setDraftEnabled}
                  disabled={webLimited || blockedByConsent}
                  trackColor={{ false: '#E5E7EB', true: 'rgba(52, 171, 165, 0.35)' }}
                  thumbColor={draftEnabled ? ACCENT : '#F3F4F6'}
                  ios_backgroundColor="#E5E7EB"
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Hora preferida</Text>
              <Text style={styles.hint}>Elige una opción (formato 24 h).</Text>
              <View style={styles.timeGrid}>
                {REMINDER_TIME_OPTIONS.map((opt) => {
                  const selected = draftTime === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setDraftTime(opt)}
                      disabled={!draftEnabled || webLimited}
                      style={({ pressed }) => [
                        styles.timeChip,
                        selected && styles.timeChipSelected,
                        pressed && styles.timeChipPressed,
                        (!draftEnabled || webLimited) && styles.timeChipDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Hora ${opt}`}>
                      <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Frecuencia</Text>
              <Text style={styles.cardValue}>Diaria</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                (busy || blockedByConsent) && styles.btnDisabled,
                pressed && !busy && styles.btnPressed,
              ]}
              disabled={busy || blockedByConsent}
              onPress={() => void onSave()}
              accessibilityRole="button"
              accessibilityLabel="Guardar recordatorio">
              {busy ? (
                <ActivityIndicator color={wellness.primaryDark} />
              ) : (
                <Text style={styles.primaryBtnText}>Guardar recordatorio</Text>
              )}
            </Pressable>
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
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: wellness.textSecondary,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  muted: {
    fontSize: 14,
    color: wellness.textSecondary,
  },
  warning: {
    fontSize: 15,
    color: '#9a3b2f',
    fontWeight: '600',
  },
  blockCard: {
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    gap: spacing.sm,
  },
  blockTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.text,
  },
  blockText: {
    fontSize: 15,
    lineHeight: 22,
    color: wellness.textSecondary,
  },
  infoCard: {
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.35)',
    backgroundColor: 'rgba(52, 171, 165, 0.08)',
    gap: spacing.xs,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 21,
    color: wellness.text,
  },
  card: {
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    gap: spacing.sm,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: wellness.textSecondary,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: wellness.text,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.textSecondary,
  },
  warnInline: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9a3b2f',
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  timeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.screenBg,
  },
  timeChipSelected: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(52, 171, 165, 0.15)',
  },
  timeChipPressed: {
    opacity: 0.9,
  },
  timeChipDisabled: {
    opacity: 0.45,
  },
  timeChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: wellness.text,
  },
  timeChipTextSelected: {
    color: wellness.primaryDark,
  },
  primaryBtn: {
    paddingVertical: spacing.md,
    borderRadius: wellnessRadii.pill,
    alignItems: 'center',
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.92,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
});
