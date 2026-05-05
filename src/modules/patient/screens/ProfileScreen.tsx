/**
 * Purpose: Patient profile hub — modern settings layout, avatar, consent, export, help.
 * Module: patient
 * Dependencies: expo-router, patient session, legal/export navigation (behavior unchanged).
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
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
import { ProfileActionRow } from '@/src/modules/patient/components/ProfileActionRow';
import { ProfileAvatarPicker } from '@/src/modules/patient/components/ProfileAvatarPicker';
import { ProfileInfoCard } from '@/src/modules/patient/components/ProfileInfoCard';
import { ProfileSection } from '@/src/modules/patient/components/ProfileSection';
import {
  ProfileStatusBadge,
  type ProfileConsentBadgeVariant,
} from '@/src/modules/patient/components/ProfileStatusBadge';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import {
  getProfilePreferences,
  updateProfilePreferences,
} from '@/src/modules/patient/storage/profile-preferences-repository';
import { readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';
import { sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';
import {
  DEFAULT_PROFILE_PREFERENCES,
  type ProfilePreferences,
} from '@/src/modules/patient/types/profile-preferences';

const ACCENT = '#34aba5';

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

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const { patient, clearSession } = usePatientSession();
  const [latestDiagnostic, setLatestDiagnostic] = useState<DiagnosticRecord | null>(null);
  const [consentRecord, setConsentRecord] = useState<AcceptedConsentRecord | null>(null);
  const [prefs, setPrefs] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [sessionQuickStats, setSessionQuickStats] = useState<SessionQuickStats | null>(null);

  const refreshConsent = useCallback(async () => {
    const r = await getAcceptedConsentRecord();
    setConsentRecord(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        await refreshConsent();
        if (!active) return;
        if (!patient) {
          setLatestDiagnostic(null);
          setSessionQuickStats(null);
          setPrefs(DEFAULT_PROFILE_PREFERENCES);
          return;
        }
        const [diagnostic, prefsResult, sessions] = await Promise.all([
          getLatestDiagnostic(patient.paciente_id),
          getProfilePreferences(patient.paciente_id),
          readAllSessions(),
        ]);
        if (!active) return;
        setLatestDiagnostic(diagnostic);
        setPrefs(prefsResult);
        setSessionQuickStats(buildSessionQuickStats(sessions, patient.paciente_id));
      })();
      return () => {
        active = false;
      };
    }, [patient, refreshConsent]),
  );

  const onAvatarChange = useCallback(
    async (uri: string | null) => {
      if (!patient) return;
      const next = await updateProfilePreferences(patient.paciente_id, { avatarUri: uri });
      setPrefs(next);
    },
    [patient],
  );

  const onNotificationsToggle = useCallback(
    async (enabled: boolean) => {
      if (!patient) return;
      const next = await updateProfilePreferences(patient.paciente_id, { notificationsEnabled: enabled });
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
      'Si continúas, el uso del prototipo quedará limitado: no podrás usar Terapia, Historial ni la conexión del sensor hasta que vuelvas a aceptar en la app.',
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
            displayName={patient.nombre_completo}
            avatarUri={prefs.avatarUri}
            onAvatarUriChange={(uri) => void onAvatarChange(uri)}
          />
          <Text style={styles.profileName}>{patient.nombre_completo}</Text>
          <Text style={styles.profileMeta}>Clave · {patient.clave}</Text>
          <View style={styles.badgeRow}>
            <ProfileStatusBadge label={consentUi.badgeLabel} variant={consentUi.variant} />
          </View>
        </View>

        <ProfileSection
          title="Resumen"
          subtitle="Indicadores rápidos basados en sesiones completadas en este dispositivo.">
          <ProfileInfoCard>
            <View style={styles.metricsRow}>
              <MetricTile label="Sesiones" value={String(metrics.completedCount)} />
              <MetricTile
                label="Cumplimiento medio"
                value={metrics.avgCompliance != null ? `${Math.round(metrics.avgCompliance)}%` : '—'}
              />
              <MetricTile label="Última sesión" value={metrics.lastSessionDateLabel ?? '—'} />
            </View>
          </ProfileInfoCard>
        </ProfileSection>

        <ProfileSection title="Tu información">
          <ProfileInfoCard title="Identificación">
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <Text style={styles.fieldValue}>{patient.nombre_completo}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Edad</Text>
              <Text style={styles.fieldValue}>{patient.edad != null ? `${patient.edad} años` : '—'}</Text>
            </View>
          </ProfileInfoCard>
          <ProfileInfoCard title="Último diagnóstico registrado">
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>VIM</Text>
              <Text style={styles.fieldValue}>
                {latestDiagnostic ? `${latestDiagnostic.max_inspiratory_volume} mL` : 'No disponible'}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fecha</Text>
              <Text style={styles.fieldValue}>
                {latestDiagnostic ? new Date(latestDiagnostic.diagnostic_date).toLocaleDateString() : '—'}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Número de diagnóstico</Text>
              <Text style={styles.fieldValue}>
                {latestDiagnostic?.diagnostic_number != null ? String(latestDiagnostic.diagnostic_number) : '—'}
              </Text>
            </View>
          </ProfileInfoCard>
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
          title="Datos y exportación"
          subtitle="Genera JSON o CSV solo cuando tú lo decidas; no enviamos datos por correo ni nube.">
          <ProfileInfoCard>
            <Text style={styles.exportBody}>
              Los archivos pueden incluir datos personales y de salud. Trátalos con cuidado y compártelos solo si lo
              eliges tú.
            </Text>
            <ProfileActionRow
              label="Ir a datos y exportación"
              onPress={() => router.push('/data-export')}
              accessibilityLabel="Abrir datos y exportación"
              variant="primary"
            />
          </ProfileInfoCard>
        </ProfileSection>

        <ProfileSection
          title="Notificaciones"
          subtitle="Base preparada: aún no programamos recordatorios en el sistema.">
          <ProfileInfoCard>
            <View style={styles.notifRow}>
              <View style={styles.notifTextCol}>
                <Text style={styles.notifTitle}>Recordatorios</Text>
                <Text style={styles.notifHint}>
                  Activa esta preferencia para cuando habilitemos avisos locales. Estado: solo se guarda en el
                  dispositivo.
                </Text>
                <Text style={styles.comingSoon}>Próximamente</Text>
              </View>
              <Switch
                accessibilityLabel="Preferencia de recordatorios"
                value={prefs.notificationsEnabled}
                onValueChange={(v) => void onNotificationsToggle(v)}
                trackColor={{ false: '#E5E7EB', true: 'rgba(52, 171, 165, 0.35)' }}
                thumbColor={prefs.notificationsEnabled ? ACCENT : '#F3F4F6'}
                ios_backgroundColor="#E5E7EB"
              />
            </View>
            <View style={styles.reminderRow}>
              <Text style={styles.reminderLabel}>Hora preferida del recordatorio</Text>
              <View style={styles.comingPill}>
                <Text style={styles.comingPillText}>Próximamente</Text>
              </View>
            </View>
          </ProfileInfoCard>
        </ProfileSection>

        <ProfileSection title="Ayuda y soporte" subtitle="Uso responsable del prototipo.">
          <ProfileInfoCard>
            <Text style={styles.helpParagraph}>
              RESPIRA+ es un prototipo académico en desarrollo. No sustituye valoración médica ni tratamiento
              profesional.
            </Text>
            <Text style={styles.helpParagraph}>
              Si los síntomas empeoran o te preocupan, suspende el uso y consulta a un profesional de salud.
            </Text>
            <Text style={styles.helpEmphasis}>
              No uses esta app en emergencias. Ante una urgencia, busca atención médica inmediata.
            </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6F7F6',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
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
  badgeRow: {
    marginTop: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricTile: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
  withdrawOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: wellness.errorText,
  },
  exportBody: {
    fontSize: 14,
    lineHeight: 21,
    color: wellness.textSecondary,
    marginBottom: spacing.sm,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  notifTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  notifHint: {
    fontSize: 13,
    lineHeight: 18,
    color: wellness.textSecondary,
  },
  comingSoon: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reminderRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reminderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: wellness.text,
    flex: 1,
  },
  comingPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
  },
  comingPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT,
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
