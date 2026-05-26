/**
 * Purpose: Mandatory digital acceptance screen (checkboxes + open full PDF).
 * Module: legal
 */

import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
import { acceptConsent, needsConsent } from '@/src/modules/legal/consent-service';
import { LEGAL_DOCUMENT_HREF } from '@/src/modules/legal/legal-hrefs';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessRadius } from '@/src/shared/theme/wellness-theme';

const CHECK_LABELS: readonly string[] = [
  'He leído y acepto los Términos y condiciones de uso.',
  'He leído y acepto el Consentimiento informado.',
  'He leído y autorizo el Aviso de privacidad.',
  'Acepto las condiciones y limitaciones descritas en el documento legal.',
  'Entiendo que la app no sustituye valoración ni tratamiento médico.',
  'Entiendo que los indicadores de la app son de apoyo y no mediciones clínicas definitivas.',
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
  const [allowBack, setAllowBack] = useState(false);

  const allChecked = boxes.length > 0 && boxes.every(Boolean);

  const toggle = useCallback((index: number) => {
    setBoxes((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const required = await needsConsent();
        if (active) setAllowBack(!required);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  if (!patient) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.body}>Inicia sesión para continuar.</Text>
          <AppButton
            title="Ir al acceso"
            onPress={() => router.replace('/auth/login')}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar
        showBackButton={allowBack}
        showProfileButton={false}
        backFallbackHref="/(tabs)/index"
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <SectionHeader
          title="Antes de comenzar"
          subtitle="Antes de continuar, revisa los documentos de uso, consentimiento y privacidad."
        />

        <AppButton
          title="Leer documentos"
          onPress={() => router.push(LEGAL_DOCUMENT_HREF)}
          variant="secondary"
          iconName="doc.text.fill"
          style={styles.docLink}
        />

        <AppCard style={styles.checksCard}>
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
        </AppCard>

        <AppButton
          title={busy ? '' : 'Aceptar y continuar'}
          onPress={onAccept}
          variant="primary"
          disabled={!allChecked || busy}
          style={styles.acceptBtn}
        />
        {busy ? (
          <View style={styles.busyOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wellnessColors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  body: {
    fontSize: 16,
    color: wellnessColors.textSecondary,
  },
  docLink: {
    marginBottom: spacing.md,
  },
  checksCard: {
    gap: 2,
    marginBottom: spacing.lg,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: wellnessColors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: wellnessColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: '#fff',
  },
  checkboxOn: {
    borderColor: wellnessColors.primary,
    backgroundColor: wellnessColors.primarySubtle,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '800',
    color: wellnessColors.primaryDark,
  },
  checkLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: wellnessColors.textPrimary,
  },
  acceptBtn: {
    marginTop: spacing.sm,
    borderRadius: wellnessRadius.md,
  },
  busyOverlay: {
    position: 'absolute',
    bottom: spacing.xl * 2 + spacing.sm + 14,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
