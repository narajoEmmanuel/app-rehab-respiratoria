/**
 * Purpose: Compact 2-column metrics grid for session summary.
 * Module: summary
 */
import { StyleSheet, View } from 'react-native';

import { MetricTile } from '@/src/shared/ui/MetricTile';
import type { IconSymbolName } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

export type SessionSummaryMetricsGridProps = {
  validAttempts: number;
  invalidAttempts: number;
  maxVolume: number;
  avgVolume: number;
  maxHoldSeconds: number;
  avgHoldSeconds: number;
};

const METRIC_ACCENT = wellnessColors.primaryDark;
const METRIC_BG = wellnessColors.primarySubtle;

type MetricSpec = {
  label: string;
  value: string;
  iconName: IconSymbolName;
  tone?: 'default' | 'success' | 'warning';
};

export function SessionSummaryMetricsGrid({
  validAttempts,
  invalidAttempts,
  maxVolume,
  avgVolume,
  maxHoldSeconds,
  avgHoldSeconds,
}: SessionSummaryMetricsGridProps) {
  const metrics: MetricSpec[] = [
    {
      label: 'Repeticiones válidas',
      value: String(validAttempts),
      iconName: 'checkmark.seal.fill',
      tone: 'success',
    },
    {
      label: 'No completadas',
      value: String(invalidAttempts),
      iconName: 'xmark.circle.fill',
      tone: 'default',
    },
    {
      label: 'Volumen máximo',
      value: `${maxVolume} mL`,
      iconName: 'lungs.fill',
    },
    {
      label: 'Volumen promedio',
      value: `${avgVolume} mL`,
      iconName: 'chart.bar.fill',
    },
    {
      label: 'Tiempo máx. sostenido',
      value: `${maxHoldSeconds.toFixed(1)} s`,
      iconName: 'timer',
    },
    {
      label: 'Tiempo prom. sostenido',
      value: `${avgHoldSeconds.toFixed(1)} s`,
      iconName: 'timer',
    },
  ];

  return (
    <View style={styles.grid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.cell}>
          <MetricTile
            label={metric.label}
            value={metric.value}
            iconName={metric.iconName}
            size="compact"
            tone={metric.tone ?? 'default'}
            overrideAccent={metric.tone === 'success' ? undefined : METRIC_ACCENT}
            overrideBg={metric.tone === 'success' ? undefined : METRIC_BG}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  cell: {
    width: '48%',
    minWidth: '46%',
  },
});
