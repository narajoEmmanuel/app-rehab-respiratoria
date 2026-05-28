import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import {
  resolveTherapyCalibrationReadiness,
  type TherapyCalibrationReadiness,
} from '@/src/modules/device/calibration/therapy-calibration-readiness';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { isSensorStreamActivelyReceiving } from '@/src/modules/device/stream/sensor-stream-state';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors, wellnessShadows } from '@/src/shared/theme/wellness-theme';

export type SensorCalibrationPatientScreenProps = {
  onOpenTechnical: () => void;
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

function formatLastCalibrationDate(epoch: number | undefined | null): string | null {
  if (!epoch || !Number.isFinite(epoch)) return null;
  try {
    return new Date(epoch).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

type PatientUiState = 'pending' | 'ready' | 'ready_sensor_blocked';

export function SensorCalibrationPatientScreen({ onOpenTechnical }: SensorCalibrationPatientScreenProps) {
  const router = useRouter();
  const { status, mode, lastReading, sensorStreamState } = useSensorConnection();

  const [loading, setLoading] = useState(true);
  const [therapy, setTherapy] = useState<TherapyCalibrationReadiness | null>(null);

  const isOnline = status === 'connected' || status === 'receiving';
  const streamReceiving =
    mode === 'mock' ? isOnline : isSensorStreamActivelyReceiving(sensorStreamState);
  const signalValid =
    streamReceiving &&
    Boolean(lastReading) &&
    lastReading?.distanceValid === true &&
    typeof lastReading?.distanceMm === 'number' &&
    Number.isFinite(lastReading.distanceMm);

  const refresh = useCallback(async () => {
    setLoading(true);
    const readiness = await resolveTherapyCalibrationReadiness();
    setTherapy(readiness);
    setLoading(false);
  }, []);

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

  const statusLabel = therapy?.statusLabel ?? 'Calibración pendiente';
  const lastCalibrationDate = formatLastCalibrationDate(therapy?.activeModel?.activatedAt);

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
    onOpenTechnical();
  }, [onOpenTechnical]);

  const primaryAction = useMemo(() => {
    if (uiState === 'pending') {
      return {
        title: 'Calibrar espirómetro',
        onPress: onCalibrate,
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
  }, [isOnline, onCalibrate, onOpenSensorConnection, onStartTherapy, uiState]);

  const helperText = useMemo(() => {
    if (uiState === 'pending') {
      return 'Realiza la calibración técnica antes de iniciar terapia.';
    }
    if (uiState === 'ready_sensor_blocked') {
      return 'Conecta el sensor para iniciar terapia.';
    }
    return null;
  }, [uiState]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/sensor-connection" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <SectionHeader
          title="Calibración"
          subtitle="Espirómetro RESPIRA+ y sensor para terapia."
        />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={wellnessColors.primary} />
          </View>
        ) : (
          <>
            <AppCard style={styles.heroCard}>
              <Text style={styles.heroTitle}>{SPIROMETER_DISPLAY_NAME}</Text>
              <View style={styles.statusRow}>
                <StatusPill
                  label={statusLabel}
                  tone={calibrationTone(therapy?.status ?? 'pending')}
                  size="sm"
                />
              </View>
              {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
              {uiState !== 'pending' && lastCalibrationDate ? (
                <Text style={styles.metaText}>Última calibración: {lastCalibrationDate}</Text>
              ) : null}
              {therapy?.status === 'needs_review' && therapy.detailMessage ? (
                <Text style={styles.warnText}>{therapy.detailMessage}</Text>
              ) : null}
            </AppCard>

            <AppButton
              title={primaryAction.title}
              onPress={primaryAction.onPress}
              disabled={primaryAction.disabled}
              variant="primary"
            />

            {uiState !== 'pending' ? (
              <Pressable
                onPress={onCalibrate}
                style={({ pressed }) => [styles.secondaryLink, pressed && styles.secondaryLinkPressed]}
                accessibilityRole="button"
                accessibilityLabel="Ver configuración técnica">
                <Text style={styles.secondaryLinkText}>Ver configuración técnica</Text>
              </Pressable>
            ) : null}
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
    gap: spacing.lg,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 15,
    lineHeight: 22,
    color: wellnessColors.textSecondary,
  },
  metaText: {
    fontSize: 14,
    color: wellnessColors.textMuted,
  },
  warnText: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.errorText,
  },
  secondaryLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryLinkPressed: { opacity: 0.65 },
  secondaryLinkText: {
    fontSize: 15,
    fontWeight: '500',
    color: wellnessColors.primary,
  },
});
