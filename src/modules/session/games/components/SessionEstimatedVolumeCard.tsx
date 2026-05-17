import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ActiveVolumeEstimateResult } from '@/src/modules/device/calibration/active-volume-estimation-types';
import type { VolumeEstimationReadinessStatus } from '@/src/modules/device/volume-estimation/volume-estimation-types';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

type SessionEstimatedVolumeCardProps = {
  status: VolumeEstimationReadinessStatus;
  estimate: ActiveVolumeEstimateResult;
  onConnectSensor: () => void;
  onGoCalibration: () => void;
};

type SessionVolumeDisplay = {
  badgeLabel: string;
  badgeTone: 'ok' | 'warn' | 'muted' | 'alert';
  volumeMl: number | null;
  u95Ml: number | null;
  showVolume: boolean;
  actionLabel: string | null;
  onAction: (() => void) | null;
};

function resolveSessionVolumeDisplay(
  status: VolumeEstimationReadinessStatus,
  estimate: ActiveVolumeEstimateResult,
  onConnectSensor: () => void,
  onGoCalibration: () => void,
): SessionVolumeDisplay {
  const volumeMl = estimate.roundedVolumeMl;
  const u95Ml = estimate.u95Ml;

  switch (status) {
    case 'ready':
      return {
        badgeLabel: 'En rango',
        badgeTone: 'ok',
        volumeMl,
        u95Ml,
        showVolume: volumeMl !== null,
        actionLabel: null,
        onAction: null,
      };
    case 'out_of_range':
      return {
        badgeLabel: 'Fuera de rango',
        badgeTone: 'warn',
        volumeMl,
        u95Ml,
        showVolume: volumeMl !== null,
        actionLabel: null,
        onAction: null,
      };
    case 'sensor_disconnected':
      return {
        badgeLabel: 'Sensor desconectado',
        badgeTone: 'muted',
        volumeMl: null,
        u95Ml: null,
        showVolume: false,
        actionLabel: 'Conectar sensor',
        onAction: onConnectSensor,
      };
    case 'model_stale':
      return {
        badgeLabel: 'Modelo desactualizado',
        badgeTone: 'warn',
        volumeMl: null,
        u95Ml: null,
        showVolume: false,
        actionLabel: 'Actualizar calibración',
        onAction: onGoCalibration,
      };
    case 'no_active_model':
    case 'missing_curve':
    case 'no_spirometer':
    case 'not_ready_for_therapy':
      return {
        badgeLabel: 'Calibración requerida',
        badgeTone: 'muted',
        volumeMl: null,
        u95Ml: null,
        showVolume: false,
        actionLabel: 'Ir a calibración',
        onAction: onGoCalibration,
      };
    case 'loading':
      return {
        badgeLabel: 'Cargando…',
        badgeTone: 'muted',
        volumeMl: null,
        u95Ml: null,
        showVolume: false,
        actionLabel: null,
        onAction: null,
      };
    case 'invalid_sensor_reading':
    case 'error':
    default:
      return {
        badgeLabel: 'Modelo no disponible',
        badgeTone: 'muted',
        volumeMl: null,
        u95Ml: null,
        showVolume: false,
        actionLabel: 'Ir a calibración',
        onAction: onGoCalibration,
      };
  }
}

const badgeToneStyles = {
  ok: { bg: 'rgba(52, 171, 165, 0.12)', text: wellness.primaryDark, border: 'rgba(52, 171, 165, 0.22)' },
  warn: { bg: 'rgba(201, 162, 39, 0.14)', text: '#7A5E12', border: 'rgba(201, 162, 39, 0.35)' },
  muted: { bg: 'rgba(61, 90, 74, 0.08)', text: wellness.textSecondary, border: wellness.border },
  alert: { bg: wellness.errorBg, text: wellness.errorText, border: 'rgba(140, 58, 66, 0.2)' },
} as const;

export function SessionEstimatedVolumeCard({
  status,
  estimate,
  onConnectSensor,
  onGoCalibration,
}: SessionEstimatedVolumeCardProps) {
  const display = resolveSessionVolumeDisplay(status, estimate, onConnectSensor, onGoCalibration);
  const tone = badgeToneStyles[display.badgeTone];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Volumen estimado</Text>
        <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Text style={[styles.badgeText, { color: tone.text }]}>{display.badgeLabel}</Text>
        </View>
      </View>

      {display.showVolume && display.volumeMl !== null ? (
        <View style={styles.metricsRow}>
          <Text style={styles.volumeValue}>
            {display.volumeMl}
            <Text style={styles.volumeUnit}> mL</Text>
          </Text>
          {display.u95Ml !== null ? (
            <Text style={styles.u95}>±{Math.round(display.u95Ml)} mL</Text>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.clinicalNote}>Pendiente de validación clínica</Text>

      {display.actionLabel && display.onAction ? (
        <Pressable
          style={styles.action}
          onPress={display.onAction}
          accessibilityRole="button"
          accessibilityLabel={display.actionLabel}>
          <Text style={styles.actionText}>{display.actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: wellnessRadii.card,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(61, 90, 74, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    letterSpacing: 0.2,
  },
  badge: {
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 6,
  },
  volumeValue: {
    fontSize: 26,
    fontWeight: '900',
    color: wellness.primaryDark,
    letterSpacing: -0.5,
  },
  volumeUnit: {
    fontSize: 15,
    fontWeight: '700',
    color: wellness.textSecondary,
  },
  u95: {
    fontSize: 13,
    fontWeight: '700',
    color: wellness.textSecondary,
  },
  clinicalNote: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    color: wellness.textSecondary,
    opacity: 0.85,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
});
