/**
 * Purpose: Empty state for today's progress when no sessions are completed yet.
 * Module: home
 */

import { StyleSheet } from 'react-native';

import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

export function HomeProgressEmptyState() {
  return (
    <AppCard variant="soft" style={styles.progressCardSpacing}>
      <AppText variant="titleSmall" style={styles.emptyTitle}>
        Sin sesiones completadas hoy
      </AppText>
      <AppText variant="bodyMedium" style={styles.emptyBody}>
        Completa tu primera sesión para ver tu progreso.
      </AppText>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  progressCardSpacing: {
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    color: wellnessColors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    color: wellnessColors.textSecondary,
  },
});
