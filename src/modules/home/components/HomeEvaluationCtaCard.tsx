/**
 * Purpose: Primary CTA card prompting initial evaluation on the home dashboard.
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

export function HomeEvaluationCtaCard({ onPress }: Props) {
  return (
    <AppCard variant="highlight" style={styles.primaryActionCard}>
      <AppText variant="titleLarge" style={styles.primaryActionTitle}>
        Conoce tu volumen de referencia
      </AppText>
      <AppText variant="bodyMedium" style={styles.primaryActionBody}>
        Realiza tu evaluación inicial para personalizar tus niveles.
      </AppText>
      <AppButton title="Comenzar evaluación" onPress={onPress} />
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
