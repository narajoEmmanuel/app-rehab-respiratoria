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
import {
  isSensorStreamActivelyReceiving,
  SENSOR_STREAM_STATE_LABELS,
} from '@/src/modules/device/stream/sensor-stream-state';
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

function sensorStatusLabel(params: {
  isOnline: boolean;
  signalValid: boolean;
  streamMessage?: string;
}): { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' } {
  if (!params.isOnline) return { label: 'Sin conexión', tone: 'neutral' };
  if (params.signalValid) return { label: 'Sensor conectado', tone: 'success' };
  if (params.streamMessage) return { label: 'Esperando señal', tone: 'warning' };
  return { label: 'Conectado', tone: 'warning' };
}

function calibrationTone(
  status: TherapyCalibrationReadiness['status'],
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ready') return 'success';
  if (status === 'needs_review') return 'danger';
  return 'warning';
}

export function SensorCalibrationPatientScreen({ onOpenTechnical }: SensorCalibrationPatientScreenProps) {
  const router = useRouter();
  const { status, mode, lastReading, sensorStreamState } = useSensorConnection();

  const [loading, setLoading] = useState(true);
  const [therapy, setTherapy] = useState<TherapyCalibrationReadiness | null>(null);
  const [techExpanded, setTechExpanded] = useState(false);

  const isOnline = status === 'connected' || status === 'receiving';
  const streamReceiving =
    mode === 'mock' ? isOnline : isSensorStreamActivelyReceiving(sensorStreamState);
  const signalValid =
    streamReceiving &&
    Boolean(lastReading) &&
    lastReading?.distanceValid === true &&
    typeof lastReading?.distanceMm === 'number' &&
    Number.isFinite(lastReading.distanceMm);
  const streamMessage =
    mode === 'websocket' && isOnline && !streamReceiving
      ? SENSOR_STREAM_STATE_LABELS[sensorStreamState]
      : undefined;

  const refresh = useCallback(async () => {
    setLoading(true);
    const readiness = await resolveTherapyCalibrationReadiness();
    setTherapy(readiness);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sensorUi = useMemo(
    () => sensorStatusLabel({ isOnline, signalValid, streamMessage }),
    [isOnline, signalValid, streamMessage],
  );

  const therapyReady = Boolean(therapy?.isReadyForTherapy);
  const canStartTherapy = therapyReady && signalValid;
  const needsCalibration = !therapyReady;

  const onStartTherapy = useCallback(() => {
    hapticLight();
    router.push('/terapia');
  }, [router]);

  const onCalibrate = useCallback(() => {
    hapticLight();
    onOpenTechnical();
  }, [onOpenTechnical]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/sensor-connection" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <SectionHeader
          title="Espirómetro y calibración"
          subtitle="Verifica el espirómetro RESPIRA+ y la conexión del sensor antes de la terapia."
        />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={wellnessColors.primary} />
          </View>
        ) : (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.cardTitle}>Estado</Text>
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Sensor</Text>
                  <StatusPill label={sensorUi.label} tone={sensorUi.tone} size="sm" />
                </View>
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Calibración</Text>
                  <StatusPill
                    label={therapy?.statusLabel ?? 'Calibración pendiente'}
                    tone={calibrationTone(therapy?.status ?? 'pending')}
                    size="sm"
                  />
                </View>
              </View>
              {streamMessage ? <Text style={styles.hint}>{streamMessage}</Text> : null}
              {therapy?.detailMessage && therapy.status !== 'ready' ? (
                <Text style={styles.hint}>{therapy.detailMessage}</Text>
              ) : null}
              {therapy?.status === 'ready' ? (
                <Text style={styles.hintSuccess}>Listo para terapia con sensor.</Text>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.cardTitle}>{SPIROMETER_DISPLAY_NAME}</Text>
              <Text style={styles.deviceMeta}>Capacidad nominal: 3000 mL</Text>
              <Text style={styles.deviceMeta}>Marcas de referencia: 250 mL a 3000 mL (paso 250 mL)</Text>
              <View style={styles.calibrationStatusRow}>
                <Text style={styles.statusLabel}>Estado de calibración</Text>
                <StatusPill
                  label={therapy?.statusLabel ?? 'Calibración pendiente'}
                  tone={calibrationTone(therapy?.status ?? 'pending')}
                  size="sm"
                />
              </View>
              {!therapyReady ? (
                <Text style={styles.hint}>
                  No hay un modelo de calibración activo. Realiza la calibración técnica multipunto
                  antes de comenzar la terapia.
                </Text>
              ) : (
                <Text style={styles.hintSuccess}>
                  Modelo de calibración activo y verificado para este espirómetro.
                </Text>
              )}
            </AppCard>

            {needsCalibration ? (
              <AppButton
                title="Calibrar espirómetro"
                onPress={onCalibrate}
                variant="primary"
              />
            ) : (
              <AppButton
                title="Comenzar terapia"
                onPress={onStartTherapy}
                disabled={!canStartTherapy}
                variant="primary"
              />
            )}

            {therapyReady && !signalValid ? (
              <Text style={styles.hintCenter}>
                Conecta el sensor y activa la transmisión para usar el volumen en vivo.
              </Text>
            ) : null}

            {!therapyReady ? (
              <Text style={styles.hintCenter}>
                La calibración técnica captura volumen real frente a distancia del sensor y activa
                el modelo para terapia.
              </Text>
            ) : null}

            <Pressable
              style={styles.techToggle}
              onPress={() => {
                hapticLight();
                setTechExpanded((v) => !v);
              }}
              accessibilityRole="button">
              <Text style={styles.techChevron}>{techExpanded ? '▾' : '▸'}</Text>
              <Text style={styles.techToggleText}>Configuración técnica</Text>
            </Pressable>

            {techExpanded ? (
              <AppCard style={styles.card}>
                <Text style={styles.cardTitle}>Configuración técnica</Text>
                <Text style={styles.hint}>
                  Captura multipunto, métricas, activación del modelo y exportación del archivo
                  técnico de calibración.
                </Text>
                <AppButton
                  title="Abrir configuración técnica"
                  onPress={onCalibrate}
                  variant="secondary"
                />
              </AppCard>
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
    gap: spacing.md,
  },
  loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
  card: {
    gap: spacing.sm,
    ...wellnessShadows.card,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: wellnessColors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  calibrationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusItem: { gap: spacing.xs, minWidth: 120 },
  statusLabel: {
    fontSize: 13,
    color: wellnessColors.textSecondary,
  },
  deviceMeta: {
    fontSize: 14,
    color: wellnessColors.textSecondary,
    lineHeight: 20,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: wellnessColors.textSecondary,
  },
  hintSuccess: {
    fontSize: 14,
    color: wellnessColors.success,
    fontWeight: '500',
  },
  hintCenter: {
    fontSize: 13,
    textAlign: 'center',
    color: wellnessColors.textMuted,
    marginTop: -spacing.xs,
  },
  techToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  techToggleText: {
    fontSize: 14,
    color: wellnessColors.textSecondary,
    fontWeight: '500',
  },
  techChevron: {
    fontSize: 14,
    color: wellnessColors.textSecondary,
    width: 18,
    textAlign: 'center',
  },
});
