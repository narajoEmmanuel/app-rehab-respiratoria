import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { VOLUME_OVER_RANGE_HELPER } from '@/src/modules/device/calibration/calibration-display-utils';
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
  overRange?: boolean;
};

const TUBE_HEIGHT = 240;
const TUBE_WIDTH = 56;
const CHAMBER_SIZE = 72;
const TICK_COUNT = 5;

function formatVolumeMl(valueMl: number | null, isLive: boolean): string {
  if (!isLive || valueMl === null || !Number.isFinite(valueMl)) return '—';
  return `${Math.round(valueMl)}`;
}

function buildTickLabels(maxMl: number): number[] {
  return Array.from({ length: TICK_COUNT }, (_, index) =>
    Math.round((maxMl * (TICK_COUNT - 1 - index)) / (TICK_COUNT - 1)),
  );
}

export function VolumeThermometer({
  valueMl,
  maxMl = RESPIRA_3000_CLAMP_MAX_ML,
  label = 'Volumen medido',
  isLive = false,
  loading = false,
  helperText,
  status = 'neutral',
  overRange = false,
}: VolumeThermometerProps) {
  const safeMl = valueMl !== null && Number.isFinite(valueMl) ? Math.max(0, valueMl) : 0;
  const fillMl = Math.min(safeMl, maxMl);
  const fillRatio = isLive && maxMl > 0 ? fillMl / maxMl : 0;
  const fillHeight = Math.round(fillRatio * (TUBE_HEIGHT - 12));
  const displayValue = formatVolumeMl(isLive ? safeMl : null, isLive);
  const tickLabels = buildTickLabels(maxMl);

  const resolvedHelper =
    helperText ??
    (overRange && isLive
      ? VOLUME_OVER_RANGE_HELPER
      : status === 'waiting' || !isLive
        ? 'Esperando señal del sensor'
        : 'Lectura estimada a partir del sensor RESPIRA+');

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.centerBlock}>
        <View style={styles.valueBlock}>
          {loading ? (
            <ActivityIndicator color={wellnessColors.primary} style={styles.loader} />
          ) : (
            <>
              <Text style={[styles.value, !isLive && styles.valueMuted]}>{displayValue}</Text>
              <Text style={styles.unit}>mL</Text>
            </>
          )}
        </View>

        <View style={styles.instrumentWrap}>
          <View style={styles.scaleColumn}>
            {tickLabels.map((tick) => (
              <View key={tick} style={styles.tickRow}>
                <Text style={styles.tickLabel}>{tick}</Text>
                <View style={styles.tickMark} />
              </View>
            ))}
          </View>

          <View style={styles.spirometerColumn}>
            <View style={styles.mouthpiece} />
            <View style={styles.tubeOuter}>
              <View style={styles.tubeInner}>
                <View
                  style={[
                    styles.fill,
                    {
                      height: fillHeight,
                      opacity: isLive ? 1 : 0.12,
                    },
                  ]}
                />
                {isLive && fillRatio > 0 ? (
                  <View style={[styles.levelIndicator, { bottom: Math.max(0, fillHeight - 2) }]} />
                ) : null}
              </View>
            </View>
            <View
              style={[
                styles.chamber,
                isLive && fillRatio > 0.04 ? styles.chamberActive : styles.chamberIdle,
              ]}>
              <View
                style={[
                  styles.chamberGlow,
                  { opacity: isLive ? Math.min(1, 0.25 + fillRatio * 0.55) : 0.08 },
                ]}
              />
            </View>
          </View>

          <Text style={styles.scaleUnit}>mL</Text>
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
    gap: spacing.lg,
    backgroundColor: wellnessColors.card,
    borderRadius: wellnessRadius.xl,
    ...wellnessShadows.card,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    letterSpacing: 0.2,
  },
  centerBlock: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.lg,
  },
  valueBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  value: {
    fontSize: 58,
    fontWeight: '700',
    color: wellnessColors.primaryDark,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  valueMuted: {
    color: wellnessColors.textMuted,
  },
  unit: {
    fontSize: 18,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    marginTop: -2,
  },
  instrumentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  scaleColumn: {
    height: TUBE_HEIGHT + CHAMBER_SIZE * 0.45,
    justifyContent: 'space-between',
    paddingBottom: CHAMBER_SIZE * 0.35,
    minWidth: 42,
  },
  tickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  tickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: wellnessColors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  tickMark: {
    width: 10,
    height: 1,
    backgroundColor: 'rgba(52, 171, 165, 0.28)',
  },
  scaleUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: wellnessColors.textMuted,
    alignSelf: 'flex-end',
    marginBottom: CHAMBER_SIZE * 0.35,
  },
  spirometerColumn: {
    alignItems: 'center',
  },
  mouthpiece: {
    width: 28,
    height: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(52, 171, 165, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.24)',
    marginBottom: 2,
  },
  tubeOuter: {
    padding: 3,
    borderRadius: TUBE_WIDTH / 2 + 3,
    backgroundColor: 'rgba(52, 171, 165, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.16)',
  },
  tubeInner: {
    width: TUBE_WIDTH,
    height: TUBE_HEIGHT,
    borderRadius: TUBE_WIDTH / 2,
    backgroundColor: wellnessColors.neutralSoft,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    backgroundColor: wellnessColors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  levelIndicator: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.85,
  },
  chamber: {
    width: CHAMBER_SIZE,
    height: CHAMBER_SIZE,
    borderRadius: CHAMBER_SIZE / 2,
    marginTop: -10,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chamberIdle: {
    backgroundColor: wellnessColors.neutralSoft,
    borderColor: wellnessColors.border,
  },
  chamberActive: {
    backgroundColor: wellnessColors.primarySoft,
    borderColor: 'rgba(52, 171, 165, 0.35)',
  },
  chamberGlow: {
    width: CHAMBER_SIZE * 0.72,
    height: CHAMBER_SIZE * 0.72,
    borderRadius: CHAMBER_SIZE,
    backgroundColor: wellnessColors.primary,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  helperMuted: {
    color: wellnessColors.textSecondary,
  },
  loader: {
    marginVertical: spacing.lg,
  },
});
