/**
 * Purpose: Patient profile hub — modern settings layout, avatar, consent, export, help.
 * Module: patient
 * Dependencies: expo-router, patient session, legal/export navigation (behavior unchanged).
 */
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLatestDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import { navigateToInitialEvaluation } from '@/src/modules/diagnostics/navigate-to-initial-evaluation';
import type { DiagnosticRecord } from '@/src/modules/diagnostics/types';
import {
  isConsentActive,
  withdrawConsent,
} from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF, LEGAL_DOCUMENT_HREF } from '@/src/modules/legal/legal-hrefs';
import { readNotificationSettingsForDisplay } from '@/src/modules/notifications/notification-settings.storage';
import { supportsNativeLocalNotifications } from '@/src/modules/notifications/notification-permissions';
import {
  profileReminderStatusHint,
  profileReminderStatusLabel,
  resolveProfileReminderStatus,
  type NotificationSettings,
  type ProfileReminderStatus,
} from '@/src/modules/notifications/notification-settings.types';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { DeletePatientConfirmModal } from '@/src/modules/patient/components/DeletePatientConfirmModal';
import { ProfileAvatarPicker } from '@/src/modules/patient/components/ProfileAvatarPicker';
import { ProfileInfoCard } from '@/src/modules/patient/components/ProfileInfoCard';
import { ProfileSection } from '@/src/modules/patient/components/ProfileSection';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { getCurrentPatient } from '@/src/modules/patient/patient-service';
import { LOCAL_PROFILE_HREF } from '@/src/modules/auth/local-profile-hrefs';
import { deleteCurrentPatientLocalData } from '@/src/modules/patient/patient-delete-service';
import { normalizePatientDisplayName } from '@/src/modules/patient/patient-display';
import {
  getProfilePreferences,
} from '@/src/modules/patient/storage/profile-preferences-repository';
import { readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { MetricTile } from '@/src/shared/ui/MetricTile';
import { spacing } from '@/src/shared/theme/spacing';
import { isTouchPracticeModeEnabled } from '@/src/modules/session/session-input-mode';
import { useTouchPracticePreference } from '@/src/modules/session/hooks/use-touch-practice-preference';
import {
  wellness,
  wellnessColors,
  wellnessFloatingTabBarInset,
  wellnessRadii,
} from '@/src/shared/theme/wellness-theme';
import { sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';
import {
  DEFAULT_PROFILE_PREFERENCES,
  type ProfilePreferences,
} from '@/src/modules/patient/types/profile-preferences';

function formatShortDateEs(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const now = new Date();
  const sameYear = dt.getFullYear() === now.getFullYear();
  return dt.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

type SessionQuickStats = {
  completedCount: number;
  avgCompliance: number | null;
  lastSessionDateLabel: string | null;
};

function planStatusLabel(hasDiagnostic: boolean): string {
  return hasDiagnostic ? 'Activo' : 'Pendiente';
}

function buildSessionQuickStats(sessions: SessionRecord[], patientId: number): SessionQuickStats {
  const relevant = sessions.filter(
    (s) => s.patient_id === patientId && s.completed && s.interrupted !== true,
  );
  const completedCount = relevant.length;
  const avgCompliance =
    completedCount === 0
      ? null
      : relevant.reduce((acc, s) => acc + s.compliance_percent, 0) / completedCount;
  const sorted = [...relevant].sort((a, b) => {
    const ta = Date.parse(a.session_date);
    const tb = Date.parse(b.session_date);
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && tb !== ta) {
      return tb - ta;
    }
    return b.session_id - a.session_id;
  });
  const last = sorted[0];
  const dayKey = last ? sessionRecordLocalDayKey(last.session_date) : null;
  const lastSessionDateLabel = dayKey ? formatShortDateEs(dayKey) : null;
  return { completedCount, avgCompliance, lastSessionDateLabel };
}

export function ProfileScreen() {
  const router = useRouter();
  const { patient, clearSession, refreshSession, setProfileAvatarUri } = usePatientSession();
  const [latestDiagnostic, setLatestDiagnostic] = useState<DiagnosticRecord | null>(null);
  const [consentActive, setConsentActive] = useState(false);
  const [prefs, setPrefs] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [notificationSettingsLoading, setNotificationSettingsLoading] = useState(false);
  const [sessionQuickStats, setSessionQuickStats] = useState<SessionQuickStats | null>(null);
  const isFocused = useIsFocused();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const touchPracticeFeatureEnabled = isTouchPracticeModeEnabled();
  const { setProfileTouchPracticeEnabled, reload: reloadTouchPracticePreference } =
    useTouchPracticePreference();

  const patientDisplayName = useMemo(
    () => (patient ? normalizePatientDisplayName(patient.nombre_completo) : ''),
    [patient],
  );

  const refreshConsent = useCallback(async () => {
    const active = await isConsentActive();
    setConsentActive(active);
  }, []);

  const resetProfileLocalState = useCallback(() => {
    setLatestDiagnostic(null);
    setSessionQuickStats(null);
    setPrefs(DEFAULT_PROFILE_PREFERENCES);
    setNotificationSettings(null);
    setNotificationSettingsLoading(false);
    setConsentActive(false);
  }, []);

  const reloadNotificationSettings = useCallback(async () => {
    const patientId = patient?.paciente_id;
    if (patientId == null) {
      setNotificationSettings(null);
      setNotificationSettingsLoading(false);
      return;
    }

    setNotificationSettingsLoading(true);
    try {
      const stored = await readNotificationSettingsForDisplay(String(patientId));
      setNotificationSettings(stored);
    } catch {
      setNotificationSettings(null);
    } finally {
      setNotificationSettingsLoading(false);
    }
  }, [patient?.paciente_id]);

  useEffect(() => {
    if (!isFocused) return;
    void reloadNotificationSettings();
  }, [isFocused, reloadNotificationSettings]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        await refreshSession();
        await refreshConsent();
        if (!active) return;
        const currentPatient = await getCurrentPatient();
        if (!currentPatient) {
          setLatestDiagnostic(null);
          setSessionQuickStats(null);
          setPrefs(DEFAULT_PROFILE_PREFERENCES);
          setNotificationSettings(null);
          return;
        }
        const [diagnostic, prefsResult, sessions] = await Promise.all([
          getLatestDiagnostic(currentPatient.paciente_id),
          getProfilePreferences(currentPatient.paciente_id),
          readAllSessions(),
        ]);
        if (!active) return;
        setLatestDiagnostic(diagnostic);
        setPrefs(prefsResult);
        setSessionQuickStats(buildSessionQuickStats(sessions, currentPatient.paciente_id));
        await reloadTouchPracticePreference();
      })();
      return () => {
        active = false;
      };
    }, [refreshConsent, refreshSession, reloadTouchPracticePreference]),
  );

  useEffect(() => {
    if (!patient) {
      resetProfileLocalState();
    }
  }, [patient?.paciente_id, patient?.clave, patient, resetProfileLocalState]);

  const onAvatarChange = useCallback(
    async (uri: string | null) => {
      if (!patient) return;
      await setProfileAvatarUri(uri);
      setPrefs((prev) => ({ ...prev, avatarUri: uri }));
    },
    [patient, setProfileAvatarUri],
  );

  const onTouchPracticeInputChange = useCallback(
    async (enabled: boolean) => {
      if (!patient) return;
      setPrefs((prev) => ({ ...prev, allowTouchPracticeInput: enabled }));
      await setProfileTouchPracticeEnabled(enabled);
    },
    [patient, setProfileTouchPracticeEnabled],
  );

  const onWithdraw = useCallback(() => {
    Alert.alert(
      'Retirar consentimiento',
      'Si continúas, no podrás usar Terapia, Historial ni la conexión del sensor hasta que vuelvas a aceptar los documentos en la app.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Retirar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await withdrawConsent();
              await refreshConsent();
            })();
          },
        },
      ],
    );
  }, [refreshConsent]);

  const onRequestDeleteProfile = useCallback(() => {
    Alert.alert(
      'Eliminar perfil del paciente',
      'Esta acción eliminará el perfil local, consentimiento, preferencias, notificaciones e historial de sesiones asociados a este paciente. La calibración del espirómetro se conservará.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => setDeleteModalVisible(true),
        },
      ],
    );
  }, []);

  const onConfirmDeleteProfile = useCallback(() => {
    void (async () => {
      setDeleteBusy(true);
      try {
        const result = await deleteCurrentPatientLocalData();
        setDeleteModalVisible(false);
        resetProfileLocalState();
        await clearSession();

        if (result.shouldSignOut && result.mode === 'local_first') {
          router.replace(LOCAL_PROFILE_HREF);
        } else {
          router.replace('/auth/login');
        }

        Alert.alert(
          'Perfil eliminado',
          'Tu perfil y datos asociados se eliminaron de este dispositivo. Para volver a usar la app, crea un perfil nuevo o accede con una clave existente.',
        );
      } catch {
        Alert.alert('Error', 'No se pudo eliminar el perfil. Inténtalo nuevamente.');
      } finally {
        setDeleteBusy(false);
      }
    })();
  }, [clearSession, resetProfileLocalState, router]);

  const metrics = sessionQuickStats ?? {
    completedCount: 0,
    avgCompliance: null,
    lastSessionDateLabel: null,
  };

  const hasEvaluation = latestDiagnostic != null;
  const nativeNotificationsSupported = supportsNativeLocalNotifications();
  const reminderStatus = resolveProfileReminderStatus(
    notificationSettings,
    nativeNotificationsSupported,
  );
  const remindersActive = reminderStatus === 'active';
  const reminderStatusPillTone = (status: ProfileReminderStatus | null) => {
    switch (status) {
      case 'active':
        return 'success' as const;
      case 'no_permission':
      case 'requires_review':
        return 'warning' as const;
      case 'web_only':
        return 'info' as const;
      default:
        return 'neutral' as const;
    }
  };
  const lastPracticeLabel =
    metrics.completedCount === 0 ? 'Sin registro' : (metrics.lastSessionDateLabel ?? 'Sin registro');
  const planLabel = planStatusLabel(hasEvaluation);

  if (!patient) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <AppTopBar showBackButton showProfileButton={false} />
        <View style={styles.emptyState}>
          <AppText variant="bodyLarge" style={styles.emptyText}>
            No hay sesión de paciente activa.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar showBackButton showProfileButton={false} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: wellnessFloatingTabBarInset + spacing.lg }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeaderCard}>
          <ProfileAvatarPicker
            patientId={patient.paciente_id}
            displayName={patientDisplayName}
            avatarUri={prefs.avatarUri}
            onAvatarUriChange={(uri) => void onAvatarChange(uri)}
            avatarSize={72}
            editButtonLabel="Editar perfil"
          />
          <AppText variant="titleSmall" style={styles.profileName}>
            {patientDisplayName}
          </AppText>
          <AppText variant="chip" style={styles.profileMeta}>
            Paciente {patient.clave} · {consentActive ? 'Activo' : 'Pendiente'}
          </AppText>
        </View>

        <ProfileSection title="Estado del paciente" subtitle="Resumen rápido de tu actividad.">
          <AppCard>
            <View style={styles.metricsRow}>
              <MetricTile
                label="Sesiones"
                value={String(metrics.completedCount)}
                size="compact"
                overrideBg={wellnessColors.primarySubtle}
                overrideAccent={wellnessColors.primaryDark}
              />
              <MetricTile
                label="Última práctica"
                value={lastPracticeLabel}
                size="compact"
                emphasis="status"
                valueNumberOfLines={2}
                overrideBg={wellnessColors.infoSoft}
                overrideAccent={wellnessColors.info}
              />
              <MetricTile
                label="Plan"
                value={planLabel}
                size="compact"
                emphasis="status"
                overrideBg={planLabel === 'Activo' ? wellnessColors.successSoft : wellnessColors.warningSoft}
                overrideAccent={planLabel === 'Activo' ? wellnessColors.success : '#92400E'}
              />
            </View>
          </AppCard>
        </ProfileSection>

        <ProfileSection title={hasEvaluation ? 'Evaluación inicial' : 'Evaluación inicial pendiente'}>
          {hasEvaluation ? (
            <AppCard variant="highlight" style={styles.evalCompleteCard}>
              <View style={styles.evalMainMetric}>
                <AppText variant="chip" style={styles.evalMainLabel}>
                  Volumen de referencia
                </AppText>
                <AppText variant="metricLarge" style={styles.evalMainValue}>
                  {`${latestDiagnostic.max_inspiratory_volume} mL`}
                </AppText>
              </View>
              <View style={styles.evalSecondaryRow}>
                <View style={styles.evalSecondaryItem}>
                  <AppText variant="chip" style={styles.evalSecondaryLabel}>
                    Fecha
                  </AppText>
                  <AppText variant="statusValue" style={styles.evalSecondaryValue}>
                    {new Date(latestDiagnostic.diagnostic_date).toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </AppText>
                </View>
                <View style={styles.evalSecondaryItem}>
                  <AppText variant="chip" style={styles.evalSecondaryLabel}>
                    Evaluación número
                  </AppText>
                  <AppText variant="statusValue" style={styles.evalSecondaryValue}>
                    {latestDiagnostic.diagnostic_number != null
                      ? String(latestDiagnostic.diagnostic_number)
                      : '—'}
                  </AppText>
                </View>
              </View>
              <View style={styles.cardAction}>
                <AppButton
                  title="Ver detalle"
                  variant="secondary"
                  onPress={() => router.push('/evaluacion-resumen' as Href)}
                />
              </View>
            </AppCard>
          ) : (
            <AppCard variant="soft" style={styles.evalPendingCard}>
              <View style={styles.evalPendingHeader}>
                <View style={styles.evalPendingIconWrap}>
                  <IconSymbol name="lungs.fill" size={18} color={wellnessColors.primaryDark} />
                </View>
                <AppText variant="bodySmall" style={styles.evalPendingBody}>
                  Establece tu volumen de referencia y personaliza tus niveles.
                </AppText>
              </View>
              <AppButton
                title="Realizar evaluación"
                variant="primary"
                onPress={() => navigateToInitialEvaluation(router)}
              />
            </AppCard>
          )}
        </ProfileSection>

        <ProfileSection title="Recordatorios de terapia">
          <AppCard style={styles.reminderCard}>
            <View style={styles.reminderStatusRow}>
              <AppText variant="titleSmall" style={styles.reminderStatusTitle}>
                {notificationSettingsLoading && notificationSettings == null
                  ? 'Cargando…'
                  : profileReminderStatusLabel(reminderStatus)}
              </AppText>
              {!notificationSettingsLoading && notificationSettings != null ? (
                <StatusPill
                  key={`reminder-${reminderStatus}-${notificationSettings.enabled}-${notificationSettings.permissionStatus}`}
                  label={profileReminderStatusLabel(reminderStatus)}
                  tone={reminderStatusPillTone(reminderStatus)}
                  size="sm"
                />
              ) : null}
            </View>
            <AppText
              variant="bodySmall"
              style={remindersActive ? styles.reminderSummary : styles.reminderHint}>
              {notificationSettingsLoading && notificationSettings == null
                ? 'Actualizando estado de recordatorios…'
                : profileReminderStatusHint(reminderStatus, notificationSettings)}
            </AppText>
            <View style={styles.cardAction}>
              <AppButton
                title={remindersActive ? 'Editar recordatorios' : 'Configurar recordatorios'}
                variant="secondary"
                onPress={() => router.push('/notification-settings' as Href)}
              />
            </View>
          </AppCard>
        </ProfileSection>

        <ProfileSection title="Información personal">
          <AppCard style={styles.compactCard}>
            <View style={styles.personalRows}>
              <View style={styles.personalItem}>
                <AppText variant="bodySmall" style={styles.personalLabel}>
                  Nombre
                </AppText>
                <AppText variant="bodySmall" style={styles.personalValue}>
                  {patientDisplayName}
                </AppText>
              </View>
              <View style={styles.personalDivider} />
              <View style={styles.personalItem}>
                <AppText variant="bodySmall" style={styles.personalLabel}>
                  Edad
                </AppText>
                <AppText variant="bodySmall" style={styles.personalValue}>
                  {patient.edad != null ? `${patient.edad} años` : '—'}
                </AppText>
              </View>
              <View style={styles.personalDivider} />
              <View style={styles.personalItem}>
                <AppText variant="bodySmall" style={styles.personalLabel}>
                  Clave del paciente
                </AppText>
                <AppText variant="bodySmall" style={styles.personalValue}>
                  {patient.clave}
                </AppText>
              </View>
            </View>
          </AppCard>
        </ProfileSection>

        <ProfileSection title="Privacidad y documentos">
          <AppCard style={styles.legalCard}>
            <AppText variant="statusValue" style={styles.privacyStatus}>
              {consentActive ? 'Consentimiento activo' : 'Consentimiento pendiente'}
            </AppText>
            <AppText variant="bodySmall" style={styles.consentHint}>
              {consentActive
                ? 'Puedes consultar los documentos cuando lo necesites.'
                : 'Necesitas revisar y aceptar los documentos para continuar con la terapia.'}
            </AppText>
            <View style={styles.consentActions}>
              <AppButton
                title="Ver documentos"
                variant="secondary"
                onPress={() => router.push(LEGAL_DOCUMENT_HREF)}
              />
              {!consentActive ? (
                <AppButton
                  title="Revisar y aceptar documentos"
                  variant="primary"
                  onPress={() => router.push(LEGAL_ACCEPT_HREF)}
                />
              ) : null}
            </View>
          </AppCard>
        </ProfileSection>

        {touchPracticeFeatureEnabled ? (
          <ProfileSection title="Opciones avanzadas">
            <AppCard style={styles.advancedCard}>
              <View style={styles.sessionPrefRow}>
                <View style={styles.sessionPrefCopy}>
                  <AppText variant="bodySmall" style={styles.sessionPrefTitle}>
                    Modo de práctica sin sensor
                  </AppText>
                  <AppText variant="chip" style={styles.sessionPrefBody}>
                    Practica la dinámica sin registrar mediciones del dispositivo.
                  </AppText>
                  <AppText variant="caption" style={styles.sessionPrefFootnote}>
                    No sustituye una sesión medida con sensor.
                  </AppText>
                </View>
                <Switch
                  accessibilityLabel="Modo de práctica sin sensor"
                  value={prefs.allowTouchPracticeInput}
                  onValueChange={(value) => void onTouchPracticeInputChange(value)}
                  trackColor={{ false: '#E5E7EB', true: 'rgba(52, 171, 165, 0.35)' }}
                  thumbColor={prefs.allowTouchPracticeInput ? wellness.primary : '#F3F4F6'}
                  ios_backgroundColor="#E5E7EB"
                />
              </View>
            </AppCard>
          </ProfileSection>
        ) : null}

        <ProfileSection title="Ayuda y seguridad">
          <AppCard style={styles.helpCard}>
            <View style={styles.helpRow}>
              <View style={styles.helpIconWrap}>
                <IconSymbol
                  name="exclamationmark.triangle.fill"
                  size={16}
                  color={wellnessColors.primaryDark}
                />
              </View>
              <View style={styles.helpCopy}>
                <AppText variant="bodySmall" style={styles.helpParagraph}>
                  Detén la sesión si presentas dolor, mareo, falta de aire intensa o malestar.
                </AppText>
                <AppText variant="chip" style={styles.helpParagraphSecondary}>
                  Consulta a un profesional de salud si tienes dudas.
                </AppText>
              </View>
            </View>
          </AppCard>
        </ProfileSection>

        <ProfileSection
          title="Acciones sensibles"
          subtitle="Estas acciones pueden limitar el acceso o eliminar datos locales.">
          <ProfileInfoCard>
            {consentActive ? (
              <Pressable
                style={({ pressed }) => [
                  styles.withdrawBtn,
                  pressed && styles.sensitiveActionBtnPressed,
                ]}
                onPress={onWithdraw}
                accessibilityRole="button"
                accessibilityLabel="Retirar consentimiento">
                <AppText variant="statusValue" style={styles.withdrawBtnText}>
                  Retirar consentimiento
                </AppText>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.deleteProfileBtn,
                deleteBusy && styles.deleteProfileBtnDisabled,
                pressed && !deleteBusy && styles.deleteProfileBtnPressed,
              ]}
              onPress={onRequestDeleteProfile}
              disabled={deleteBusy}
              accessibilityRole="button"
              accessibilityLabel="Eliminar perfil del paciente">
              {deleteBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <AppText variant="statusValue" style={styles.deleteProfileBtnText}>
                  Eliminar perfil del paciente
                </AppText>
              )}
            </Pressable>

            <View style={styles.sensitiveDivider} />

            <Pressable
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
              onPress={async () => {
                await clearSession();
                router.replace('/auth/login');
              }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión">
              <AppText variant="statusValue" style={styles.logoutText}>
                Cerrar sesión
              </AppText>
            </Pressable>
          </ProfileInfoCard>
        </ProfileSection>
      </ScrollView>

      <DeletePatientConfirmModal
        visible={deleteModalVisible}
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setDeleteModalVisible(false);
        }}
        onConfirm={onConfirmDeleteProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellnessColors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  profileHeaderCard: {
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.14)',
  },
  profileName: {
    fontSize: 20,
    color: wellnessColors.textPrimary,
    textAlign: 'center',
  },
  profileMeta: {
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  personalRows: {
    gap: 6,
  },
  personalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  personalDivider: {
    height: 1,
    backgroundColor: wellnessColors.neutralSoft,
  },
  personalLabel: {
    fontWeight: '500',
    color: wellnessColors.textSecondary,
  },
  personalValue: {
    fontWeight: '600',
    color: wellnessColors.textPrimary,
  },
  compactCard: {
    padding: spacing.md,
  },
  evalCompleteCard: {
    borderColor: 'rgba(52, 171, 165, 0.28)',
  },
  evalMainMetric: {
    backgroundColor: 'rgba(52, 171, 165, 0.08)',
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.18)',
    marginBottom: spacing.sm,
  },
  evalMainLabel: {
    fontWeight: '500',
    color: wellnessColors.textSecondary,
    marginBottom: 4,
  },
  evalMainValue: {
    fontSize: 32,
    letterSpacing: -0.4,
    color: wellnessColors.primaryDark,
  },
  evalSecondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  evalSecondaryItem: {
    flex: 1,
  },
  evalSecondaryLabel: {
    fontWeight: '500',
    color: wellnessColors.textMuted,
    marginBottom: 2,
  },
  evalSecondaryValue: {
    fontWeight: '600',
    color: wellnessColors.textPrimary,
  },
  evalPendingCard: {
    borderColor: 'rgba(52, 171, 165, 0.22)',
  },
  evalPendingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  evalPendingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  evalPendingBody: {
    flex: 1,
    color: wellnessColors.textSecondary,
  },
  cardAction: {
    marginTop: spacing.xs,
  },
  reminderCard: {
    backgroundColor: '#FFFBF5',
    borderColor: 'rgba(245, 158, 11, 0.16)',
  },
  reminderStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  reminderStatusTitle: {
    color: wellnessColors.textPrimary,
    flex: 1,
  },
  reminderSummary: {
    color: wellnessColors.textSecondary,
    marginBottom: spacing.sm,
  },
  reminderHint: {
    color: wellnessColors.textSecondary,
    marginBottom: spacing.sm,
  },
  legalCard: {
    backgroundColor: wellnessColors.card,
    borderColor: wellnessColors.border,
  },
  privacyStatus: {
    color: wellnessColors.primaryDark,
    marginBottom: spacing.xs,
  },
  consentHint: {
    color: wellnessColors.textSecondary,
    marginBottom: spacing.sm,
  },
  consentActions: {
    gap: spacing.sm,
  },
  advancedCard: {
    backgroundColor: wellnessColors.neutralSoft,
    borderColor: 'rgba(107, 114, 128, 0.14)',
    opacity: 0.96,
  },
  helpCard: {
    backgroundColor: wellnessColors.primarySubtle,
    borderColor: 'rgba(52, 171, 165, 0.12)',
    padding: spacing.md,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  helpIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(52, 171, 165, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  helpCopy: {
    flex: 1,
    gap: 4,
  },
  helpParagraph: {
    color: wellnessColors.textPrimary,
  },
  helpParagraphSecondary: {
    fontWeight: '400',
    lineHeight: 18,
    color: wellnessColors.textSecondary,
  },
  withdrawBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.28)',
    backgroundColor: '#FFFFFF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  withdrawBtnText: {
    fontWeight: '600',
    color: wellnessColors.danger,
  },
  deleteProfileBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellnessColors.danger,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  deleteProfileBtnPressed: {
    opacity: 0.9,
  },
  deleteProfileBtnDisabled: {
    opacity: 0.7,
  },
  deleteProfileBtnText: {
    color: '#FFFFFF',
  },
  sensitiveActionBtnPressed: {
    opacity: 0.88,
  },
  sensitiveDivider: {
    height: 1,
    backgroundColor: wellnessColors.neutralSoft,
    marginVertical: spacing.xs,
  },
  sessionPrefRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  sessionPrefCopy: {
    flex: 1,
    gap: 6,
  },
  sessionPrefTitle: {
    fontWeight: '600',
    color: wellnessColors.textPrimary,
  },
  sessionPrefBody: {
    fontWeight: '400',
    lineHeight: 18,
    color: wellnessColors.textSecondary,
  },
  sessionPrefFootnote: {
    fontWeight: '400',
    lineHeight: 16,
    color: wellnessColors.textMuted,
  },
  logoutBtn: {
    marginTop: 0,
    paddingVertical: spacing.sm + 2,
    borderRadius: wellnessRadii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.22)',
    backgroundColor: wellnessColors.primarySubtle,
  },
  logoutPressed: {
    opacity: 0.9,
  },
  logoutText: {
    fontWeight: '600',
    color: wellnessColors.primaryDark,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    color: wellnessColors.textSecondary,
    textAlign: 'center',
  },
});
