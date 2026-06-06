/**
 * Purpose: Achievements section header and grid on the history screen.
 * Module: history
 */

import { StyleSheet, View } from 'react-native';

import {
  HistoryAchievementCompactCard,
  type HistoryProgressAchievement,
} from '@/src/modules/history/components/HistoryAchievementCompactCard';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';

type Props = {
  achievements: HistoryProgressAchievement[];
};

export function HistoryAchievementsSection({ achievements }: Props) {
  return (
    <>
      <AppText variant="titleMedium" style={styles.sectionTitle}>
        Logros
      </AppText>
      <AppText variant="bodySmall" style={styles.sectionSubtitle}>
        Desbloquéalos conforme avanzas en tu terapia.
      </AppText>
      <View style={styles.achievementGrid}>
        {achievements.map((a) => (
          <HistoryAchievementCompactCard key={a.id} item={a} />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: wellness.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: wellness.textSecondary,
    marginBottom: spacing.sm,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
