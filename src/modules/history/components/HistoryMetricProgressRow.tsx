/**
 * Purpose: Single metric row with optional progress track on the history screen.
 * Module: history
 */

import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';

export const HISTORY_EMPTY_METRIC_PLACEHOLDER = 'Tras tu primera sesión';

type Props = {
  label: string;
  valueText: string;
  progress: number;
  showTrack: boolean;
};

export function HistoryMetricProgressRow({ label, valueText, progress, showTrack }: Props) {
  const safeProgress = Math.max(0, Math.min(progress, 1));
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricRowHeader}>
        <AppText variant="bodyMedium" style={styles.metricLabel}>
          {label}
        </AppText>
        <AppText
          variant="bodySmall"
          style={[
            styles.metricValue,
            !showTrack && valueText === HISTORY_EMPTY_METRIC_PLACEHOLDER && styles.metricValueMuted,
          ]}>
          {valueText}
        </AppText>
      </View>
      {showTrack ? (
        <View style={styles.metricTrack}>
          <View style={[styles.metricFill, { width: `${safeProgress * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    marginBottom: spacing.md,
  },
  metricRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 8,
  },
  metricLabel: {
    flex: 1,
    fontWeight: '600',
    color: wellness.text,
  },
  metricValue: {
    fontWeight: '700',
    color: wellness.primaryDark,
    textAlign: 'right',
    flexShrink: 0,
    maxWidth: '58%',
  },
  metricValueMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  metricTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8EDEA',
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: wellness.primary,
  },
});
