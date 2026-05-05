import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createDiagnostic,
  generatePatientLevels,
} from '@/src/modules/diagnostics/diagnostic-service';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export function DiagnosticSummaryScreen() {
  const router = useRouter();
  const { patient } = usePatientSession();
  const { vim, attempt1, attempt2 } = useLocalSearchParams<{ vim?: string; attempt1?: string; attempt2?: string }>();
  const [saving, setSaving] = useState(false);
  const attemptOne = Math.max(0, Number(attempt1 ?? 0) || 0);
  const attemptTwo = Math.max(0, Number(attempt2 ?? 0) || 0);
  const vimNumber = Math.max(0, Number(vim ?? 0) || 0);

  const onContinue = async () => {
    if (!patient || saving) return;
    setSaving(true);
    try {
      const diagnostic = await createDiagnostic(patient.paciente_id, vimNumber);
      await generatePatientLevels(patient.paciente_id, diagnostic.diagnostic_id, vimNumber);
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar
        showBackButton
        backFallbackHref="/(tabs)/index"
        onPressProfile={() => router.push('/profile')}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Diagnóstico completado</Text>
        <Text style={styles.subtitle}>Resultados de tus 2 intentos de inspiración máxima.</Text>
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
            <Text style={styles.finalVimLabel}>VIM final</Text>
            <Text style={styles.finalVimValue}>{Math.round(vimNumber)} mL</Text>
          </View>
        </View>

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

        <Pressable style={styles.primaryBtn} onPress={onContinue} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryBtnText}>Continuar</Text>
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
