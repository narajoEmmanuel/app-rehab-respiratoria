/**
 * Purpose: Patient-facing dashboard for the latest saved initial evaluation.
 * Module: diagnostics
 */

import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EvaluationAttemptsCard } from '@/src/modules/diagnostics/components/EvaluationAttemptsCard';
import { EvaluationComparisonCard } from '@/src/modules/diagnostics/components/EvaluationComparisonCard';
import { EvaluationLevelTargetsCard } from '@/src/modules/diagnostics/components/EvaluationLevelTargetsCard';
import {
  buildVimComparisonInsight,
  formatEvaluationDate,
  formatEvaluationVolumeMl,
} from '@/src/modules/diagnostics/diagnostic-evaluation-display-utils';
import {
  getLatestDiagnosticPair,
  type DiagnosticLatestPair,
} from '@/src/modules/diagnostics/diagnostic-service';
import { navigateToInitialEvaluation } from '@/src/modules/diagnostics/navigate-to-initial-evaluation';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { spacing } from '@/src/shared/theme/spacing';
import {
  appScreenBackground,
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';
import { dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';

export function InitialEvaluationSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patient, hydrated } = usePatientSession();
  const [loading, setLoading] = useState(true);
  const [pair, setPair] = useState<DiagnosticLatestPair | null>(null);
  const bottomPad = dashboardScrollBottomPadding(insets.bottom);

  const loadEvaluation = useCallback(async () => {
    if (!patient) {
      setPair(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const latestPair = await getLatestDiagnosticPair(patient.paciente_id);
    setPair(latestPair);
    setLoading(false);
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      void loadEvaluation();
    }, [loadEvaluation]),
  );

  const comparisonInsight = useMemo(() => {
    if (!pair) return null;
    return buildVimComparisonInsight(pair.current, pair.previous);
  }, [pair]);

  const goRepeatEvaluation = useCallback(() => {
    navigateToInitialEvaluation(router);
  }, [router]);

  const goStartEvaluation = useCallback(() => {
    navigateToInitialEvaluation(router);
  }, [router]);

  const goTherapy = useCallback(() => {
    router.push('/(tabs)/terapia');
  }, [router]);

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={wellnessColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar showBackButton backFallbackHref="/(tabs)/index" showProfileButton={false} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Resumen de evaluación</Text>
          <Text style={styles.subtitle}>Tu volumen de referencia y niveles personalizados.</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={wellnessColors.primary} style={styles.loader} />
        ) : !patient || !pair ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>Aún no hay una evaluación inicial registrada.</Text>
            <Text style={styles.emptyBody}>
              Realiza tu evaluación inicial para personalizar tus niveles de terapia.
            </Text>
            <AppButton title="Comenzar evaluación" onPress={goStartEvaluation} />
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Volumen de referencia</Text>
              <Text style={styles.heroValue}>
                {formatEvaluationVolumeMl(pair.current.max_inspiratory_volume)}
              </Text>
              <Text style={styles.heroDate}>
                Evaluación del {formatEvaluationDate(pair.current.diagnostic_date)}
              </Text>
              <Text style={styles.heroHint}>
                Este valor se usa para personalizar tus niveles.
              </Text>
            </View>

            {comparisonInsight ? (
              <EvaluationComparisonCard insight={comparisonInsight} />
            ) : null}

            <EvaluationAttemptsCard diagnostic={pair.current} />

            {pair.current.consistency_summary ? (
              <View style={styles.consistencyCard}>
                <Text style={styles.consistencyTitle}>
                  {pair.current.consistency_summary.display_label}
                </Text>
                <Text style={styles.consistencyBody}>
                  Indica qué tan parecidos fueron tus intentos durante la evaluación.
                </Text>
                {pair.current.consistency_summary.coefficient_of_variation_percent != null ? (
                  <Text style={styles.consistencyCv}>
                    CV:{' '}
                    {pair.current.consistency_summary.coefficient_of_variation_percent.toFixed(1)}%
                  </Text>
                ) : null}
              </View>
            ) : null}

            <EvaluationLevelTargetsCard referenceVolumeMl={pair.current.max_inspiratory_volume} />

            <Text style={styles.disclaimer}>
              Este resumen es una referencia para la app y no sustituye una valoración médica.
            </Text>

            <View style={styles.actions}>
              <AppButton title="Ir a terapia" onPress={goTherapy} />
              <AppButton
                title="Repetir evaluación"
                onPress={goRepeatEvaluation}
                variant="secondary"
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: appScreenBackground },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBlock: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: wellnessColors.textSecondary,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyBlock: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    lineHeight: 26,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: wellnessColors.textSecondary,
  },
  heroCard: {
    backgroundColor: wellnessColors.card,
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    padding: spacing.lg,
    alignItems: 'center',
    ...wellnessShadows.soft,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: wellnessColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  heroValue: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '800',
    color: wellnessColors.primaryDark,
    letterSpacing: -0.5,
  },
  heroDate: {
    marginTop: spacing.sm,
    fontSize: 15,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
  },
  heroHint: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textMuted,
    textAlign: 'center',
  },
  consistencyCard: {
    backgroundColor: wellnessColors.card,
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  consistencyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
  },
  consistencyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textSecondary,
  },
  consistencyCv: {
    fontSize: 12,
    color: wellnessColors.textMuted,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 17,
    color: wellnessColors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
