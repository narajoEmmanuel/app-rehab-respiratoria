import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import {
  PATIENT_MEASUREMENT_LOAD_ERROR,
  PATIENT_MEASUREMENT_LOAD_ERROR_HELPER,
  patientMeasurementStatusLabel,
  resolvePatientMeasurementPhase,
} from '@/src/modules/device/calibration/patient-measurement-copy';
import { ensureRespira3000PredefinedCalibrationInstalled } from '@/src/modules/device/calibration/predefined-calibration-service';
import {
  resolveTherapyCalibrationReadiness,
  type TherapyCalibrationReadiness,
} from '@/src/modules/device/calibration/therapy-calibration-readiness';
import { MeasuredVolumeHero } from '@/src/modules/device/components/MeasuredVolumeHero';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { isSensorStreamActivelyReceiving } from '@/src/modules/device/stream/sensor-stream-state';
import { useActiveVolumeEstimate } from '@/src/modules/device/volume-estimation';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors, wellnessShadows } from '@/src/shared/theme/wellness-theme';

export type SensorCalibrationPatientScreenProps = {
  technicalCalibrationEnabled?: boolean;
  onOpenTechnical?: () => void;
};

const SPIROMETER_DISPLAY_NAME = 'Espirómetro RESPIRA+ 3000 mL';

function hapticLight() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function calibrationTone(
  status: TherapyCalibrationReadiness['status'],
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ready') return 'success';
  if (status === 'needs_review') return 'danger';
  return 'warning';
}

type PatientUiState = 'pending' | 'ready' | 'ready_sensor_blocked';

export function SensorCalibrationPatientScreen({
  technicalCalibrationEnabled = false,
  onOpenTechnical,
}: SensorCalibrationPatientScreenProps) {
  const router = useRouter();
  const { status, mode, sensorStreamState } = useSensorConnection();

  const [loading, setLoading] = useState(true);
  const [therapy, setTherapy] = useState<TherapyCalibrationReadiness | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { estimate, loading: volumeLoading, sensorConnected } = useActiveVolumeEstimate({
    enabled: true,
  });

  const isOnline = status === 'connected' || status === 'receiving';
  const streamReceiving =
    mode === 'mock' ? isOnline : isSensorStreamActivelyReceiving(sensorStreamState);
  const signalValid =
    streamReceiving &&
    sensorConnected &&
    estimate.roundedVolumeMl !== null &&
    estimate.status === 'ok';

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    if (!technicalCalibrationEnabled) {
      await ensureRespira3000PredefinedCalibrationInstalled();
    }

    const readiness = await resolveTherapyCalibrationReadiness();
    setTherapy(readiness);

    if (!technicalCalibrationEnabled && !readiness.isReadyForTherapy) {
      setLoadError(PATIENT_MEASUREMENT_LOAD_ERROR);
    }

    setLoading(false);
  }, [technicalCalibrationEnabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const therapyReady = Boolean(therapy?.isReadyForTherapy);
  const canStartTherapy = therapyReady && signalValid;

  const uiState: PatientUiState = useMemo(() => {
    if (!therapyReady) return 'pending';
    if (!canStartTherapy) return 'ready_sensor_blocked';
    return 'ready';
  }, [canStartTherapy, therapyReady]);

  const measurementPhase = useMemo(
    () =>
      resolvePatientMeasurementPhase({
        technicalMode: technicalCalibrationEnabled,
        snapshotLoading: loading,
        snapshotCorrupt: Boolean(loadError),
        therapyReady,
        therapyStatus: therapy?.status ?? 'pending',
        sensorConnected: isOnline,
        signalLive: signalValid,
      }),
    [
      isOnline,
      loadError,
      loading,
      signalValid,
      technicalCalibrationEnabled,
      therapy?.status,
      therapyReady,
    ],
  );

  const statusLabel = useMemo(() => {
    if (technicalCalibrationEnabled && therapyReady) return 'Calibración verificada';
    return patientMeasurementStatusLabel(measurementPhase, technicalCalibrationEnabled);
  }, [measurementPhase, technicalCalibrationEnabled, therapyReady]);

  const onStartTherapy = useCallback(() => {
    hapticLight();
    router.push('/terapia');
  }, [router]);

  const onOpenSensorConnection = useCallback(() => {
    hapticLight();
    router.push('/sensor-connection');
  }, [router]);

  const onCalibrate = useCallback(() => {
    hapticLight();
    onOpenTechnical?.();
  }, [onOpenTechnical]);

  const primaryAction = useMemo(() => {
    if (uiState === 'pending') {
      if (technicalCalibrationEnabled) {
        return {
          title: 'Nueva calibración técnica',
          onPress: onCalibrate,
          disabled: false,
        };
      }
      return {
        title: isOnline ? 'Revisar sensor' : 'Conectar sensor',
        onPress: onOpenSensorConnection,
        disabled: false,
      };
    }
    if (uiState === 'ready_sensor_blocked') {
      return {
        title: isOnline ? 'Revisar sensor' : 'Conectar sensor',
        onPress: onOpenSensorConnection,
        disabled: false,
      };
    }
    return {
      title: 'Comenzar terapia',
      onPress: onStartTherapy,
      disabled: false,
    };
  }, [isOnline, onCalibrate, onOpenSensorConnection, onStartTherapy, technicalCalibrationEnabled, uiState]);

  const showMeasuredVolume = therapyReady && sensorConnected && streamReceiving;

  const infoMessage = useMemo(() => {
    if (loadError) {
      return technicalCalibrationEnabled
        ? loadError
        : `${PATIENT_MEASUREMENT_LOAD_ERROR}\n${PATIENT_MEASUREMENT_LOAD_ERROR_HELPER}`;
    }
    if (therapy?.status === 'needs_review' && therapy.detailMessage) {
      return technicalCalibrationEnabled ? therapy.detailMessage : PATIENT_MEASUREMENT_LOAD_ERROR;
    }
    return null;
  }, [loadError, technicalCalibrationEnabled, therapy?.detailMessage, therapy?.status]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/sensor-connection" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={wellnessColors.primary} />
          </View>
        ) : (
          <>
            <AppCard style={styles.heroCard}>
              <Text style={styles.heroTitle}>{SPIROMETER_DISPLAY_NAME}</Text>
              <StatusPill
                label={statusLabel}
                tone={calibrationTone(therapy?.status ?? 'pending')}
                size="sm"
              />
              {infoMessage ? <Text style={styles.warnText}>{infoMessage}</Text> : null}
            </AppCard>

            {therapyReady ? (
              <MeasuredVolumeHero
                volumeMl={showMeasuredVolume ? estimate.roundedVolumeMl : null}
                loading={volumeLoading}
              />
            ) : null}

            <AppButton
              title={primaryAction.title}
              onPress={primaryAction.onPress}
              disabled={primaryAction.disabled}
              variant="primary"
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wellness.screenBg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
    paddingTop: spacing.md,
  },
  loadingWrap: { paddingVertical: spacing.xxl, alignItems: 'center' },
  heroCard: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
    ...wellnessShadows.card,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: wellnessColors.textPrimary,
    letterSpacing: -0.3,
  },
  warnText: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.errorText,
  },
});
