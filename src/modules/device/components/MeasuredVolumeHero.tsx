import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { VOLUME_OVER_RANGE_HELPER } from '@/src/modules/device/calibration/calibration-display-utils';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { AppText } from '@/src/shared/ui/AppText';

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
  label = 'Volumen estimado',
  overRange = false,
}: MeasuredVolumeHeroProps) {
  const resolvedSubtitle =
    subtitle ??
    (overRange
      ? VOLUME_OVER_RANGE_HELPER
      : 'Lectura estimada a partir del sensor RESPIRA+');

  return (
    <View style={styles.card}>
      <AppText variant="statusValue" style={styles.label}>
        {label}
      </AppText>
      {loading ? (
        <ActivityIndicator color={wellnessColors.primary} style={styles.loader} />
      ) : (
        <View style={styles.valueRow}>
          <AppText variant="metricLarge" style={styles.value}>
            {formatVolumeMl(volumeMl)}
          </AppText>
          <AppText variant="metricSmall" style={styles.unit}>
            mL
          </AppText>
        </View>
      )}
      {resolvedSubtitle ? (
        <AppText variant="bodySmall" style={styles.subtitle}>
          {resolvedSubtitle}
        </AppText>
      ) : null}
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
    fontWeight: '500',
    color: wellnessColors.textSecondary,
  },
  subtitle: {
    color: wellnessColors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  loader: {
    marginVertical: spacing.lg,
  },
});
