/**
 * Purpose: Patient profile hub — account, consent, legal, export, and help.
 * Module: patient
 * Dependencies: expo-router, patient session, wellness theme
 * Notes: Visual/layout only; consent and export behavior stay in domain services.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLatestDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import type { DiagnosticRecord } from '@/src/modules/diagnostics/types';
import {
  getAcceptedConsentRecord,
  withdrawConsent,
} from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { openLegalDocument } from '@/src/modules/legal/open-legal-document';
import type { AcceptedConsentRecord } from '@/src/modules/legal/types';
import { ProfileActionRow } from '@/src/modules/patient/components/ProfileActionRow';
import { ProfileInfoCard } from '@/src/modules/patient/components/ProfileInfoCard';
import { ProfileSection } from '@/src/modules/patient/components/ProfileSection';
import {
  ProfileStatusBadge,
  type ProfileConsentBadgeVariant,
} from '@/src/modules/patient/components/ProfileStatusBadge';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

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

export function ProfileScreen() {
  const router = useRouter();
  const { patient, clearSession } = usePatientSession();
  const [latestDiagnostic, setLatestDiagnostic] = useState<DiagnosticRecord | null>(null);
  const [consentRecord, setConsentRecord] = useState<AcceptedConsentRecord | null>(null);

  const refreshConsent = useCallback(async () => {
    const r = await getAcceptedConsentRecord();
    setConsentRecord(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshConsent();
    }, [refreshConsent]),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadDiagnostic = async () => {
        if (!patient) return;
        const diagnostic = await getLatestDiagnostic(patient.paciente_id);
        if (active) setLatestDiagnostic(diagnostic);
      };
      void loadDiagnostic();
      return () => {
        active = false;
      };
    }, [patient]),
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
      'Si continúas, el uso del prototipo quedará limitado: no podrás usar Terapia, Plan, Historial ni la conexión del sensor hasta que vuelvas a aceptar en la app.',
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar onPressProfile={() => router.push('/profile')} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: wellnessFloatingTabBarInset + spacing.lg }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Tu perfil</Text>
          <Text style={styles.heroSubtitle}>
            Consulta tu información, el estado del consentimiento y los accesos a documentos y exportación.
          </Text>
        </View>

        <ProfileSection
          title="Información del paciente"
          subtitle="Datos guardados en este dispositivo para tu sesión actual.">
          <ProfileInfoCard title="Identificación">
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre</Text>
              <Text style={styles.fieldValue}>{patient?.nombre_completo ?? '—'}</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Edad</Text>
              <Text style={styles.fieldValue}>
                {patient?.edad != null ? `${patient.edad} años` : '—'}
              </Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Clave</Text>
              <Text style={styles.fieldValue}>{patient?.clave ?? '—'}</Text>
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
          title="Estado del consentimiento"
          subtitle="Resumen del consentimiento digital en este dispositivo.">
          <ProfileInfoCard>
            <ProfileStatusBadge label={consentUi.badgeLabel} variant={consentUi.variant} />
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
                <Text style={styles.fieldValue}>
                  {new Date(consentRecord.withdrawnAt).toLocaleString()}
                </Text>
              </View>
            ) : null}
          </ProfileInfoCard>
        </ProfileSection>

        <ProfileSection
          title="Privacidad, consentimiento y términos"
          subtitle="Accede al PDF legal completo o renueva tu aceptación cuando lo necesites.">
          <ProfileInfoCard>
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
                <Text style={styles.sensitiveTitle}>Zona de acción delicada</Text>
                <Text style={styles.sensitiveText}>
                  Retirar el consentimiento limita Terapia, Plan, Historial y el sensor hasta que vuelvas a aceptar en la
                  app. Esta acción no elimina automáticamente los archivos que ya exportaste.
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
          subtitle="Tú decides cuándo generar un archivo; no enviamos datos por correo, nube ni mensajes.">
          <ProfileInfoCard>
            <Text style={styles.exportBody}>
              Puedes descargar o compartir tus sesiones guardadas como JSON o CSV. Esos formatos pueden incluir datos
              personales y de salud: trátalos con cuidado y compártelos solo si lo eliges tú. La exportación es siempre
              manual desde esta app.
            </Text>
            <ProfileActionRow
              label="Ir a datos y exportación"
              onPress={() => router.push('/data-export')}
              accessibilityLabel="Abrir datos y exportación"
              variant="primary"
            />
          </ProfileInfoCard>
        </ProfileSection>

        <ProfileSection title="Ayuda y soporte" subtitle="Uso responsable del prototipo.">
          <ProfileInfoCard>
            <Text style={styles.helpParagraph}>
              RESPIRA+ es un prototipo académico en desarrollo. No sustituye valoración médica ni tratamiento
              profesional.
            </Text>
            <Text style={styles.helpParagraph}>
              Si tienes síntomas preocupantes o empeoran, suspende el uso y consulta a un profesional de salud.
            </Text>
            <Text style={styles.helpEmphasis}>No uses esta app en emergencias. Ante una urgencia, busca atención médica inmediata.</Text>
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
    backgroundColor: wellness.screenBg,
    paddingBottom: wellnessFloatingTabBarInset,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: wellness.primaryDark,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: wellness.textSecondary,
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
    backgroundColor: wellness.border,
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
    fontSize: 13,
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
    backgroundColor: wellness.card,
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
    borderRadius: wellnessRadii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    backgroundColor: wellness.softGreen,
  },
  logoutPressed: {
    opacity: 0.9,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
});
