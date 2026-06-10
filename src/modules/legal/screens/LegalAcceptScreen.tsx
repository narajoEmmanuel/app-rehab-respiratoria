/**
 * Purpose: Mandatory digital acceptance screen (document cards + single acceptance checkbox).
 * Module: legal
 */

import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AUTH_REGISTRATION_STEP_COUNT,
  AuthRegistrationHeader,
} from '@/src/modules/auth/components/AuthRegistrationHeader';
import {
  LEGAL_DOCUMENT_TITLE,
  LEGAL_DOCUMENT_VERSION,
  LEGAL_STATEMENT_IDS,
  type LegalStatementId,
} from '@/src/modules/legal/constants';
import { acceptConsent, needsConsent } from '@/src/modules/legal/consent-service';
import { showInfoAlert } from '@/src/shared/utils/cross-platform-dialogs';
import { LEGAL_DOCUMENT_HREF } from '@/src/modules/legal/legal-hrefs';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const TEXT_MUTED = '#6B7B86';

const CHECK_LABELS: readonly string[] = [
  'He leído y acepto los Términos y condiciones de uso.',
  'He leído y acepto el Consentimiento informado.',
  'He leído y autorizo el Aviso de privacidad.',
  'Acepto las condiciones y limitaciones descritas en el documento legal.',
  'Entiendo que la app no sustituye valoración ni tratamiento médico.',
  'Entiendo que los indicadores de la app son de apoyo y no mediciones clínicas definitivas.',
  'Entiendo que puedo retirar mi consentimiento en cualquier momento.',
];

const MASTER_CHECK_LABEL = 'He leído y acepto los términos y condiciones de uso.';

const DOCUMENT_BLOCKS = [{ id: 'terms', title: 'Términos y condiciones de uso' }] as const;

const BTN_GRADIENT_ACTIVE = ['#45BDB7', '#34ABA5', '#1F7E7A'] as const;
const BTN_GRADIENT_DISABLED = ['#9DD9D2', '#8BCEC6', '#7ABFB8'] as const;

function initialBoxes(): boolean[] {
  return CHECK_LABELS.map(() => false);
}

function LegalWellnessBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#FAFFFE', '#E8F8F6', '#D8F2EE', '#C8EBE6']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(52, 171, 165, 0.18)', 'rgba(69, 189, 183, 0.07)', 'transparent']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0.15 }}
        end={{ x: 0.95, y: 0.75 }}
        style={styles.leftRailWash}
      />
      <LinearGradient
        colors={['transparent', 'rgba(210, 245, 240, 0.35)', 'rgba(52, 171, 165, 0.14)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0.1 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomDepthWash}
      />
      <View style={[styles.blurOrb, styles.orbBottomLeft]} />
      <Svg
        width="100%"
        height={200}
        viewBox="0 0 400 200"
        style={styles.arcBottom}
        preserveAspectRatio="none">
        <Path
          d="M0,140 C100,90 220,120 320,85 C360,70 385,88 400,78 L400,200 L0,200 Z"
          fill="rgba(52, 171, 165, 0.1)"
        />
      </Svg>
    </View>
  );
}

function LegalAcceptContent({
  masterChecked,
  allChecked,
  busy,
  allowBack,
  onToggleMaster,
  onAccept,
  onOpenDocument,
  onBack,
  onGoLogin,
  onGoHome,
  hasPatient,
}: {
  masterChecked: boolean;
  allChecked: boolean;
  busy: boolean;
  allowBack: boolean;
  onToggleMaster: () => void;
  onAccept: () => void;
  onOpenDocument: () => void;
  onBack: () => void;
  onGoLogin: () => void;
  onGoHome: () => void;
  hasPatient: boolean;
}) {
  const canSubmit = allChecked && !busy && hasPatient;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LegalWellnessBackdrop />
      <AuthRegistrationHeader
        onBack={onBack}
        backAccessibilityLabel={allowBack ? 'Volver al inicio' : 'Volver'}
        step={{ current: 3, total: AUTH_REGISTRATION_STEP_COUNT }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {!hasPatient ? (
          <View style={styles.center}>
            <AppText variant="bodyLarge" style={styles.emptyBody}>
              Inicia sesión para continuar.
            </AppText>
            <Pressable
              style={({ pressed }) => [styles.btnPrimaryWrap, pressed && styles.pressed]}
              onPress={onGoLogin}
              accessibilityRole="button"
              accessibilityLabel="Ir al acceso">
              <LinearGradient
                colors={BTN_GRADIENT_ACTIVE}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnPrimaryGradient}>
                <AppText variant="button" style={styles.btnPrimaryText}>
                  Ir al acceso
                </AppText>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.titleBlock}>
              <AppText variant="titleLarge" style={styles.title}>
                Revisa y acepta
              </AppText>
              <AppText variant="bodyLarge" style={styles.subtitle}>
                Lee los documentos legales para continuar con tu registro.
              </AppText>
            </View>

            <View style={styles.legalContentBlock}>
              <View style={styles.documentsCard}>
                {DOCUMENT_BLOCKS.map((doc, index) => (
                  <View key={doc.id}>
                    <Pressable
                      style={({ pressed }) => [styles.docRow, pressed && styles.docRowPressed]}
                      onPress={onOpenDocument}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir ${doc.title}`}>
                      <View style={styles.docIconWrap}>
                        <IconSymbol
                          name="doc.text.fill"
                          size={20}
                          color={wellness.primaryDark}
                        />
                      </View>
                      <AppText variant="bodyLarge" style={styles.docTitle}>
                        {doc.title}
                      </AppText>
                      <IconSymbol name="chevron.right" size={18} color={wellnessColors.textMuted} />
                    </Pressable>
                    {index < DOCUMENT_BLOCKS.length - 1 ? <View style={styles.docDivider} /> : null}
                  </View>
                ))}
              </View>

              <View style={styles.masterCheckCard}>
                <Pressable
                  style={styles.checkRow}
                  onPress={onToggleMaster}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: masterChecked }}>
                  <View style={[styles.checkbox, masterChecked && styles.checkboxOn]}>
                    {masterChecked ? (
                      <AppText variant="chip" style={styles.checkMark}>
                        ✓
                      </AppText>
                    ) : null}
                  </View>
                  <AppText variant="bodyMedium" style={styles.checkLabel}>
                    {MASTER_CHECK_LABEL}
                  </AppText>
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimaryWrap,
                  !canSubmit && styles.btnPrimaryWrapDisabled,
                  pressed && canSubmit && styles.pressed,
                ]}
                onPress={onAccept}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Aceptar y continuar">
                <LinearGradient
                  colors={canSubmit ? BTN_GRADIENT_ACTIVE : BTN_GRADIENT_DISABLED}
                  locations={[0, 0.45, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnPrimaryGradient}>
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <AppText
                      variant="button"
                      style={[styles.btnPrimaryText, !canSubmit && styles.btnPrimaryTextDisabled]}>
                      Aceptar y continuar
                    </AppText>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {allowBack ? (
              <Pressable
                style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
                onPress={onGoHome}
                accessibilityRole="button"
                accessibilityLabel="Volver al inicio">
                <AppText variant="bodyLarge" style={styles.backLinkText}>
                  Volver al inicio
                </AppText>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function LegalAcceptScreen() {
  const router = useRouter();
  const { patient } = usePatientSession();
  const [boxes, setBoxes] = useState<boolean[]>(initialBoxes);
  const [busy, setBusy] = useState(false);
  const [allowBack, setAllowBack] = useState(false);

  const allChecked = boxes.length > 0 && boxes.every(Boolean);
  const masterChecked = allChecked;

  const setAllBoxes = useCallback((value: boolean) => {
    setBoxes(CHECK_LABELS.map(() => value));
  }, []);

  const toggleMaster = useCallback(() => {
    setAllBoxes(!masterChecked);
  }, [masterChecked, setAllBoxes]);

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
        showInfoAlert('Error', message);
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

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (allowBack) {
      router.replace('/(tabs)');
    }
  }, [allowBack, router]);

  return (
    <LegalAcceptContent
      masterChecked={masterChecked}
      allChecked={allChecked}
      busy={busy}
      allowBack={allowBack}
      onToggleMaster={toggleMaster}
      onAccept={onAccept}
      onOpenDocument={() => router.push(LEGAL_DOCUMENT_HREF)}
      onBack={patient ? handleBack : () => router.replace('/auth/login')}
      onGoLogin={() => router.replace('/auth/login')}
      onGoHome={() => router.replace('/(tabs)')}
      hasPatient={Boolean(patient)}
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#D8F2EE',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  leftRailWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '78%',
    height: '75%',
  },
  bottomDepthWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '78%',
  },
  blurOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbBottomLeft: {
    width: 240,
    height: 240,
    bottom: -60,
    left: -90,
    backgroundColor: 'rgba(52, 171, 165, 0.1)',
  },
  arcBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '32%',
  },
  titleBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 27,
    color: '#2A3439',
    textAlign: 'center',
    marginBottom: spacing.xs + 2,
    letterSpacing: -0.35,
  },
  subtitle: {
    color: TEXT_MUTED,
    textAlign: 'center',
    maxWidth: 320,
  },
  legalContentBlock: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  documentsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: wellnessRadii.cardLarge,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.18)',
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
    overflow: 'hidden',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    minHeight: 64,
  },
  docRowPressed: {
    backgroundColor: wellnessColors.primarySubtle,
  },
  docDivider: {
    height: 1,
    backgroundColor: 'rgba(52, 171, 165, 0.1)',
    marginLeft: spacing.md + 44 + spacing.md,
  },
  docIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: wellnessColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docTitle: {
    flex: 1,
    fontWeight: '600',
    color: '#2A3439',
  },
  masterCheckCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: 0,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.18)',
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(52, 171, 165, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  checkboxOn: {
    borderColor: wellness.primary,
    backgroundColor: wellnessColors.primarySubtle,
  },
  checkMark: {
    fontSize: 15,
    color: wellness.primaryDark,
  },
  checkLabel: {
    flex: 1,
    color: '#354656',
    fontWeight: '500',
  },
  btnPrimaryWrap: {
    marginTop: spacing.xl,
    borderRadius: wellnessRadii.pill,
    overflow: 'hidden',
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  btnPrimaryWrapDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPrimaryGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  btnPrimaryText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  btnPrimaryTextDisabled: {
    color: 'rgba(255, 255, 255, 0.92)',
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.xs,
  },
  backLinkText: {
    fontWeight: '600',
    color: wellness.primary,
    textDecorationLine: 'underline',
  },
  center: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyBody: {
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
