/**
 * Purpose: Provisional live preview of VL53L0X distance as a 0–100 % bar (not clinical volume).
 * Module: device
 * Dependencies: react-native, wellness theme
 */
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

/** Rango de distancia (mm) mapeado al 0–100 % visual. Ajusta según tu montaje mecánico. */
export const MIN_DISTANCE_MM = 30;
export const MAX_DISTANCE_MM = 180;

/**
 * Montaje típico: el pistón se acerca al sensor al subir → la distancia disminuye y el % debe subir.
 * Deja `true` para ese caso.
 *
 * Si en el montaje real el movimiento visual queda al revés (la barra sube cuando alejas el objeto),
 * cambia a `false`:
 *   export const INVERT_DIRECTION = false;
 */
export const INVERT_DIRECTION = true;

export type SensorLivePreviewProps = {
  distanceMm?: number;
  rawDistanceMm?: number;
  distanceValid?: boolean;
  source?: string;
  timestamp?: number;
};

/**
 * Maps distance (mm) to a clamped 0–100 visual percent.
 * - `invertDirection === true`: nearer (smaller mm) → higher %.
 * - `invertDirection === false`: farther (larger mm) → higher %.
 */
export function distanceToVisualPercent(
  distanceMm: number,
  minDistanceMm: number,
  maxDistanceMm: number,
  invertDirection: boolean,
): number {
  if (!Number.isFinite(distanceMm) || maxDistanceMm <= minDistanceMm) {
    return 0;
  }
  const span = maxDistanceMm - minDistanceMm;
  const t = (distanceMm - minDistanceMm) / span;
  const clamped = Math.min(1, Math.max(0, t));
  const linear = invertDirection ? 1 - clamped : clamped;
  return Math.round(linear * 100);
}

function formatTimestamp(ts: number | undefined): string {
  if (ts === undefined || !Number.isFinite(ts)) return '—';
  const ms = ts < 1e12 ? ts * 1000 : ts;
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ts);
  }
}

export function SensorLivePreview({
  distanceMm,
  rawDistanceMm,
  distanceValid,
  source,
  timestamp,
}: SensorLivePreviewProps) {
  const hasValidSignal = distanceValid === true;
  const visualPercent = useMemo(() => {
    if (!hasValidSignal || distanceMm === undefined || !Number.isFinite(distanceMm)) {
      return 0;
    }
    return distanceToVisualPercent(distanceMm, MIN_DISTANCE_MM, MAX_DISTANCE_MM, INVERT_DIRECTION);
  }, [distanceMm, hasValidSignal]);

  const anim = useRef(new Animated.Value(visualPercent)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: visualPercent,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [anim, visualPercent]);

  const hFill = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  const vFill = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>Vista previa en vivo (distancia)</Text>

      {!hasValidSignal ? (
        <Text style={styles.noSignal}>Sin señal válida</Text>
      ) : (
        <Text style={styles.percentLabel}>{visualPercent} %</Text>
      )}

      <View style={styles.barsRow}>
        <View style={styles.verticalTrack}>
          <Animated.View style={[styles.verticalFill, { height: vFill }]} />
        </View>
        <View style={styles.barsColumn}>
          <View style={styles.horizontalTrack}>
            <Animated.View style={[styles.horizontalFill, { width: hFill }]} />
          </View>
          <Text style={styles.barHint}>Barra vertical y horizontal (mismo valor)</Text>
        </View>
      </View>

      <View style={styles.diagRow}>
        <Text style={styles.diagKey}>distanceMm (filtrado)</Text>
        <Text style={styles.diagValue}>
          {distanceMm !== undefined && Number.isFinite(distanceMm) ? `${distanceMm} mm` : '—'}
        </Text>
      </View>
      <View style={styles.diagRow}>
        <Text style={styles.diagKey}>rawDistanceMm</Text>
        <Text style={styles.diagValue}>
          {rawDistanceMm !== undefined && Number.isFinite(rawDistanceMm)
            ? `${rawDistanceMm} mm`
            : '—'}
        </Text>
      </View>
      <View style={styles.diagRow}>
        <Text style={styles.diagKey}>distanceValid</Text>
        <Text style={styles.diagValue}>{distanceValid === undefined ? '—' : distanceValid ? 'sí' : 'no'}</Text>
      </View>
      <View style={styles.diagRow}>
        <Text style={styles.diagKey}>source</Text>
        <Text style={styles.diagValue}>{source ?? '—'}</Text>
      </View>
      <View style={styles.diagRow}>
        <Text style={styles.diagKey}>timestamp</Text>
        <Text style={styles.diagValue} numberOfLines={2}>
          {timestamp !== undefined && Number.isFinite(timestamp)
            ? `${timestamp} · ${formatTimestamp(timestamp)}`
            : '—'}
        </Text>
      </View>

      <Text style={styles.disclaimer}>
        Visualización provisional, no representa volumen clínico
      </Text>
    </View>
  );
}

const BAR_HEIGHT = 12;
const VERTICAL_TRACK_HEIGHT = 140;
const VERTICAL_TRACK_WIDTH = 28;

const styles = StyleSheet.create({
  card: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.md,
    ...wellnessShadows.cardPress,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  noSignal: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.errorText,
    marginBottom: spacing.sm,
  },
  percentLabel: {
    fontSize: 28,
    fontWeight: '800',
    color: wellness.primaryDark,
    marginBottom: spacing.sm,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  verticalTrack: {
    width: VERTICAL_TRACK_WIDTH,
    height: VERTICAL_TRACK_HEIGHT,
    borderRadius: 12,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  verticalFill: {
    width: '100%',
    backgroundColor: wellness.primary,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  barsColumn: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  horizontalTrack: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    overflow: 'hidden',
  },
  horizontalFill: {
    height: '100%',
    backgroundColor: wellness.primaryDark,
    borderRadius: BAR_HEIGHT / 2,
  },
  barHint: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: wellness.textSecondary,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    gap: spacing.sm,
  },
  diagKey: {
    fontSize: 13,
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  diagValue: {
    fontSize: 14,
    fontWeight: '700',
    color: wellness.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  disclaimer: {
    marginTop: spacing.md,
    fontSize: 12,
    lineHeight: 17,
    color: wellness.textSecondary,
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  },
});
