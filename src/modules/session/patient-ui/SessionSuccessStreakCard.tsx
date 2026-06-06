/**
 * Purpose: Compact streak achievement card for session summary (read-only streak).
 * Module: session / patient-ui
 */
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import {
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';
import { AppText } from '@/src/shared/ui/AppText';

export type SessionSuccessStreakCardProps = {
  currentStreak: number;
};

export function SessionSuccessStreakCard({ currentStreak }: SessionSuccessStreakCardProps) {
  if (currentStreak <= 0) return null;

  const title = currentStreak === 1 ? 'Racha iniciada' : 'Racha actual';
  const subtitle =
    currentStreak === 1
      ? '1 sesión exitosa'
      : `${currentStreak} sesiones exitosas seguidas`;

  return (
    <View style={styles.card} accessibilityRole="summary">
      <AppText
        variant="bodyMedium"
        style={styles.fire}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        🔥
      </AppText>
      <View style={styles.textCol}>
        <AppText variant="statusValue" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="bodySmall" style={styles.subtitle}>
          {subtitle}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellnessColors.primarySubtle,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    ...wellnessShadows.soft,
  },
  fire: {
    fontSize: 28,
    lineHeight: 32,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: wellnessColors.primaryDark,
    letterSpacing: -0.15,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    lineHeight: 18,
  },
});
