/**
 * Purpose: Today's progress metrics and daily goal bar on the home dashboard.
 * Module: home
 */

import { StyleSheet, View } from 'react-native';

import { AppCard } from '@/src/shared/ui/AppCard';
import { MetricTile } from '@/src/shared/ui/MetricTile';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';
import { spacing } from '@/src/shared/theme/spacing';

const ACCENT = wellnessColors.primary;

type Props = {
  todayCompletedSessions: number;
  weeklyCompleted: number;
};

export function HomeProgressTodayCard({ todayCompletedSessions, weeklyCompleted }: Props) {
  return (
    <AppCard style={styles.progressCardSpacing}>
      <View style={styles.weekMetricsRow}>
        <MetricTile
          label="Hoy"
          value={`${todayCompletedSessions}/6`}
          helper="meta diaria"
        />
        <MetricTile
          label="Esta semana"
          value={weeklyCompleted === 0 ? '0' : String(weeklyCompleted)}
          helper={`sesión${weeklyCompleted === 1 ? '' : 'es'} completada${weeklyCompleted === 1 ? '' : 's'}`}
        />
      </View>
      <View style={styles.progressTrackNoMargin}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(100, (todayCompletedSessions / 6) * 100)}%` },
          ]}
        />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  progressCardSpacing: {
    marginBottom: spacing.sm,
  },
  weekMetricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  progressTrackNoMargin: {
    height: 6,
    borderRadius: 4,
    backgroundColor: wellnessColors.neutralSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 4,
  },
});
