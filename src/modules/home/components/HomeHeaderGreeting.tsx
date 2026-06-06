/**
 * Purpose: Patient greeting header on the home dashboard.
 * Module: home
 */

import { StyleSheet } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

type Props = {
  firstName: string;
};

export function HomeHeaderGreeting({ firstName }: Props) {
  return (
    <>
      <AppText variant="titleLarge" style={styles.greeting}>
        Hola, {firstName}
      </AppText>
      <AppText variant="bodyLarge" style={styles.tagline}>
        Tu resumen diario en RESPIRA+
      </AppText>
    </>
  );
}

const styles = StyleSheet.create({
  greeting: {
    color: wellnessColors.textPrimary,
    marginBottom: 2,
  },
  tagline: {
    color: wellnessColors.textSecondary,
    marginBottom: spacing.md,
  },
});
