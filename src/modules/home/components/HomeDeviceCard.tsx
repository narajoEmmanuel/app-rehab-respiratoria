/**
 * Purpose: Sensor / calibration status card on the home dashboard.
 * Module: home
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { isTechnicalCalibrationEnabled } from '@/src/modules/app-mode';
import { formatCalibrationCardSubtitle } from '@/src/modules/device/calibration/calibration-display-utils';
import {
  PATIENT_MEASUREMENT_LOAD_ERROR,
  patientMeasurementStatusLabel,
  resolvePatientMeasurementPhase,
} from '@/src/modules/device/calibration/patient-measurement-copy';
import { useCalibrationSnapshot } from '@/src/modules/device/state/use-calibration-snapshot';
import { AppText } from '@/src/shared/ui/AppText';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const ACCENT = wellnessColors.primary;
const HOME_SENSOR_CONNECT_COPY = 'Conecta el sensor para medir tu volumen estimado.';
const HOME_SENSOR_REVIEW_COPY = 'Revisa la conexión del sensor antes de iniciar.';

export type HomeDeviceCalibrationSnapshot = ReturnType<typeof useCalibrationSnapshot>['snapshot'];

type DeviceState = {
  badge: string | null;
  showBadge: boolean;
  title: string;
  subtitle: string;
  ctaLabel: string;
  variant: 'ready' | 'pending' | 'warn' | 'loading';
};

type Props = {
  calibrationSnapshot: HomeDeviceCalibrationSnapshot;
  sensorConnected: boolean;
  sensorSignalLive: boolean;
  onPress: () => void;
  homePresentation?: boolean;
};

function describeDeviceState(
  snapshot: HomeDeviceCalibrationSnapshot,
  technicalCalibrationEnabled: boolean,
  sensorConnected: boolean,
  sensorSignalLive: boolean,
): DeviceState {
  const therapyReady =
    snapshot.kind !== 'loading' && snapshot.therapy.isReadyForTherapy;
  const therapyStatus = snapshot.kind === 'loading' ? 'pending' : snapshot.therapy.status;

  const phase = resolvePatientMeasurementPhase({
    technicalMode: technicalCalibrationEnabled,
    snapshotLoading: snapshot.kind === 'loading',
    snapshotCorrupt: snapshot.kind === 'corrupt',
    therapyReady,
    therapyStatus,
    sensorConnected,
    signalLive: sensorSignalLive,
  });

  const badge = patientMeasurementStatusLabel(phase, technicalCalibrationEnabled);

  if (snapshot.kind === 'loading') {
    return {
      badge: technicalCalibrationEnabled ? null : badge,
      showBadge: !technicalCalibrationEnabled,
      title: 'Dispositivo RESPIRA+',
      subtitle: technicalCalibrationEnabled
        ? 'Revisando el estado del sensor…'
        : 'Verificando medición…',
      ctaLabel: 'Revisar sensor',
      variant: 'loading',
    };
  }

  if (snapshot.kind === 'ready' && therapyReady) {
    const { profile } = snapshot;
    const readyBadge = technicalCalibrationEnabled
      ? 'Calibración verificada'
      : sensorSignalLive
        ? 'Sensor listo para medir'
        : 'Calibración activa';
    return {
      badge: readyBadge,
      showBadge: true,
      title: 'Dispositivo RESPIRA+',
      subtitle: technicalCalibrationEnabled
        ? formatCalibrationCardSubtitle(profile, snapshot.therapy.activeModel)
        : sensorSignalLive
          ? `${snapshot.therapy.spirometerLabel ?? profile.name} · volumen estimado en vivo`
          : HOME_SENSOR_CONNECT_COPY,
      ctaLabel: 'Revisar sensor',
      variant: 'ready',
    };
  }

  if (snapshot.kind === 'corrupt') {
    return {
      badge: technicalCalibrationEnabled ? 'Revisar calibración' : badge,
      showBadge: true,
      title: 'Dispositivo RESPIRA+',
      subtitle: technicalCalibrationEnabled
        ? 'La calibración guardada no se pudo leer.'
        : PATIENT_MEASUREMENT_LOAD_ERROR,
      ctaLabel: 'Revisar sensor',
      variant: 'warn',
    };
  }

  if (snapshot.kind === 'ready' || snapshot.kind === 'none') {
    return {
      badge,
      showBadge: true,
      title: 'Dispositivo RESPIRA+',
      subtitle: technicalCalibrationEnabled
        ? (snapshot.therapy.detailMessage ?? 'Completa la calibración verificada del espirómetro.')
        : sensorConnected
          ? 'Verificando medición…'
          : HOME_SENSOR_CONNECT_COPY,
      ctaLabel: technicalCalibrationEnabled ? 'Configurar espirómetro' : 'Conectar sensor',
      variant: 'pending',
    };
  }

  return {
    badge: null,
    showBadge: false,
    title: 'Dispositivo RESPIRA+',
    subtitle: technicalCalibrationEnabled
      ? 'Conecta el sensor y verifica la calibración del espirómetro.'
      : HOME_SENSOR_CONNECT_COPY,
    variant: 'pending',
    ctaLabel: technicalCalibrationEnabled ? 'Configurar sensor' : 'Conectar sensor',
  };
}

function applyHomeDevicePresentation(
  state: DeviceState,
  sensorConnected: boolean,
  technicalCalibrationEnabled: boolean,
): DeviceState {
  if (technicalCalibrationEnabled) {
    return { ...state, showBadge: false };
  }

  let subtitle = state.subtitle;
  if (state.variant === 'loading') {
    subtitle = 'Verificando medición…';
  } else if (state.variant === 'warn') {
    subtitle = state.subtitle;
  } else {
    subtitle = sensorConnected ? HOME_SENSOR_REVIEW_COPY : HOME_SENSOR_CONNECT_COPY;
  }

  return {
    ...state,
    showBadge: false,
    subtitle,
    ctaLabel: 'Revisar sensor',
  };
}

export function HomeDeviceCard({
  calibrationSnapshot,
  sensorConnected,
  sensorSignalLive,
  onPress,
  homePresentation = false,
}: Props) {
  const technicalCalibrationEnabled = isTechnicalCalibrationEnabled();
  const baseState = describeDeviceState(
    calibrationSnapshot,
    technicalCalibrationEnabled,
    sensorConnected,
    sensorSignalLive,
  );
  const state = homePresentation
    ? applyHomeDevicePresentation(baseState, sensorConnected, technicalCalibrationEnabled)
    : baseState;
  const isReady = state.variant === 'ready';
  const isWarn = state.variant === 'warn';

  return (
    <Pressable
      style={({ pressed }) => [styles.deviceCard, pressed && styles.deviceCardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${state.title}. ${state.showBadge && state.badge ? state.badge : ''} ${state.subtitle}`}>
      <View style={styles.deviceTopRow}>
        <View style={styles.deviceIconWrap}>
          <View style={styles.deviceIcon}>
            <IconSymbol name="dot.radiowaves.left.and.right" size={34} color={ACCENT} />
          </View>
        </View>
        <View style={styles.deviceContent}>
          {state.showBadge && state.badge ? (
            <View
              style={[
                styles.deviceBadge,
                isReady ? styles.deviceBadgeReady : isWarn ? styles.deviceBadgeWarn : styles.deviceBadgePending,
              ]}>
              <AppText
                variant="caption"
                style={[
                  styles.deviceBadgeText,
                  isReady
                    ? styles.deviceBadgeTextReady
                    : isWarn
                      ? styles.deviceBadgeTextWarn
                      : styles.deviceBadgeTextPending,
                ]}>
                {state.badge}
              </AppText>
            </View>
          ) : null}
          <AppText variant="titleMedium" style={[styles.deviceTitle, styles.deviceTitleNoBadge]}>
            {state.title}
          </AppText>
          <AppText variant="bodySmall" style={styles.deviceSubtitle}>
            {state.subtitle}
          </AppText>
          <View style={styles.deviceCtaRow}>
            <AppText variant="statusValue" style={styles.deviceCtaLabel}>
              {state.ctaLabel}
            </AppText>
            <IconSymbol name="chevron.right" size={18} color={ACCENT} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  deviceCard: {
    backgroundColor: wellnessColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...wellnessShadows.soft,
  },
  deviceCardPressed: { opacity: 0.94 },
  deviceTopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  deviceIconWrap: {
    justifyContent: 'center',
  },
  deviceIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: wellnessColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceContent: { flex: 1 },
  deviceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  deviceBadgeReady: { backgroundColor: wellnessColors.primarySoft, borderColor: 'rgba(52, 171, 165, 0.32)' },
  deviceBadgePending: { backgroundColor: wellnessColors.neutralSoft, borderColor: wellnessColors.border },
  deviceBadgeWarn: { backgroundColor: wellnessColors.dangerSoft, borderColor: '#FECACA' },
  deviceBadgeText: { fontWeight: '700', letterSpacing: 0.2 },
  deviceBadgeTextReady: { color: wellnessColors.primaryDark },
  deviceBadgeTextPending: { color: wellnessColors.textSecondary },
  deviceBadgeTextWarn: { color: wellnessColors.danger },
  deviceTitle: { fontSize: 20, color: wellnessColors.textPrimary, marginTop: 8 },
  deviceTitleNoBadge: { marginTop: 0 },
  deviceSubtitle: {
    marginTop: 6,
    color: wellnessColors.textSecondary,
  },
  deviceCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: wellnessColors.border,
  },
  deviceCtaLabel: { color: ACCENT },
});
