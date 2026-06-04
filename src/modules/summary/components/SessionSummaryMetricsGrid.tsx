/**
 * Purpose: Presentational metrics grid for session summary.
 * Module: summary
 */
import { StyleSheet, View } from 'react-native';

import { MetricTile } from '@/src/shared/ui/MetricTile';
import { spacing } from '@/src/shared/theme/spacing';

export type SessionSummaryMetricsGridProps = {
  validAttempts: number;
  invalidAttempts: number;
  maxVolume: number;
  avgVolume: number;
  maxHoldSeconds: number;
  avgHoldSeconds: number;
};

export function SessionSummaryMetricsGrid({
  validAttempts,
  invalidAttempts,
  maxVolume,
  avgVolume,
  maxHoldSeconds,
  avgHoldSeconds,
}: SessionSummaryMetricsGridProps) {
  return (
    <View style={styles.card}>
      <MetricTile label="Repeticiones válidas" value={String(validAttempts)} tone="success" />
      <MetricTile label="No completadas" value={String(invalidAttempts)} />
      <MetricTile label="Volumen máximo" value={`${maxVolume} mL`} />
      <MetricTile label="Volumen promedio" value={`${avgVolume} mL`} />
      <MetricTile label="Tiempo máx. sostenido" value={`${maxHoldSeconds.toFixed(1)} s`} />
      <MetricTile label="Tiempo prom. sostenido" value={`${avgHoldSeconds.toFixed(1)} s`} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
