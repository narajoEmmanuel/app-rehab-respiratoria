import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    PATIENT_MEASUREMENT_LOAD_ERROR,
    PATIENT_MEASUREMENT_LOAD_ERROR_HELPER,
} from '@/src/modules/device/calibration/patient-measurement-copy';
import { resolveCalibrationDisplayMetadata, resolveDisplayVolumeFromEstimate } from '@/src/modules/device/calibration/calibration-display-utils';
import { ensureRespira3000PredefinedCalibrationInstalled } from '@/src/modules/device/calibration/predefined-calibration-service';
import {
    resolveTherapyCalibrationReadiness,
    type TherapyCalibrationReadiness,
} from '@/src/modules/device/calibration/therapy-calibration-readiness';
import { CalibrationQuickActions } from '@/src/modules/device/components/CalibrationQuickActions';
import { CalibrationStatusHeroCard } from '@/src/modules/device/components/CalibrationStatusHeroCard';
import { MeasuredVolumeHero } from '@/src/modules/device/components/MeasuredVolumeHero';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { isSensorStreamActivelyReceiving } from '@/src/modules/device/stream/sensor-stream-state';
import { useActiveVolumeEstimate } from '@/src/modules/device/volume-estimation';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors } from '@/src/shared/theme/wellness-theme';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';

export type SensorCalibrationPatientScreenProps = {
  technicalCalibrationEnabled?: boolean;
  onOpenTechnical?: () => void;
};

function hapticLight() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
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
    resolveDisplayVolumeFromEstimate(estimate) !== null &&
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
  const displayVolumeMl = showMeasuredVolume ? resolveDisplayVolumeFromEstimate(estimate) : null;

  const calibrationMeta = useMemo(() => {
    if (!therapyReady || !therapy) return null;
    return resolveCalibrationDisplayMetadata(therapy.profile, therapy.activeModel);
  }, [therapy, therapyReady]);

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

  const heroTitle = useMemo(() => {
    if (therapyReady) return 'Calibración activa';
    if (therapy?.status === 'needs_review') return 'Calibración no disponible';
    return 'Calibración pendiente';
  }, [therapy?.status, therapyReady]);

  const heroSubtitle = useMemo(() => {
    if (therapyReady) return null;
    if (infoMessage) return infoMessage;
    return 'Aún no hay una calibración activa disponible para este espirómetro.';
  }, [therapyReady, infoMessage]);

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
            <View style={styles.calibrationCluster}>
              <CalibrationStatusHeroCard
                active={therapyReady}
                title={heroTitle}
                subtitle={heroSubtitle}
                spirometerModel={calibrationMeta?.spirometerModel}
                calibrationDateShort={calibrationMeta?.calibrationDateShort}
              />
              <CalibrationQuickActions showTechnicalSummary={therapyReady} />
            </View>

            {therapyReady ? (
              <MeasuredVolumeHero
                volumeMl={displayVolumeMl}
                loading={volumeLoading}
                overRange={showMeasuredVolume && estimate.overRange}
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
  calibrationCluster: {
    gap: 10,
  },
});
