import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { persistOfficialDiagnosticResult } from '@/src/modules/diagnostics/diagnostic-service';
import {
  isTouchPracticeDiagnostic,
  parseDiagnosticInputMode,
} from '@/src/modules/diagnostics/diagnostic-input-mode';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export function DiagnosticSummaryScreen() {
  const router = useRouter();
  const { patient } = usePatientSession();
  const { vim, attempt1, attempt2, inputMode: inputModeParam } = useLocalSearchParams<{
    vim?: string;
    attempt1?: string;
    attempt2?: string;
    inputMode?: string;
  }>();
  const inputMode = useMemo(() => parseDiagnosticInputMode(inputModeParam), [inputModeParam]);
  const isTouchPractice = isTouchPracticeDiagnostic(inputMode);
  const [saving, setSaving] = useState(false);
  const attemptOne = Math.max(0, Number(attempt1 ?? 0) || 0);
  const attemptTwo = Math.max(0, Number(attempt2 ?? 0) || 0);
  const vimNumber = Math.max(0, Number(vim ?? 0) || 0);

  const onContinueOfficial = async () => {
    if (!patient || saving) return;
    setSaving(true);
    try {
      await persistOfficialDiagnosticResult(patient.paciente_id, vimNumber);
      router.replace('/(tabs)');
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
          {isTouchPractice ? 'Práctica completada' : 'Diagnóstico completado'}
        </Text>
        <Text style={styles.subtitle}>
          {isTouchPractice
            ? 'Estos valores son simulados con el dedo. No se guardan como diagnóstico oficial.'
            : 'Resultados de tus 2 intentos de inspiración máxima.'}
        </Text>

        {isTouchPractice ? (
          <View style={styles.practiceBanner}>
            <Text style={styles.practiceBannerTitle}>Modo práctica</Text>
            <Text style={styles.practiceBannerText}>
              No es una medición clínica. Tu diagnóstico oficial y niveles no se modifican.
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
          <View style={styles.finalVimWrap}>
            <Text style={styles.finalVimLabel}>VIM {isTouchPractice ? 'simulado' : 'final'}</Text>
            <Text style={styles.finalVimValue}>{Math.round(vimNumber)} mL</Text>
          </View>
        </View>

        {!isTouchPractice ? (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.cell, styles.headerCell]}>Diagnóstico #</Text>
              <Text style={[styles.cell, styles.headerCell]}>Fecha</Text>
              <Text style={[styles.cell, styles.headerCell]}>VIM</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.cell}>Nuevo</Text>
              <Text style={styles.cell}>{new Date().toLocaleDateString()}</Text>
              <Text style={styles.cell}>{Math.round(vimNumber)} mL</Text>
            </View>
          </View>
        ) : null}

        <Pressable
          style={styles.primaryBtn}
          onPress={isTouchPractice ? onExitPractice : onContinueOfficial}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {isTouchPractice ? 'Volver al inicio' : 'Continuar'}
            </Text>
          )}
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
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
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
  tableCard: {
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: wellness.softGreen,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: wellness.border,
  },
  cell: {
    flex: 1,
    padding: spacing.sm,
    color: wellness.text,
    fontSize: 14,
    textAlign: 'center',
  },
  headerCell: {
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  primaryBtn: {
    marginTop: spacing.xl,
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
});
