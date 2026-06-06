import { StyleSheet, View } from 'react-native';

import type { VimComparisonInsight } from '@/src/modules/diagnostics/diagnostic-evaluation-display-utils';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { AppText } from '@/src/shared/ui/AppText';

type EvaluationComparisonCardProps = {
  insight: VimComparisonInsight;
};

const toneStyles = {
  improved: {
    backgroundColor: 'rgba(52, 171, 165, 0.10)',
    borderColor: 'rgba(52, 171, 165, 0.28)',
    titleColor: wellnessColors.primaryDark,
  },
  stable: {
    backgroundColor: wellnessColors.neutralSoft,
    borderColor: wellnessColors.border,
    titleColor: wellnessColors.textPrimary,
  },
  decreased: {
    backgroundColor: wellnessColors.warningSoft,
    borderColor: 'rgba(245, 158, 11, 0.28)',
    titleColor: '#92400E',
  },
  initial: {
    backgroundColor: wellness.softGreen,
    borderColor: wellness.border,
    titleColor: wellnessColors.primaryDark,
  },
} as const;

export function EvaluationComparisonCard({ insight }: EvaluationComparisonCardProps) {
  const palette = toneStyles[insight.tone];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
      ]}
      accessibilityRole="summary">
      <AppText variant="titleSmall" style={[styles.title, { color: palette.titleColor }]}>
        {insight.title}
      </AppText>
      <AppText variant="bodyMedium" style={styles.detail}>
        {insight.detail}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    padding: spacing.md,
    ...wellnessShadows.soft,
  },
  title: {
    marginBottom: 6,
    lineHeight: 22,
  },
  detail: {
    fontWeight: '500',
    color: wellnessColors.textSecondary,
  },
});
