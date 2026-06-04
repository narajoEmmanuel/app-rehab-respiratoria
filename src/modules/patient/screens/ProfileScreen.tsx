/**
 * Purpose: Patient profile hub — modern settings layout, avatar, consent, export, help.
 * Module: patient
 * Dependencies: expo-router, patient session, legal/export navigation (behavior unchanged).
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { getLatestDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import type { DiagnosticRecord } from '@/src/modules/diagnostics/types';
import {
  isConsentActive,
  withdrawConsent,
} from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF, LEGAL_DOCUMENT_HREF } from '@/src/modules/legal/legal-hrefs';
import { loadNotificationSettings } from '@/src/modules/notifications/notification-settings.storage';
import {
  formatProfileReminderSummary,
  type NotificationSettings,
} from '@/src/modules/notifications/notification-settings.types';
import { DeletePatientConfirmModal } from '@/src/modules/patient/components/DeletePatientConfirmModal';
import { ProfileActionRow } from '@/src/modules/patient/components/ProfileActionRow';
import { ProfileAvatarPicker } from '@/src/modules/patient/components/ProfileAvatarPicker';
import { ProfileInfoCard } from '@/src/modules/patient/components/ProfileInfoCard';
import { ProfileSection } from '@/src/modules/patient/components/ProfileSection';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { LOCAL_PROFILE_HREF } from '@/src/modules/auth/local-profile-hrefs';
import { deleteCurrentPatientLocalData } from '@/src/modules/patient/patient-delete-service';
import { normalizePatientDisplayName } from '@/src/modules/patient/patient-display';
import {
  getProfilePreferences,
  updateProfilePreferences,
} from '@/src/modules/patient/storage/profile-preferences-repository';
import { readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { StatusPill } from '@/src/shared/ui/StatusPill';
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

function sessionAvanceLabel(avgCompliance: number | null): string {
  if (avgCompliance == null) return '—';
  if (avgCompliance >= 85) return 'Buen avance';
  if (avgCompliance >= 50) return 'En camino';
  return 'Sigue practicando';
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
  const { patient, clearSession, refreshSession } = usePatientSession();
  const [latestDiagnostic, setLatestDiagnostic] = useState<DiagnosticRecord | null>(null);
  const [consentActive, setConsentActive] = useState(false);
  const [prefs, setPrefs] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [sessionQuickStats, setSessionQuickStats] = useState<SessionQuickStats | null>(null);
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
    setConsentActive(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        await refreshSession();
        await refreshConsent();
        if (!active) return;
        if (!patient) {
          setLatestDiagnostic(null);
          setSessionQuickStats(null);
          setPrefs(DEFAULT_PROFILE_PREFERENCES);
          setNotificationSettings(null);
          return;
        }
        const [diagnostic, prefsResult, sessions, notifSettingsResult] = await Promise.all([
          getLatestDiagnostic(patient.paciente_id),
          getProfilePreferences(patient.paciente_id),
          readAllSessions(),
          loadNotificationSettings(String(patient.paciente_id)),
        ]);
        if (!active) return;
        setLatestDiagnostic(diagnostic);
        setPrefs(prefsResult);
        setNotificationSettings(notifSettingsResult);
        setSessionQuickStats(buildSessionQuickStats(sessions, patient.paciente_id));
        await reloadTouchPracticePreference();
      })();
      return () => {
        active = false;
      };
    }, [patient, refreshConsent, refreshSession, reloadTouchPracticePreference]),
  );

  useEffect(() => {
    if (!patient) {
      resetProfileLocalState();
    }
  }, [patient?.paciente_id, patient?.clave, patient, resetProfileLocalState]);

  const onAvatarChange = useCallback(
    async (uri: string | null) => {
      if (!patient) return;
      const next = await updateProfilePreferences(patient.paciente_id, { avatarUri: uri });
      setPrefs(next);
    },
    [patient],
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

  if (!patient) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <AppTopBar showBackButton showProfileButton={false} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No hay sesión de paciente activa.</Text>
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
        <View style={styles.profileHeader}>
          <ProfileAvatarPicker
            patientId={patient.paciente_id}
            displayName={patientDisplayName}
            avatarUri={prefs.avatarUri}
            onAvatarUriChange={(uri) => void onAvatarChange(uri)}
          />
          <Text style={styles.profileName}>{patientDisplayName}</Text>
          <View style={styles.profileMetaRow}>
            <Text style={styles.profileMeta}>Clave {patient.clave}</Text>
            <View style={styles.profileMetaDot} />
            <StatusPill
              label={consentActive ? 'Activo' : 'Pendiente'}
              tone={consentActive ? 'success' : 'warning'}
              size="sm"
            />
          </View>
        </View>

        <ProfileSection
          title="Resumen"
          subtitle="Indicadores rápidos basados en sesiones completadas en este dispositivo.">
          <AppCard>
            <View style={styles.metricsRow}>
              <MetricTile label="Sesiones" value={String(metrics.completedCount)} size="compact" />
              <MetricTile
                label="Avance"
                value={sessionAvanceLabel(metrics.avgCompliance)}
                size="compact"
              />
              <MetricTile label="Última" value={metrics.lastSessionDateLabel ?? '—'} size="compact" emphasis="status" />
            </View>
          </AppCard>
        </ProfileSection>

        <ProfileSection title="Datos personales">
          <AppCard>
            <View style={styles.personalRow}>
              <View style={styles.personalItem}>
                <Text style={styles.personalLabel}>Nombre</Text>
                <Text style={styles.personalValue}>{patientDisplayName}</Text>
              </View>
              <View style={styles.personalDivider} />
              <View style={styles.personalItem}>
                <Text style={styles.personalLabel}>Edad</Text>
                <Text style={styles.personalValue}>{patient.edad != null ? `${patient.edad} años` : '—'}</Text>
              </View>
            </View>
          </AppCard>
        </ProfileSection>

        <ProfileSection title="Evaluación inicial">
          <AppCard variant="soft">
            <View style={styles.evalMainMetric}>
              <Text style={styles.evalMainLabel}>Volumen de referencia</Text>
              <Text style={styles.evalMainValue}>
                {latestDiagnostic ? `${latestDiagnostic.max_inspiratory_volume} mL` : '—'}
              </Text>
            </View>
            <View style={styles.evalSecondaryRow}>
              <View style={styles.evalSecondaryItem}>
                <Text style={styles.evalSecondaryLabel}>Fecha</Text>
                <Text style={styles.evalSecondaryValue}>
                  {latestDiagnostic
                    ? new Date(latestDiagnostic.diagnostic_date).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </Text>
              </View>
              <View style={styles.evalSecondaryItem}>
                <Text style={styles.evalSecondaryLabel}>Evaluación número</Text>
                <Text style={styles.evalSecondaryValue}>
                  {latestDiagnostic?.diagnostic_number != null
                    ? String(latestDiagnostic.diagnostic_number)
                    : '—'}
                </Text>
              </View>
            </View>
          </AppCard>
        </ProfileSection>

        <ProfileSection title="Documentos y consentimiento">
          <AppCard>
            <StatusPill
              label={consentActive ? 'Consentimiento activo' : 'Consentimiento pendiente'}
              tone={consentActive ? 'success' : 'warning'}
            />
            <Text style={styles.consentHint}>
              {consentActive
                ? 'Ya aceptaste los documentos requeridos. Puedes consultarlos nuevamente cuando lo necesites.'
                : 'Necesitas revisar y aceptar los documentos para continuar con la terapia.'}
            </Text>

            <View style={styles.consentActions}>
              <AppButton
                title="Leer documentos"
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

          {consentActive ? (
            <View style={styles.sensitiveCard}>
              <View style={styles.sensitiveHeader}>
                <IconSymbol name="exclamationmark.triangle.fill" size={16} color={wellnessColors.danger} />
                <Text style={styles.sensitiveTitle}>Zona delicada</Text>
              </View>
              <Text style={styles.sensitiveBody}>
                Retirar el consentimiento bloqueará Terapia, Historial y Sensor hasta que vuelvas a aceptarlo.
              </Text>
              <Text style={styles.sensitiveFootnote}>
                No elimina automáticamente archivos que ya hayas exportado.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.withdrawOutline, pressed && styles.withdrawOutlinePressed]}
                onPress={onWithdraw}
                accessibilityRole="button"
                accessibilityLabel="Retirar consentimiento">
                <Text style={styles.withdrawOutlineText}>Retirar consentimiento</Text>
              </Pressable>
            </View>
          ) : null}
        </ProfileSection>

        <ProfileSection
          title="Recordatorios"
          subtitle={
            notificationSettings == null ? undefined : formatProfileReminderSummary(notificationSettings)
          }>
          <ProfileInfoCard>
            <ProfileActionRow
              label="Configurar"
              onPress={() => router.push('/notification-settings' as Href)}
              accessibilityLabel="Abrir configuración de recordatorios"
              variant="neutral"
            />
          </ProfileInfoCard>
        </ProfileSection>

        {touchPracticeFeatureEnabled ? (
          <ProfileSection
            title="Preferencias de sesión"
            subtitle="Opciones avanzadas para practicar sin el dispositivo conectado.">
            <AppCard>
              <View style={styles.sessionPrefRow}>
                <View style={styles.sessionPrefCopy}>
                  <Text style={styles.sessionPrefTitle}>Entrada por pantalla</Text>
                  <Text style={styles.sessionPrefBody}>
                    Permite realizar sesiones sin sensor físico cuando el dispositivo no esté
                    conectado.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Entrada por pantalla"
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

        <ProfileSection title="Ayuda y soporte" subtitle="Contacto y uso de la app.">
          <ProfileInfoCard>
            <Text style={styles.helpParagraph}>
              Los términos, el consentimiento y el aviso de privacidad están en la sección de arriba.
            </Text>
            <Text style={styles.helpParagraph}>
              Ante síntomas graves o dudas sobre tu salud, consulta a un profesional o a urgencias.
            </Text>
          </ProfileInfoCard>
        </ProfileSection>

        <ProfileSection
          title="Zona delicada"
          subtitle="Acciones irreversibles sobre los datos locales de este paciente.">
          <ProfileInfoCard>
            <Text style={styles.deleteSectionTitle}>Eliminar perfil del paciente</Text>
            <Text style={styles.deleteSectionBody}>
              Eliminará los datos locales asociados a este paciente en este dispositivo.
            </Text>
            <Text style={styles.deleteSectionHint}>
              No elimina la calibración del espirómetro, el modelo activo ni la configuración técnica del
              sensor.
            </Text>
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
                <Text style={styles.deleteProfileBtnText}>Eliminar perfil del paciente</Text>
              )}
            </Pressable>
          </ProfileInfoCard>
        </ProfileSection>

        <ProfileSection title="Cuenta en este dispositivo">
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
            onPress={async () => {
              await clearSession();
              router.replace('/auth/login');
            }}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión">
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
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
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    textAlign: 'center',
  },
  profileMeta: {
    fontSize: 14,
    color: wellnessColors.textSecondary,
    fontWeight: '600',
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: wellnessColors.textMuted,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  personalRow: {
    gap: spacing.sm,
  },
  personalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personalDivider: {
    height: 1,
    backgroundColor: wellnessColors.neutralSoft,
  },
  personalLabel: {
    fontSize: 15,
    color: wellnessColors.textSecondary,
    fontWeight: '500',
  },
  personalValue: {
    fontSize: 15,
    color: wellnessColors.textPrimary,
    fontWeight: '600',
  },
  evalMainMetric: {
    backgroundColor: 'rgba(52, 171, 165, 0.05)',
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.12)',
    marginBottom: spacing.md,
  },
  evalMainLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: wellnessColors.textSecondary,
    marginBottom: 4,
  },
  evalMainValue: {
    fontSize: 28,
    fontWeight: '800',
    color: wellnessColors.primaryDark,
    letterSpacing: -0.3,
  },
  evalSecondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  evalSecondaryItem: {
    flex: 1,
  },
  evalSecondaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: wellnessColors.textMuted,
    marginBottom: 2,
  },
  evalSecondaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: wellnessColors.textPrimary,
  },
  consentHint: {
    fontSize: 14,
    lineHeight: 21,
    color: wellnessColors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  consentActions: {
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: wellnessColors.neutralSoft,
    marginVertical: spacing.xs,
  },
  sensitiveCard: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.18)',
    backgroundColor: wellnessColors.dangerSoft,
  },
  sensitiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  sensitiveTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: wellnessColors.danger,
  },
  sensitiveBody: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textPrimary,
    marginBottom: 4,
  },
  sensitiveFootnote: {
    fontSize: 12,
    lineHeight: 17,
    color: wellnessColors.textSecondary,
    marginBottom: spacing.sm,
  },
  withdrawOutline: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1.5,
    borderColor: wellnessColors.danger,
    backgroundColor: '#FFFFFF',
  },
  withdrawOutlinePressed: {
    opacity: 0.88,
  },
  deleteSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    marginBottom: spacing.xs,
  },
  deleteSectionBody: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textSecondary,
    marginBottom: spacing.sm,
  },
  deleteSectionHint: {
    fontSize: 13,
    lineHeight: 18,
    color: wellnessColors.textSecondary,
    marginBottom: spacing.md,
  },
  deleteProfileBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellnessColors.danger,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  deleteProfileBtnPressed: {
    opacity: 0.9,
  },
  deleteProfileBtnDisabled: {
    opacity: 0.7,
  },
  deleteProfileBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  withdrawOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: wellnessColors.danger,
  },
  notifStatusLine: {
    fontSize: 15,
    lineHeight: 22,
    color: wellnessColors.textSecondary,
    fontWeight: '600',
  },
  notifStatusEmphasis: {
    color: wellnessColors.primaryDark,
    fontWeight: '800',
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
    fontSize: 15,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
  },
  sessionPrefBody: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textSecondary,
  },
  helpParagraph: {
    fontSize: 14,
    lineHeight: 21,
    color: wellnessColors.textPrimary,
  },
  helpEmphasis: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: wellnessColors.danger,
    marginTop: spacing.sm,
  },
  logoutBtn: {
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellnessColors.border,
    backgroundColor: wellnessColors.card,
  },
  logoutPressed: {
    opacity: 0.9,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '700',
    color: wellnessColors.primaryDark,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: wellnessColors.textSecondary,
    textAlign: 'center',
  },
});
