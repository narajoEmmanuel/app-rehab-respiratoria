/**
 * Purpose: Compact streak achievement card for session summary (read-only streak).
 * Module: session / patient-ui
 */
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import {
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

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
      <Text
        style={styles.fire}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        🔥
      </Text>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
