import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { previewDiagnosticLevelTargets } from '@/src/modules/diagnostics/diagnostic-service';
import {
  formatEvaluationVolumeMl,
  getLevelFactorLabel,
} from '@/src/modules/diagnostics/diagnostic-evaluation-display-utils';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';

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
      <AppText variant="titleSmall" style={styles.sectionTitle}>
        Niveles personalizados
      </AppText>
      <AppText variant="bodySmall" style={styles.sectionHint}>
        Metas de volumen según tu volumen de referencia actual.
      </AppText>
      {targets.map(({ levelNumber, targetVolumeMl }, index) => (
        <View key={levelNumber}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.row}>
            <AppText variant="statusValue" style={styles.levelLabel}>
              Nivel {levelNumber} · {getLevelFactorLabel(levelNumber)}
            </AppText>
            <AppText variant="metricSmall" style={styles.levelValue}>
              {formatEvaluationVolumeMl(targetVolumeMl)}
            </AppText>
          </View>
        </View>
      ))}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: wellnessColors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionHint: {
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
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    marginRight: spacing.sm,
  },
  levelValue: {
    color: wellnessColors.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: wellnessColors.border,
  },
});
