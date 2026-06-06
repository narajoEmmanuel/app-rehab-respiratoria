/**
 * Purpose: Primary CTA card shown when the daily therapy goal is met.
 * Module: home
 */

import { StyleSheet } from 'react-native';

import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

type Props = {
  onPress: () => void;
};

export function HomeDailyGoalCtaCard({ onPress }: Props) {
  return (
    <AppCard variant="highlight" style={styles.primaryActionCard}>
      <AppText variant="titleLarge" style={styles.primaryActionTitle}>
        Meta diaria completada
      </AppText>
      <AppText variant="bodyMedium" style={styles.primaryActionBody}>
        Revisa tu progreso en Historial.
      </AppText>
      <AppButton title="Ver historial" onPress={onPress} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  primaryActionCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  primaryActionTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: wellnessColors.textPrimary,
  },
  primaryActionBody: {
    color: wellnessColors.textSecondary,
  },
});
