/**
 * Purpose: Presentational progress block for session summary (headline, bar, meta).
 * Module: summary
 */
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessRadii } from '@/src/shared/theme/wellness-theme';

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
  return (
    <View style={styles.progressBlock}>
      <Text style={styles.progressHeadline}>{progressHeadline}</Text>
      {progressSupport ? <Text style={styles.progressSupport}>{progressSupport}</Text> : null}
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${Math.round(progressRatio * 100)}%` }]}
        />
      </View>
      <Text style={styles.progressMeta}>
        {validAttempts} repeticiones válidas de {targetAttempts}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  progressBlock: {
    width: '100%',
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellnessColors.successSoft,
    borderWidth: 1,
    borderColor: wellnessColors.border,
  },
  progressHeadline: {
    fontSize: 17,
    fontWeight: '800',
    color: wellnessColors.primaryDark,
  },
  progressSupport: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    lineHeight: 20,
  },
  progressTrack: {
    marginTop: spacing.sm,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(61, 90, 74, 0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: wellnessColors.primary,
  },
  progressMeta: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
  },
});
