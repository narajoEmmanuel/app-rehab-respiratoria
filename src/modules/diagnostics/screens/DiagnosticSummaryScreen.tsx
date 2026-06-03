import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadActiveVolumeEstimationContext } from '@/src/modules/device/volume-estimation/volume-estimation-service';
import {
  isTouchPracticeDiagnostic,
  parseDiagnosticInputMode,
} from '@/src/modules/diagnostics/diagnostic-input-mode';
import { isDiagnosticHighPerformance } from '@/src/modules/diagnostics/diagnostic-performance-threshold';
import {
  persistOfficialDiagnosticResult,
  previewDiagnosticLevelTargets,
} from '@/src/modules/diagnostics/diagnostic-service';
import {
  INVALID_DIAGNOSTIC_VIM_MESSAGE,
  isValidOfficialDiagnosticVim,
} from '@/src/modules/diagnostics/diagnostic-vim-validation';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const LEVEL_FACTOR_LABELS: Record<number, string> = {
  1: '50%',
  2: '60%',
  3: '70%',
  4: '80%',
  5: '100%',
};

export function DiagnosticSummaryScreen() {
  const router = useRouter();
  const { patient } = usePatientSession();
  const { vim, attempt1, attempt2, attempt3, inputMode: inputModeParam } = useLocalSearchParams<{
    vim?: string;
    attempt1?: string;
    attempt2?: string;
    attempt3?: string;
    inputMode?: string;
  }>();
  const inputMode = useMemo(() => parseDiagnosticInputMode(inputModeParam), [inputModeParam]);
  const isTouchPractice = isTouchPracticeDiagnostic(inputMode);
  const [saving, setSaving] = useState(false);
  const [calibratedRangeMaxMl, setCalibratedRangeMaxMl] = useState<number | null>(null);

  useEffect(() => {
    if (isTouchPractice) {
      setCalibratedRangeMaxMl(null);
      return;
    }
    let active = true;
    void loadActiveVolumeEstimationContext().then((loaded) => {
      if (!active) return;
      const max = loaded.context.calibratedRangeMl?.max;
      setCalibratedRangeMaxMl(typeof max === 'number' && Number.isFinite(max) ? max : null);
    });
    return () => {
      active = false;
    };
  }, [isTouchPractice]);

  const attemptOne = Math.max(0, Number(attempt1 ?? 0) || 0);
  const attemptTwo = Math.max(0, Number(attempt2 ?? 0) || 0);
  const attemptThree = Math.max(0, Number(attempt3 ?? 0) || 0);
  const attemptMaxes = useMemo(
    () => [attemptOne, attemptTwo, attemptThree],
    [attemptOne, attemptThree, attemptTwo],
  );
  const vimNumber = Math.max(0, Number(vim ?? 0) || 0);
  const isOfficialResultValid = isValidOfficialDiagnosticVim(vimNumber, attemptMaxes);
  const levelTargets = useMemo(
    () => (vimNumber > 0 ? previewDiagnosticLevelTargets(vimNumber) : []),
    [vimNumber],
  );
  const showHighPerformance =
    !isTouchPractice &&
    isOfficialResultValid &&
    isDiagnosticHighPerformance(vimNumber, calibratedRangeMaxMl);

  const navigateToRepeatEvaluation = () => {
    router.replace({
      pathname: '/diagnostico',
      params: { inputMode: isTouchPractice ? 'touch_practice' : 'sensor' },
    });
  };

  const onContinueOfficial = async () => {
    if (!patient || saving || !isOfficialResultValid) return;
    setSaving(true);
    try {
      await persistOfficialDiagnosticResult(patient.paciente_id, vimNumber);
      router.replace('/(tabs)/terapia');
    } catch {
      Alert.alert('No se pudo guardar', INVALID_DIAGNOSTIC_VIM_MESSAGE, [
        { text: 'Repetir evaluación', onPress: navigateToRepeatEvaluation },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const onExitPractice = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar
        showBackButton
        backFallbackHref="/(tabs)/index"
        onPressProfile={() => router.push('/profile')}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>
          {isTouchPractice ? 'Práctica completada' : 'Evaluación completada'}
        </Text>
        <Text style={styles.subtitle}>
          {isTouchPractice
            ? 'Estos valores son simulados con el dedo. No se guardan como evaluación oficial.'
            : 'Resultados de tus 3 intentos de inspiración máxima.'}
        </Text>

        {!isTouchPractice && !isOfficialResultValid ? (
          <View style={styles.invalidBanner}>
            <Text style={styles.invalidBannerText}>{INVALID_DIAGNOSTIC_VIM_MESSAGE}</Text>
          </View>
        ) : null}

        {showHighPerformance ? (
          <View style={styles.achievementBanner}>
            <Text style={styles.achievementTitle}>Excelente rendimiento</Text>
            <Text style={styles.achievementText}>
              Alcanzaste un volumen muy alto dentro del rango calibrado.
            </Text>
            <Text style={styles.achievementText}>
              Puedes continuar con tu seguimiento respiratorio.
            </Text>
          </View>
        ) : null}

        {isTouchPractice ? (
          <View style={styles.practiceBanner}>
            <Text style={styles.practiceBannerTitle}>Modo práctica</Text>
            <Text style={styles.practiceBannerText}>
              No es una medición clínica. Tu evaluación oficial y niveles no se modifican.
            </Text>
          </View>
        ) : null}

        {!isTouchPractice ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Tu volumen de referencia se usará para personalizar tus niveles.
            </Text>
            <Text style={styles.infoText}>
              Este resultado no sustituye una valoración médica.
            </Text>
            <Text style={styles.infoText}>
              Puedes repetir la evaluación si crees que el sensor no registró correctamente.
            </Text>
          </View>
        ) : null}

        <View style={styles.resultsCard}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Intento 1</Text>
            <Text style={styles.resultValue}>{Math.round(attemptOne)} mL</Text>
          </View>
          <View style={styles.resultDivider} />
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Intento 2</Text>
            <Text style={styles.resultValue}>{Math.round(attemptTwo)} mL</Text>
          </View>
          <View style={styles.resultDivider} />
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Intento 3</Text>
            <Text style={styles.resultValue}>{Math.round(attemptThree)} mL</Text>
          </View>
          <View style={styles.finalVimWrap}>
            <Text style={styles.finalVimLabel}>
              Volumen de referencia {isTouchPractice ? '(simulado)' : ''}
            </Text>
            <Text style={styles.finalVimValue}>{Math.round(vimNumber)} mL</Text>
          </View>
        </View>

        {!isTouchPractice && isOfficialResultValid && levelTargets.length > 0 ? (
          <View style={styles.levelGoalsCard}>
            <Text style={styles.levelGoalsTitle}>Tus niveles se personalizarán así</Text>
            {levelTargets.map(({ levelNumber, targetVolumeMl }) => (
              <View key={levelNumber} style={styles.levelGoalRow}>
                <Text style={styles.levelGoalLabel}>
                  Nivel {levelNumber} · {LEVEL_FACTOR_LABELS[levelNumber]} del volumen de referencia
                </Text>
                <Text style={styles.levelGoalValue}>{targetVolumeMl} mL</Text>
              </View>
            ))}
          </View>
        ) : null}

        {!isTouchPractice && isOfficialResultValid ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={onContinueOfficial}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Continuar a terapia</Text>
            )}
          </Pressable>
        ) : null}

        {!isTouchPractice ? (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.secondaryBtnPressed,
              isOfficialResultValid && styles.secondaryBtnWithPrimary,
            ]}
            onPress={navigateToRepeatEvaluation}
            disabled={saving}>
            <Text style={styles.secondaryBtnText}>Repetir evaluación</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={onExitPractice} disabled={saving}>
            <Text style={styles.primaryBtnText}>Volver al inicio</Text>
          </Pressable>
        )}
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
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: wellness.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: wellness.textSecondary,
    marginBottom: spacing.md,
  },
  invalidBanner: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: 'rgba(180, 60, 60, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(180, 60, 60, 0.25)',
  },
  invalidBannerText: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.text,
    fontWeight: '600',
  },
  achievementBanner: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.35)',
  },
  achievementTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: wellness.primaryDark,
    marginBottom: 6,
  },
  achievementText: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.text,
    fontWeight: '500',
  },
  practiceBanner: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: 'rgba(61, 90, 74, 0.08)',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  practiceBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  practiceBannerText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: wellness.textSecondary,
  },
  infoCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.border,
    gap: spacing.xs,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.textSecondary,
  },
  resultsCard: {
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 16,
    color: wellness.textSecondary,
    fontWeight: '600',
  },
  resultValue: {
    fontSize: 24,
    fontWeight: '800',
    color: wellness.text,
  },
  resultDivider: {
    height: 1,
    backgroundColor: wellness.border,
    marginVertical: spacing.sm,
  },
  finalVimWrap: {
    marginTop: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    padding: spacing.md,
    alignItems: 'center',
  },
  finalVimLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: wellness.primaryDark,
    textTransform: 'uppercase',
  },
  finalVimValue: {
    marginTop: 4,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  levelGoalsCard: {
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  levelGoalsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: wellness.text,
    marginBottom: spacing.xs,
  },
  levelGoalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: wellness.border,
  },
  levelGoalLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: wellness.textSecondary,
    fontWeight: '600',
  },
  levelGoalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  primaryBtn: {
    marginTop: spacing.md,
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: spacing.md,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    backgroundColor: wellness.card,
  },
  secondaryBtnWithPrimary: {
    marginTop: spacing.sm,
  },
  secondaryBtnPressed: {
    opacity: 0.7,
  },
  secondaryBtnText: {
    color: wellness.primaryDark,
    fontSize: 16,
    fontWeight: '700',
  },
});
