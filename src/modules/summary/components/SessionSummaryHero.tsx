/**
 * Purpose: Presentational header for session summary (title, level, classification).
 * Module: summary
 */
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export type SessionSummaryHeroProps = {
  title: string;
  subtitle: string;
  levelLabel: string;
  classificationTitle: string;
  classificationNote: string | null;
  perfect: boolean;
  completed: boolean;
  interrupted?: boolean;
};

export function SessionSummaryHero({
  title,
  subtitle,
  levelLabel,
  classificationTitle,
  classificationNote,
}: SessionSummaryHeroProps) {
  return (
    <>
      <Text style={styles.screenTitle}>{title}</Text>
      <Text style={styles.screenSubtitle}>{subtitle}</Text>
      <Text style={styles.levelLine}>Nivel {levelLabel}</Text>
      <View style={styles.classificationBanner}>
        <Text style={styles.classificationTitle}>{classificationTitle}</Text>
        {classificationNote ? (
          <Text style={styles.classificationNote}>{classificationNote}</Text>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    color: wellnessColors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  screenSubtitle: {
    color: wellnessColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  levelLine: {
    color: wellnessColors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  classificationBanner: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellnessColors.successSoft,
    borderWidth: 1,
    borderColor: wellnessColors.border,
  },
  classificationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: wellnessColors.primaryDark,
  },
  classificationNote: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    lineHeight: 18,
  },
});
