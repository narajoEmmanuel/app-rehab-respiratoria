import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { VOLUME_OVER_RANGE_HELPER } from '@/src/modules/device/calibration/calibration-display-utils';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessShadows } from '@/src/shared/theme/wellness-theme';

export type MeasuredVolumeHeroProps = {
  volumeMl: number | null;
  loading?: boolean;
  subtitle?: string;
  label?: string;
  overRange?: boolean;
};

function formatVolumeMl(volumeMl: number | null): string {
  if (volumeMl === null || !Number.isFinite(volumeMl)) return '—';
  return `${Math.round(volumeMl)}`;
}

export function MeasuredVolumeHero({
  volumeMl,
  loading = false,
  subtitle,
  label = 'Volumen medido',
  overRange = false,
}: MeasuredVolumeHeroProps) {
  const resolvedSubtitle =
    subtitle ??
    (overRange
      ? VOLUME_OVER_RANGE_HELPER
      : 'Lectura estimada a partir del sensor RESPIRA+');

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {loading ? (
        <ActivityIndicator color={wellnessColors.primary} style={styles.loader} />
      ) : (
        <View style={styles.valueRow}>
          <Text style={styles.value}>{formatVolumeMl(volumeMl)}</Text>
          <Text style={styles.unit}>mL</Text>
        </View>
      )}
      {resolvedSubtitle ? <Text style={styles.subtitle}>{resolvedSubtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    backgroundColor: wellnessColors.card,
    borderRadius: 20,
    ...wellnessShadows.card,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: wellnessColors.textSecondary,
    letterSpacing: 0.2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  value: {
    fontSize: 56,
    fontWeight: '600',
    color: wellnessColors.textPrimary,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 22,
    fontWeight: '500',
    color: wellnessColors.textSecondary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  loader: {
    marginVertical: spacing.lg,
  },
});
