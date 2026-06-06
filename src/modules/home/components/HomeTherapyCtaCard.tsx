/**
 * Purpose: Primary CTA card to start the suggested therapy level on the home dashboard.
 * Module: home
 */

import { StyleSheet } from 'react-native';

import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

type Props = {
  levelDisplayName: string;
  buttonTitle: string;
  onPress: () => void;
  disabled: boolean;
};

export function HomeTherapyCtaCard({
  levelDisplayName,
  buttonTitle,
  onPress,
  disabled,
}: Props) {
  return (
    <AppCard variant="highlight" style={styles.primaryActionCard}>
      <AppText variant="titleLarge" style={styles.primaryActionTitle}>
        Continúa tu terapia guiada
      </AppText>
      <AppText variant="bodyMedium" style={styles.primaryActionBody}>
        Nivel sugerido: {levelDisplayName}
      </AppText>
      <AppButton title={buttonTitle} onPress={onPress} disabled={disabled} />
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
