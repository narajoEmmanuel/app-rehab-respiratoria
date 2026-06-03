import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { previewDiagnosticLevelTargets } from '@/src/modules/diagnostics/diagnostic-service';
import {
  formatEvaluationVolumeMl,
  getLevelFactorLabel,
} from '@/src/modules/diagnostics/diagnostic-evaluation-display-utils';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';
import { AppCard } from '@/src/shared/ui/AppCard';

type EvaluationLevelTargetsCardProps = {
  referenceVolumeMl: number;
};

export function EvaluationLevelTargetsCard({ referenceVolumeMl }: EvaluationLevelTargetsCardProps) {
  const targets = useMemo(
    () => previewDiagnosticLevelTargets(referenceVolumeMl),
    [referenceVolumeMl],
  );

  if (targets.length === 0) return null;

  return (
    <AppCard>
      <Text style={styles.sectionTitle}>Niveles personalizados</Text>
      <Text style={styles.sectionHint}>
        Metas de volumen según tu volumen de referencia actual.
      </Text>
      {targets.map(({ levelNumber, targetVolumeMl }, index) => (
        <View key={levelNumber}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.row}>
            <Text style={styles.levelLabel}>
              Nivel {levelNumber} · {getLevelFactorLabel(levelNumber)}
            </Text>
            <Text style={styles.levelValue}>{formatEvaluationVolumeMl(targetVolumeMl)}</Text>
          </View>
        </View>
      ))}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: wellnessColors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textSecondary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  levelLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    marginRight: spacing.sm,
  },
  levelValue: {
    fontSize: 18,
    fontWeight: '800',
    color: wellnessColors.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: wellnessColors.border,
  },
});
