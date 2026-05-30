import { useCallback, useEffect, useState } from 'react';
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

import { MeasuredVolumeHero } from '@/src/modules/device/components/MeasuredVolumeHero';
import {
  resolveTherapyCalibrationReadiness,
  type TherapyCalibrationReadiness,
} from '@/src/modules/device/calibration/therapy-calibration-readiness';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { isSensorStreamActivelyReceiving } from '@/src/modules/device/stream/sensor-stream-state';
import {
  useActiveVolumeEstimate,
} from '@/src/modules/device/volume-estimation';
import { exportCalibrationTechnicalCsv } from '@/src/modules/export/services/calibration-technical-export-service';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const SPIROMETER_NAME = 'Espirómetro RESPIRA+ 3000 mL';

export type SensorCalibrationTechnicalScreenProps = {
  onClose?: () => void;
  onOpenCapture?: () => void;
};

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

export function SensorCalibrationTechnicalScreen({
  onClose,
  onOpenCapture,
}: SensorCalibrationTechnicalScreenProps) {
  const { status, mode, sensorStreamState } = useSensorConnection();
  const [therapy, setTherapy] = useState<TherapyCalibrationReadiness | null>(null);
  const [loadingTherapy, setLoadingTherapy] = useState(true);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const isOnline = status === 'connected' || status === 'receiving';
  const streamReceiving =
    mode === 'mock' ? isOnline : isSensorStreamActivelyReceiving(sensorStreamState);

  const {
    estimate,
    loading: volumeLoading,
    sensorConnected,
    calibrationProfile,
  } = useActiveVolumeEstimate({ enabled: true });

  const refreshTherapy = useCallback(async () => {
    setLoadingTherapy(true);
    const readiness = await resolveTherapyCalibrationReadiness();
    setTherapy(readiness);
    setLoadingTherapy(false);
  }, []);

  useEffect(() => {
    void refreshTherapy();
  }, [refreshTherapy]);

  const statusLabel = therapy?.statusLabel ?? 'Calibración pendiente';
  const showVolume =
    sensorConnected &&
    streamReceiving &&
    estimate.roundedVolumeMl !== null &&
    estimate.status === 'ok';

  const onExport = useCallback(async () => {
    if (!calibrationProfile) {
      setExportMessage('No hay datos de calibración para exportar.');
      return;
    }
    hapticLight();
    setExportBusy(true);
    setExportMessage(null);
    try {
      const result = await exportCalibrationTechnicalCsv({ profile: calibrationProfile });
      if (result.ok) {
        setExportMessage(
          result.mode === 'web_download'
            ? 'Descarga del archivo técnico iniciada.'
            : 'Archivo técnico listo para compartir.',
        );
      } else {
        setExportMessage(
          'reason' in result && result.reason === 'no_calibration'
            ? result.message
            : result.message,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al exportar';
      setExportMessage(message);
    } finally {
      setExportBusy(false);
    }
  }, [calibrationProfile]);

  const onRecalibrate = useCallback(() => {
    hapticLight();
    onOpenCapture?.();
  }, [onOpenCapture]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar
        showBackButton
        showProfileButton={false}
        backFallbackHref="/sensor-connection"
        onPressBack={onClose}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Modo técnico</Text>
        <Text style={styles.title}>{SPIROMETER_NAME}</Text>

        {loadingTherapy ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={wellnessColors.primary} />
          </View>
        ) : (
          <>
            <AppCard style={styles.statusCard}>
              <Text style={styles.cardLabel}>Estado de calibración</Text>
              <StatusPill
                label={statusLabel}
                tone={calibrationTone(therapy?.status ?? 'pending')}
                size="sm"
              />
              {therapy?.status === 'needs_review' && therapy.detailMessage ? (
                <Text style={styles.warnText}>{therapy.detailMessage}</Text>
              ) : null}
            </AppCard>

            <MeasuredVolumeHero
              volumeMl={showVolume ? estimate.roundedVolumeMl : null}
              loading={volumeLoading}
            />

            <View style={styles.actions}>
              {onOpenCapture ? (
                <AppButton
                  title="Recalibrar espirómetro"
                  onPress={onRecalibrate}
                  variant="secondary"
                />
              ) : null}
              <AppButton
                title={exportBusy ? 'Exportando…' : 'Exportar archivo técnico'}
                onPress={() => void onExport()}
                variant="ghost"
                disabled={exportBusy || !calibrationProfile}
              />
            </View>

            {exportMessage ? <Text style={styles.exportHint}>{exportMessage}</Text> : null}

            {onClose ? (
              <Pressable
                onPress={() => {
                  hapticLight();
                  onClose();
                }}
                style={({ pressed }) => [styles.backLink, pressed && styles.backLinkPressed]}
                accessibilityRole="button"
                accessibilityLabel="Volver a vista de calibración">
                <Text style={styles.backLinkText}>Volver</Text>
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
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: wellnessColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: wellnessColors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: spacing.xs,
  },
  loadingWrap: { paddingVertical: spacing.xxl, alignItems: 'center' },
  statusCard: {
    gap: spacing.md,
    ...wellnessShadows.card,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: wellnessColors.textSecondary,
  },
  warnText: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.errorText,
  },
  actions: {
    gap: spacing.md,
  },
  exportHint: {
    fontSize: 14,
    color: wellnessColors.textMuted,
    textAlign: 'center',
  },
  backLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  backLinkPressed: { opacity: 0.65 },
  backLinkText: {
    fontSize: 15,
    fontWeight: '500',
    color: wellnessColors.primary,
  },
});
