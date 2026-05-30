import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { RESPIRA_3000_CLAMP_MAX_ML } from '@/src/modules/device/calibration/predefined-calibration-models';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessRadius, wellnessShadows } from '@/src/shared/theme/wellness-theme';

export type VolumeThermometerStatus = 'waiting' | 'live' | 'neutral';

export type VolumeThermometerProps = {
  valueMl: number | null;
  maxMl?: number;
  label?: string;
  isLive?: boolean;
  loading?: boolean;
  helperText?: string;
  status?: VolumeThermometerStatus;
};

const THERMOMETER_HEIGHT = 220;
const THERMOMETER_WIDTH = 48;
const BULB_SIZE = 56;

function clampVolume(value: number, maxMl: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), maxMl);
}

function formatVolumeMl(valueMl: number | null, isLive: boolean): string {
  if (!isLive || valueMl === null || !Number.isFinite(valueMl)) return '—';
  return `${Math.round(valueMl)}`;
}

export function VolumeThermometer({
  valueMl,
  maxMl = RESPIRA_3000_CLAMP_MAX_ML,
  label = 'Volumen medido',
  isLive = false,
  loading = false,
  helperText,
  status = 'neutral',
}: VolumeThermometerProps) {
  const clampedMl = valueMl !== null ? clampVolume(valueMl, maxMl) : 0;
  const fillRatio = isLive && maxMl > 0 ? clampedMl / maxMl : 0;
  const fillHeight = Math.round(fillRatio * (THERMOMETER_HEIGHT - 8));
  const displayValue = formatVolumeMl(isLive ? clampedMl : null, isLive);

  const resolvedHelper =
    helperText ??
    (status === 'waiting' || !isLive
      ? 'Esperando señal del sensor'
      : 'Lectura estimada a partir del sensor RESPIRA+');

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.contentRow}>
        <View style={styles.thermometerColumn}>
          <View style={styles.scaleLabels}>
            <Text style={styles.scaleMax}>{maxMl}</Text>
            <Text style={styles.scaleMin}>0</Text>
          </View>

          <View style={styles.thermometerWrap}>
            <View style={styles.tube}>
              <View
                style={[
                  styles.fill,
                  {
                    height: fillHeight,
                    opacity: isLive ? 1 : 0,
                  },
                ]}
              />
            </View>
            <View
              style={[
                styles.bulb,
                isLive && fillRatio > 0.02 ? styles.bulbActive : styles.bulbIdle,
              ]}
            />
          </View>

          <Text style={styles.scaleUnit}>mL</Text>
        </View>

        <View style={styles.valueColumn}>
          {loading ? (
            <ActivityIndicator color={wellnessColors.primary} style={styles.loader} />
          ) : (
            <>
              <Text style={[styles.value, !isLive && styles.valueMuted]}>{displayValue}</Text>
              <Text style={styles.unit}>mL</Text>
            </>
          )}
        </View>
      </View>

      <Text style={[styles.helper, !isLive && styles.helperMuted]}>{resolvedHelper}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: wellnessColors.card,
    borderRadius: wellnessRadius.xl,
    ...wellnessShadows.card,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: wellnessColors.textSecondary,
    letterSpacing: 0.2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    width: '100%',
  },
  thermometerColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scaleLabels: {
    height: THERMOMETER_HEIGHT + BULB_SIZE / 2,
    justifyContent: 'space-between',
    paddingBottom: BULB_SIZE / 2,
    alignItems: 'flex-end',
  },
  scaleMax: {
    fontSize: 11,
    fontWeight: '600',
    color: wellnessColors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  scaleMin: {
    fontSize: 11,
    fontWeight: '600',
    color: wellnessColors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  scaleUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: wellnessColors.textMuted,
    alignSelf: 'flex-end',
    marginBottom: BULB_SIZE / 2,
  },
  thermometerWrap: {
    alignItems: 'center',
  },
  tube: {
    width: THERMOMETER_WIDTH,
    height: THERMOMETER_HEIGHT,
    borderRadius: THERMOMETER_WIDTH / 2,
    backgroundColor: wellnessColors.neutralSoft,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    backgroundColor: wellnessColors.primary,
    borderRadius: THERMOMETER_WIDTH / 2,
    minHeight: 0,
  },
  bulb: {
    width: BULB_SIZE,
    height: BULB_SIZE,
    borderRadius: BULB_SIZE / 2,
    marginTop: -8,
    borderWidth: 1,
    borderColor: wellnessColors.border,
  },
  bulbIdle: {
    backgroundColor: wellnessColors.neutralSoft,
  },
  bulbActive: {
    backgroundColor: wellnessColors.primarySoft,
    borderColor: 'rgba(52, 171, 165, 0.35)',
  },
  valueColumn: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minWidth: 120,
  },
  value: {
    fontSize: 56,
    fontWeight: '600',
    color: wellnessColors.textPrimary,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  valueMuted: {
    color: wellnessColors.textMuted,
  },
  unit: {
    fontSize: 22,
    fontWeight: '500',
    color: wellnessColors.textSecondary,
    marginTop: -4,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  helperMuted: {
    color: wellnessColors.textSecondary,
  },
  loader: {
    marginVertical: spacing.lg,
  },
});
