/**
 * Purpose: Basic profile hub placeholder for patient settings/navigation.
 * Module: patient
 * Dependencies: expo-router, patient session, wellness theme
 * Notes: Privacy/consent section wired to local legal module; other settings remain placeholders.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

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

  const consentStatusLabel =
    consentRecord == null
      ? 'Sin registro local'
      : consentRecord.consentStatus === 'active'
        ? 'Activo'
        : 'Retirado';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar onPressProfile={() => router.push('/profile')} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: wellnessFloatingTabBarInset + spacing.lg }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Espacio básico de cuenta del paciente.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos del paciente</Text>
          <Text style={styles.line}>Nombre: {patient?.nombre_completo ?? 'No disponible'}</Text>
          <Text style={styles.line}>Edad: {patient?.edad ?? '-'} años</Text>
          <Text style={styles.line}>Clave: {patient?.clave ?? 'No disponible'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resultados de diagnóstico</Text>
          <Text style={styles.line}>
            VIM actual: {latestDiagnostic ? `${latestDiagnostic.max_inspiratory_volume} mL` : 'No disponible'}
          </Text>
          <Text style={styles.line}>
            Fecha: {latestDiagnostic ? new Date(latestDiagnostic.diagnostic_date).toLocaleDateString() : '-'}
          </Text>
          <Text style={styles.line}>
            Diagnóstico número: {latestDiagnostic?.diagnostic_number ?? '-'}
          </Text>
        </View>

        <View style={styles.item}>
          <Text style={styles.itemTitle}>Privacidad, consentimiento y términos</Text>
          <Text style={styles.itemText}>
            Consulta el documento legal completo y revisa la versión aceptada en este dispositivo.
          </Text>
          <Text style={styles.lineSmall}>Versión aceptada: {consentRecord?.documentVersion ?? '—'}</Text>
          <Text style={styles.lineSmall}>
            Fecha de aceptación:{' '}
            {consentRecord?.acceptedAt ? new Date(consentRecord.acceptedAt).toLocaleString() : '—'}
          </Text>
          <Text style={styles.lineSmall}>Estado: {consentStatusLabel}</Text>
          {consentRecord?.withdrawnAt ? (
            <Text style={styles.lineSmall}>
              Fecha de retiro: {new Date(consentRecord.withdrawnAt).toLocaleString()}
            </Text>
          ) : null}

          <Pressable
            style={styles.linkRow}
            onPress={onOpenLegalPdf}
            accessibilityRole="button"
            accessibilityLabel="Abrir documento legal completo">
            <Text style={styles.linkText}>Abrir documento legal completo</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push(LEGAL_ACCEPT_HREF)}
            accessibilityRole="button"
            accessibilityLabel="Volver a aceptar documentos legales">
            <Text style={styles.secondaryBtnText}>Volver a aceptar</Text>
          </Pressable>

          {consentRecord?.consentStatus === 'active' ? (
            <Pressable
              style={styles.withdrawBtn}
              onPress={onWithdraw}
              accessibilityRole="button"
              accessibilityLabel="Retirar consentimiento">
              <Text style={styles.withdrawBtnText}>Retirar consentimiento</Text>
            </Pressable>
          ) : null}

          <Text style={styles.warningHint}>
            Retirar el consentimiento limita el uso del prototipo (Terapia, Plan, Historial y sensor) hasta una nueva
            aceptación en la app.
          </Text>
        </View>

        <View style={styles.item}>
          <Text style={styles.itemTitle}>Configuración</Text>
          <Text style={styles.itemText}>Opciones de cuenta y app (placeholder).</Text>
        </View>

        <Pressable
          style={styles.logoutBtn}
          onPress={async () => {
            await clearSession();
            router.replace('/auth/login');
          }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión">
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
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
    gap: spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: wellness.textSecondary,
  },
  card: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.primaryDark,
    marginBottom: spacing.xs,
  },
  line: {
    fontSize: 15,
    color: wellness.text,
  },
  lineSmall: {
    fontSize: 14,
    color: wellness.text,
    marginTop: spacing.xs,
  },
  item: {
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    gap: spacing.sm,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.text,
    marginBottom: spacing.xs,
  },
  itemText: {
    fontSize: 14,
    color: wellness.textSecondary,
    marginBottom: spacing.sm,
  },
  linkRow: {
    paddingVertical: spacing.sm,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
    color: wellness.primaryDark,
    textDecorationLine: 'underline',
  },
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  withdrawBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    backgroundColor: '#fff',
  },
  withdrawBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9a3b2f',
  },
  warningHint: {
    fontSize: 13,
    lineHeight: 20,
    color: wellness.textSecondary,
    marginTop: spacing.xs,
  },
  logoutBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: wellnessRadii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    backgroundColor: wellness.softGreen,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
});
