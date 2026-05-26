/**
 * Purpose: Patient profile hub — modern settings layout, avatar, consent, export, help.
 * Module: patient
 * Dependencies: expo-router, patient session, legal/export navigation (behavior unchanged).
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLatestDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import type { DiagnosticRecord } from '@/src/modules/diagnostics/types';
import { formatDisplayDateEs } from '@/src/modules/history/services/history-aggregates';
import {
  getAcceptedConsentRecord,
  withdrawConsent,
} from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { openLegalDocument } from '@/src/modules/legal/open-legal-document';
import type { AcceptedConsentRecord } from '@/src/modules/legal/types';
import { getNotificationPreferences } from '@/src/modules/notifications/storage/notification-preferences-repository';
import type { NotificationPreferences } from '@/src/modules/notifications/types/notification-preferences';
import { DeletePatientConfirmModal } from '@/src/modules/patient/components/DeletePatientConfirmModal';
import { ProfileActionRow } from '@/src/modules/patient/components/ProfileActionRow';
import { ProfileAvatarPicker } from '@/src/modules/patient/components/ProfileAvatarPicker';
import { ProfileInfoCard } from '@/src/modules/patient/components/ProfileInfoCard';
import { ProfileSection } from '@/src/modules/patient/components/ProfileSection';
import type { ProfileConsentBadgeVariant } from '@/src/modules/patient/components/ProfileStatusBadge';
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
import { AppCard } from '@/src/shared/ui/AppCard';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { MetricTile } from '@/src/shared/ui/MetricTile';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';
import { sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';
import {
  DEFAULT_PROFILE_PREFERENCES,
  type ProfilePreferences,
} from '@/src/modules/patient/types/profile-preferences';

type SessionQuickStats = {
  completedCount: number;
  avgCompliance: number | null;
  lastSessionDateLabel: string | null;
};

function consentPresentation(record: AcceptedConsentRecord | null): {
  variant: ProfileConsentBadgeVariant;
  badgeLabel: string;
} {
  if (record == null) {
    return { variant: 'unavailable', badgeLabel: 'No disponible' };
  }
  if (record.consentStatus === 'active') {
    return { variant: 'active', badgeLabel: 'Activo' };
  }
  return { variant: 'withdrawn', badgeLabel: 'Retirado' };
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
  const lastSessionDateLabel = dayKey ? formatDisplayDateEs(dayKey) : null;
  return { completedCount, avgCompliance, lastSessionDateLabel };
}

export function ProfileScreen() {
  const router = useRouter();
  const { patient, clearSession, refreshSession } = usePatientSession();
  const [latestDiagnostic, setLatestDiagnostic] = useState<DiagnosticRecord | null>(null);
  const [consentRecord, setConsentRecord] = useState<AcceptedConsentRecord | null>(null);
  const [prefs, setPrefs] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
  const [sessionQuickStats, setSessionQuickStats] = useState<SessionQuickStats | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const patientDisplayName = useMemo(
    () => (patient ? normalizePatientDisplayName(patient.nombre_completo) : ''),
    [patient],
  );

  const refreshConsent = useCallback(async () => {
    const r = await getAcceptedConsentRecord();
    setConsentRecord(r);
  }, []);

  const resetProfileLocalState = useCallback(() => {
    setLatestDiagnostic(null);
    setSessionQuickStats(null);
    setPrefs(DEFAULT_PROFILE_PREFERENCES);
    setNotificationPrefs(null);
    setConsentRecord(null);
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
          setNotificationPrefs(null);
          return;
        }
        const [diagnostic, prefsResult, sessions, notifPrefsResult] = await Promise.all([
          getLatestDiagnostic(patient.paciente_id),
          getProfilePreferences(patient.paciente_id),
          readAllSessions(),
          getNotificationPreferences(String(patient.paciente_id)),
        ]);
        if (!active) return;
        setLatestDiagnostic(diagnostic);
        setPrefs(prefsResult);
        setNotificationPrefs(notifPrefsResult);
        setSessionQuickStats(buildSessionQuickStats(sessions, patient.paciente_id));
      })();
      return () => {
        active = false;
      };
    }, [patient, refreshConsent, refreshSession]),
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

  const onOpenLegalPdf = useCallback(() => {
    void (async () => {
      try {
        await openLegalDocument();
      } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo abrir el documento.';
        Alert.alert('Documento', message);
      }
    })();
  }, []);

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

  const consentUi = useMemo(() => consentPresentation(consentRecord), [consentRecord]);

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
              label={consentUi.badgeLabel}
              tone={consentUi.variant === 'active' ? 'success' : consentUi.variant === 'withdrawn' ? 'danger' : 'neutral'}
              size="sm"
            />
          </View>
        </View>

        <ProfileSection
          title="Resumen"
          subtitle="Indicadores rápidos basados en sesiones completadas en este dispositivo.">
          <AppCard>
            <View style={styles.metricsRow}>
              <MetricTile label="Sesiones" value={String(metrics.completedCount)} />
              <MetricTile
                label="Cumplimiento"
                value={metrics.avgCompliance != null ? `${Math.round(metrics.avgCompliance)}%` : '—'}
              />
              <MetricTile label="Última sesión" value={metrics.lastSessionDateLabel ?? '—'} />
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

        <ProfileSection
          title="Privacidad, consentimiento y términos"
          subtitle="Estado legal en este dispositivo y acceso al documento PDF.">
          <ProfileInfoCard>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Versión aceptada</Text>
              <Text style={styles.fieldValue}>{consentRecord?.documentVersion ?? '—'}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fecha de aceptación</Text>
              <Text style={styles.fieldValue}>
                {consentRecord?.acceptedAt ? new Date(consentRecord.acceptedAt).toLocaleString() : '—'}
              </Text>
            </View>
            {consentRecord?.withdrawnAt ? (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Fecha de retiro</Text>
                <Text style={styles.fieldValue}>{new Date(consentRecord.withdrawnAt).toLocaleString()}</Text>
              </View>
            ) : null}

            <View style={styles.divider} />
            <ProfileActionRow
              label="Ver documento legal completo"
              onPress={onOpenLegalPdf}
              accessibilityLabel="Abrir documento legal completo"
              variant="link"
            />
            <View style={styles.divider} />
            <ProfileActionRow
              label="Volver a aceptar términos y consentimiento"
              onPress={() => router.push(LEGAL_ACCEPT_HREF)}
              accessibilityLabel="Volver a aceptar documentos legales"
              variant="primary"
            />

            {consentRecord?.consentStatus === 'active' ? (
              <View style={styles.sensitiveZone}>
                <Text style={styles.sensitiveTitle}>Zona delicada</Text>
                <Text style={styles.sensitiveText}>
                  Retirar el consentimiento limita Terapia, Historial y el sensor hasta que vuelvas a aceptar. No
                  elimina automáticamente archivos que ya hayas exportado.
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
          </ProfileInfoCard>
        </ProfileSection>

        <ProfileSection
          title="Notificaciones"
          subtitle="Recordatorios locales en tu dispositivo para la terapia respiratoria (sin mensajes push remotos).">
          <ProfileInfoCard>
            <Text style={styles.notifStatusLine}>
              Recordatorios de terapia:{' '}
              <Text style={styles.notifStatusEmphasis}>
                {notificationPrefs == null
                  ? '—'
                  : notificationPrefs.remindersEnabled
                    ? 'Activo'
                    : 'Inactivo'}
              </Text>
            </Text>
            <View style={styles.divider} />
            <ProfileActionRow
              label="Recordatorios de terapia"
              onPress={() => router.push('/notification-settings' as Href)}
              accessibilityLabel="Abrir configuración de recordatorios de terapia"
              variant="neutral"
            />
          </ProfileInfoCard>
        </ProfileSection>

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
    color: '#111827',
    textAlign: 'center',
  },
  profileMeta: {
    fontSize: 14,
    color: '#6B7280',
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
    backgroundColor: '#D1D5DB',
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
    backgroundColor: '#F3F4F6',
  },
  personalLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  personalValue: {
    fontSize: 15,
    color: '#111827',
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
    color: '#6B7280',
    marginBottom: 4,
  },
  evalMainValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F7A75',
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
    color: '#9CA3AF',
    marginBottom: 2,
  },
  evalSecondaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  field: {
    gap: spacing.xs / 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: wellness.textSecondary,
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 22,
    color: wellness.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: spacing.xs,
  },
  sensitiveZone: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: 'rgba(140, 58, 66, 0.35)',
    backgroundColor: wellness.errorBg,
    gap: spacing.sm,
  },
  sensitiveTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: wellness.errorText,
  },
  sensitiveText: {
    fontSize: 14,
    lineHeight: 21,
    color: wellness.text,
  },
  withdrawOutline: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1.5,
    borderColor: wellness.errorText,
    backgroundColor: '#FFFFFF',
  },
  withdrawOutlinePressed: {
    opacity: 0.92,
  },
  deleteSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: spacing.xs,
  },
  deleteSectionBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
    marginBottom: spacing.sm,
  },
  deleteSectionHint: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    marginBottom: spacing.md,
  },
  deleteProfileBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: wellnessRadii.pill,
    backgroundColor: '#B91C1C',
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
    color: wellness.errorText,
  },
  notifStatusLine: {
    fontSize: 15,
    lineHeight: 22,
    color: wellness.textSecondary,
    fontWeight: '600',
  },
  notifStatusEmphasis: {
    color: wellness.primaryDark,
    fontWeight: '800',
  },
  helpParagraph: {
    fontSize: 14,
    lineHeight: 21,
    color: wellness.text,
  },
  helpEmphasis: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: wellness.errorText,
    marginTop: spacing.sm,
  },
  logoutBtn: {
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  logoutPressed: {
    opacity: 0.9,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: wellness.textSecondary,
    textAlign: 'center',
  },
});
