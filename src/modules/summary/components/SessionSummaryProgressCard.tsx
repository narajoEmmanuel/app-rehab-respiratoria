/**
 * Purpose: Session achievement progress card (headline, bar, valid count).
 * Module: summary
 */
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

export type SessionSummaryProgressCardProps = {
  progressHeadline: string;
  progressSupport: string | null;
  validAttempts: number;
  targetAttempts: number;
  progressRatio: number;
};

export function SessionSummaryProgressCard({
  progressHeadline,
  progressSupport,
  validAttempts,
  targetAttempts,
  progressRatio,
}: SessionSummaryProgressCardProps) {
  const fillWidth = `${Math.round(progressRatio * 100)}%` as DimensionValue;

  return (
    <View style={styles.card}>
      <AppText variant="titleSmall" style={styles.progressHeadline}>
        {progressHeadline}
      </AppText>
      {progressSupport ? (
        <AppText variant="bodySmall" style={styles.progressSupport}>
          {progressSupport}
        </AppText>
      ) : null}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: fillWidth }]} />
      </View>
      <AppText variant="chip" style={styles.progressMeta}>
        {validAttempts} repeticiones válidas de {targetAttempts}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellnessColors.card,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    ...wellnessShadows.soft,
  },
  progressHeadline: {
    fontSize: 17,
    fontWeight: '800',
    color: wellnessColors.primaryDark,
    letterSpacing: -0.2,
  },
  progressSupport: {
    marginTop: 4,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
  },
  progressTrack: {
    marginTop: spacing.md,
    height: 10,
    borderRadius: wellnessRadii.full,
    backgroundColor: wellnessColors.primarySoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: wellnessRadii.full,
    backgroundColor: wellnessColors.primary,
  },
  progressMeta: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
  },
});
