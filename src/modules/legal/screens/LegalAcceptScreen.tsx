/**
 * Purpose: Mandatory digital acceptance screen (checkboxes + open full PDF).
 * Module: legal
 */

import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  LEGAL_DOCUMENT_TITLE,
  LEGAL_DOCUMENT_VERSION,
  LEGAL_STATEMENT_IDS,
  type LegalStatementId,
} from '@/src/modules/legal/constants';
import { acceptConsent } from '@/src/modules/legal/consent-service';
import { openLegalDocument } from '@/src/modules/legal/open-legal-document';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const TITLE = 26;
const BODY = 17;
const LEAD = 16;

const CHECK_LABELS: readonly string[] = [
  'He leído y acepto los Términos y condiciones de uso.',
  'He leído y acepto el Consentimiento informado para uso o prueba del prototipo.',
  'He leído y autorizo el Aviso de privacidad.',
  'Entiendo que RESPIRA+ es un prototipo académico en etapa de desarrollo y validación preliminar.',
  'Entiendo que RESPIRA+ no sustituye atención médica, diagnóstico, tratamiento ni seguimiento profesional.',
  'Entiendo que los resultados son indicadores de apoyo y no mediciones clínicas definitivas.',
  'Entiendo que puedo retirar mi consentimiento en cualquier momento.',
];

function initialBoxes(): boolean[] {
  return CHECK_LABELS.map(() => false);
}

export function LegalAcceptScreen() {
  const router = useRouter();
  const { patient } = usePatientSession();
  const [boxes, setBoxes] = useState<boolean[]>(initialBoxes);
  const [busy, setBusy] = useState(false);

  const allChecked = boxes.length > 0 && boxes.every(Boolean);

  const toggle = useCallback((index: number) => {
    setBoxes((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, []);

  const onOpenDoc = useCallback(() => {
    void (async () => {
      try {
        await openLegalDocument();
      } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo abrir el documento.';
        Alert.alert('Documento', message);
      }
    })();
  }, []);

  const onAccept = useCallback(() => {
    if (!patient || !allChecked) return;
    void (async () => {
      setBusy(true);
      try {
        const acceptedStatements: LegalStatementId[] = LEGAL_STATEMENT_IDS.filter(
          (_id, i) => boxes[i] === true,
        ) as LegalStatementId[];
        await acceptConsent({
          userId: String(patient.paciente_id),
          acceptedTerms: boxes[0] === true,
          acceptedConsent: boxes[1] === true,
          acceptedPrivacy: boxes[2] === true,
          acceptedClinicalDisclaimer: boxes[3] === true && boxes[4] === true,
          acceptedSupportIndicatorsDisclaimer: boxes[5] === true,
          documentVersion: LEGAL_DOCUMENT_VERSION,
          documentTitle: LEGAL_DOCUMENT_TITLE,
          appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null,
          acceptedAt: new Date().toISOString(),
          consentStatus: 'active',
          acceptanceMethod: 'digital_in_app',
          acceptedStatements,
        });
        router.replace('/(tabs)');
      } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo guardar la aceptación.';
        Alert.alert('Error', message);
      } finally {
        setBusy(false);
      }
    })();
  }, [allChecked, boxes, patient, router]);

  if (!patient) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.body}>Inicia sesión para continuar.</Text>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.replace('/auth/login')}
            accessibilityRole="button">
            <Text style={styles.secondaryBtnText}>Ir al acceso</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: wellnessFloatingTabBarInset + spacing.lg }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Antes de comenzar</Text>
        <Text style={styles.lead}>
          RESPIRA+ es un prototipo académico para ejercicios respiratorios con espirómetro incentivador. No sustituye
          atención médica, diagnóstico, tratamiento ni seguimiento profesional.
        </Text>
        <Text style={styles.lead}>
          La app registra datos de desempeño respiratorio y uso del prototipo para apoyo al paciente y análisis del
          proyecto.
        </Text>

        <Pressable
          onPress={onOpenDoc}
          style={styles.docLink}
          accessibilityRole="button"
          accessibilityLabel="Abrir documento legal completo">
          <Text style={styles.docLinkText}>Ver documento legal completo (PDF)</Text>
        </Pressable>

        <View style={styles.card}>
          {CHECK_LABELS.map((label, i) => (
            <Pressable
              key={label}
              style={styles.checkRow}
              onPress={() => toggle(i)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: boxes[i] === true }}>
              <View style={[styles.checkbox, boxes[i] === true && styles.checkboxOn]}>
                {boxes[i] === true ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.checkLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.primaryBtn, (!allChecked || busy) && styles.primaryBtnDisabled]}
          onPress={onAccept}
          disabled={!allChecked || busy}
          accessibilityRole="button"
          accessibilityLabel="Aceptar y continuar">
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Aceptar y continuar</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wellness.screenBg },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  title: {
    fontSize: TITLE,
    fontWeight: '800',
    color: wellness.text,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  lead: {
    fontSize: BODY,
    lineHeight: 26,
    color: wellness.textSecondary,
    marginBottom: spacing.md,
  },
  docLink: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  docLinkText: {
    fontSize: LEAD,
    fontWeight: '700',
    color: wellness.primaryDark,
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellness.border,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
    ...wellnessShadows.card,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: wellness.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#fff',
  },
  checkboxOn: {
    borderColor: wellness.primary,
    backgroundColor: wellness.softGreen,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  checkLabel: {
    flex: 1,
    fontSize: LEAD,
    lineHeight: 22,
    color: wellness.text,
  },
  primaryBtn: {
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#ffffff', fontSize: BODY, fontWeight: '700' },
  body: { fontSize: BODY, color: wellness.textSecondary, marginBottom: spacing.md },
  secondaryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  secondaryBtnText: { fontSize: BODY, fontWeight: '700', color: wellness.primaryDark },
});
