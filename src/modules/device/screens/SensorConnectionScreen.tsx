import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isSensorDebugEnabled, isTechnicalCalibrationEnabled } from '@/src/modules/app-mode';
import {
    patientMeasurementConnectionHint,
    patientMeasurementConnectionPillLabel,
    patientMeasurementHelper,
    patientMeasurementMetricLabel,
    patientMeasurementSectionSubtitle,
    patientMeasurementSectionTitle,
    resolvePatientMeasurementPhase,
    therapyCalibrationStatusLabelForUi,
} from '@/src/modules/device/calibration/patient-measurement-copy';
import {
  resolveCalibrationDisplayMetadata,
  resolveDisplayVolumeFromEstimate,
} from '@/src/modules/device/calibration/calibration-display-utils';
import { RESPIRA_3000_CLAMP_MAX_ML } from '@/src/modules/device/calibration/predefined-calibration-models';
import { CalibrationQuickActions } from '@/src/modules/device/components/CalibrationQuickActions';
import { CalibrationStatusHeroCard } from '@/src/modules/device/components/CalibrationStatusHeroCard';
import { SensorLivePreview } from '@/src/modules/device/components/SensorLivePreview';
import { LiveVolumeCard } from '@/src/modules/device/components/LiveVolumeCard';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import {
    getTherapyFromSnapshot,
    isTherapyReadyForActiveSpirometer,
    useCalibrationSnapshot,
} from '@/src/modules/device/state/use-calibration-snapshot';
import {
    isSensorStreamActivelyReceiving,
    SENSOR_STREAM_STATE_LABELS,
} from '@/src/modules/device/stream/sensor-stream-state';
import type { SensorConnectionStatus } from '@/src/modules/device/types/sensor-reading';
import { useActiveVolumeEstimate } from '@/src/modules/device/volume-estimation';
import { spacing } from '@/src/shared/theme/spacing';
import {
    wellnessColors,
    wellnessRadius,
} from '@/src/shared/theme/wellness-theme';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { InfoTile } from '@/src/shared/ui/InfoTile';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';

function hapticLight() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function statusLabel(state: SensorConnectionStatus): string {
  switch (state) {
    case 'idle':
      return 'Sin conectar';
    case 'connecting':
      return 'Conectando…';
    case 'connected':
    case 'receiving':
      return 'Conectado';
    case 'error':
      return 'Error de conexión';
    case 'disconnected':
      return 'Desconectado';
    default:
      return state;
  }
}

function formatScalar(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'sí' : 'no';
  if (typeof value === 'number' && !Number.isFinite(value)) return '—';
  return String(value);
}

function truncateJson(raw: string | null, maxLength = 280): string {
  if (!raw) return '—';
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength)}…`;
}

export function SensorConnectionScreen() {
  const router = useRouter();
  const debug = isSensorDebugEnabled();
  const technicalCalibrationEnabled = isTechnicalCalibrationEnabled();

  const {
    status,
    mode,
    lastReading,
    lastRawMessage,
    messageCount,
    messagesPerSecond,
    errorMessage,
    closeCode,
    closeReason,
    url,
    setUrl,
    connect,
    disconnect,
    resetConnection,
    startMock,
    stopMock,
    sensorStreamState,
    lastDataReceivedAt,
  } = useSensorConnection();

  const { snapshot: calibrationSnapshot } = useCalibrationSnapshot();
  const {
    estimate,
    sensorConnected: volumeSensorConnected,
    activeModel,
  } = useActiveVolumeEstimate({ enabled: true });
  const [techExpanded, setTechExpanded] = useState(false);

  const isConnecting = status === 'connecting';
  const isOnline = status === 'connected' || status === 'receiving';
  const streamReceiving =
    mode === 'mock' ? isOnline : isSensorStreamActivelyReceiving(sensorStreamState);
  const signalValid =
    streamReceiving &&
    Boolean(lastReading) &&
    lastReading?.distanceValid === true &&
    typeof lastReading?.distanceMm === 'number' &&
    Number.isFinite(lastReading?.distanceMm ?? NaN);
  const streamStateMessage =
    mode === 'websocket' && isOnline && !streamReceiving
      ? SENSOR_STREAM_STATE_LABELS[sensorStreamState]
      : undefined;
  const isMock = mode === 'mock' && isOnline;
  const liveReady = isOnline && signalValid;
  const therapyReadiness = getTherapyFromSnapshot(calibrationSnapshot);
  const therapyReady = isTherapyReadyForActiveSpirometer(calibrationSnapshot);
  const readyForTherapy = liveReady && therapyReady;

  const volumeIsLive =
    volumeSensorConnected &&
    streamReceiving &&
    signalValid &&
    estimate.status === 'ok' &&
    resolveDisplayVolumeFromEstimate(estimate) !== null;

  const displayVolumeMl = volumeIsLive ? resolveDisplayVolumeFromEstimate(estimate) : null;

  const onConnect = useCallback(() => {
    hapticLight();
    connect();
  }, [connect]);

  const onDisconnect = useCallback(() => {
    hapticLight();
    disconnect();
  }, [disconnect]);

  const onResetConnection = useCallback(() => {
    hapticLight();
    resetConnection();
  }, [resetConnection]);

  const onOpenCalibration = useCallback(() => {
    hapticLight();
    router.push('/sensor-calibration');
  }, [router]);

  const connectionTone = useMemo(() => {
    if (status === 'error') return 'danger' as const;
    if (isOnline) return 'success' as const;
    if (isConnecting) return 'info' as const;
    return 'neutral' as const;
  }, [isConnecting, isOnline, status]);

  const measurementPhase = useMemo(
    () =>
      resolvePatientMeasurementPhase({
        technicalMode: technicalCalibrationEnabled,
        snapshotLoading: calibrationSnapshot.kind === 'loading',
        snapshotCorrupt: calibrationSnapshot.kind === 'corrupt',
        therapyReady,
        therapyStatus: therapyReadiness.status,
        sensorConnected: isOnline,
        signalLive: liveReady,
      }),
    [
      calibrationSnapshot.kind,
      isOnline,
      liveReady,
      technicalCalibrationEnabled,
      therapyReady,
      therapyReadiness.status,
    ],
  );

  const measurementStatusLabel = useMemo(
    () =>
      therapyCalibrationStatusLabelForUi(therapyReadiness.status, {
        technicalMode: technicalCalibrationEnabled,
        therapyReady,
        signalLive: liveReady,
      }),
    [liveReady, technicalCalibrationEnabled, therapyReady, therapyReadiness.status],
  );

  const connectionPillLabel = useMemo(
    () =>
      patientMeasurementConnectionPillLabel({
        technicalMode: technicalCalibrationEnabled,
        statusError: status === 'error',
        readyForTherapy,
        liveReady,
        therapyReady,
        isOnline,
        isConnecting,
      }),
    [
      isConnecting,
      isOnline,
      liveReady,
      readyForTherapy,
      status,
      technicalCalibrationEnabled,
      therapyReady,
    ],
  );

  const connectionHint = useMemo(
    () =>
      patientMeasurementConnectionHint({
        technicalMode: technicalCalibrationEnabled,
        readyForTherapy,
        isOnline,
        therapyReady,
        streamStateMessage,
        therapyDetailMessage: therapyReadiness.detailMessage,
      }),
    [
      isOnline,
      readyForTherapy,
      streamStateMessage,
      technicalCalibrationEnabled,
      therapyReady,
      therapyReadiness.detailMessage,
    ],
  );

  const calibrationCardMeta = useMemo(() => {
    if (!therapyReady || calibrationSnapshot.kind !== 'ready') return null;
    return resolveCalibrationDisplayMetadata(calibrationSnapshot.profile, activeModel);
  }, [activeModel, calibrationSnapshot, therapyReady]);

  const calibrationHeroTitle = useMemo(() => {
    if (therapyReady) return 'Calibración activa';
    if (
      measurementPhase === 'technical_needs_review' ||
      measurementPhase === 'load_error' ||
      calibrationSnapshot.kind === 'corrupt'
    ) {
      return 'Calibración no disponible';
    }
    return 'Calibración pendiente';
  }, [calibrationSnapshot.kind, measurementPhase, therapyReady]);

  const calibrationHeroSubtitle = useMemo(() => {
    if (therapyReady) return null;
    const helper = patientMeasurementHelper(measurementPhase, technicalCalibrationEnabled);
    if (calibrationSnapshot.kind === 'corrupt' && technicalCalibrationEnabled) {
      return 'El perfil guardado no se pudo leer. Configura de nuevo el espirómetro.';
    }
    return (
      helper ??
      therapyReadiness.detailMessage ??
      'Aún no hay una calibración activa disponible para este espirómetro.'
    );
  }, [
    calibrationSnapshot.kind,
    measurementPhase,
    technicalCalibrationEnabled,
    therapyReady,
    therapyReadiness.detailMessage,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/index" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <SectionHeader
          title={patientMeasurementSectionTitle(technicalCalibrationEnabled)}
          subtitle={patientMeasurementSectionSubtitle(technicalCalibrationEnabled)}
        />

        {/* Connection Card */}
        <AppCard>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <IconSymbol name="dot.radiowaves.left.and.right" size={28} color={wellnessColors.primaryDark} />
            </View>
            <View style={styles.cardHeaderText}>
              <AppText variant="titleSmall" style={styles.cardTitle}>
                Conexión del dispositivo
              </AppText>
              <StatusPill label={connectionPillLabel} tone={connectionTone} size="sm" />
            </View>
          </View>

          <View style={styles.metricsRow}>
            <InfoTile
              label="Conexión"
              value={isOnline ? 'Activa' : 'Inactiva'}
              tone={isOnline ? 'success' : 'neutral'}
              compact
            />
            <InfoTile
              label="Señal"
              value={
                signalValid
                  ? 'Válida'
                  : streamStateMessage
                    ? 'Pausada'
                    : 'Sin lectura'
              }
              tone={signalValid ? 'success' : isOnline ? 'warning' : 'neutral'}
              compact
            />
            <InfoTile
              label={patientMeasurementMetricLabel(technicalCalibrationEnabled)}
              value={measurementStatusLabel}
              tone={
                therapyReadiness.status === 'ready'
                  ? 'success'
                  : therapyReadiness.status === 'needs_review'
                    ? 'danger'
                    : 'warning'
              }
              compact
            />
          </View>

          <AppText variant="chip" style={styles.hint}>
            {connectionHint}
          </AppText>

          {status === 'error' && errorMessage ? (
            <View style={styles.errorBox}>
              <AppText variant="chip" style={styles.errorBoxText}>
                {errorMessage}
              </AppText>
              <AppButton
                title="Limpiar conexión"
                onPress={onResetConnection}
                variant="ghost"
              />
            </View>
          ) : null}
        </AppCard>

        {/* Primary action */}
        {!isOnline ? (
          <AppButton
            title={isConnecting ? 'Conectando…' : 'Conectar dispositivo'}
            onPress={onConnect}
            variant="primary"
            disabled={isConnecting}
            iconName="dot.radiowaves.left.and.right"
          />
        ) : null}

        {/* Disconnect action */}
        {isOnline || isConnecting ? (
          <AppButton
            title="Desconectar"
            onPress={onDisconnect}
            variant="ghost"
          />
        ) : null}

        {/* Calibration */}
        <View style={styles.divider} />

        <View style={styles.calibrationCluster}>
          <CalibrationStatusHeroCard
            active={therapyReady}
            title={calibrationHeroTitle}
            subtitle={calibrationHeroSubtitle}
            spirometerModel={calibrationCardMeta?.spirometerModel}
            calibrationDateShort={calibrationCardMeta?.calibrationDateShort}
          />
          <CalibrationQuickActions showTechnicalSummary={therapyReady} />
        </View>

        {technicalCalibrationEnabled ? (
          <AppCard style={styles.calibTechCard}>
            <View style={styles.calibActions}>
              <AppButton
                title={therapyReady ? 'Ver espirómetro' : 'Configurar espirómetro'}
                onPress={onOpenCalibration}
                variant="secondary"
              />
              <AppButton
                title="Modo técnico de calibración"
                onPress={() => {
                  hapticLight();
                  router.push({
                    pathname: '/sensor-calibration',
                    params: { openCapture: '1' },
                  });
                }}
                variant="ghost"
              />
            </View>
          </AppCard>
        ) : null}

        {therapyReady ? (
          <LiveVolumeCard
            volumeMl={displayVolumeMl}
            maxVolumeMl={RESPIRA_3000_CLAMP_MAX_ML}
            isLive={volumeIsLive}
          />
        ) : null}

        {readyForTherapy ? (
          <AppButton
            title="Continuar a terapia"
            onPress={() => {
              hapticLight();
              router.push('/(tabs)/terapia');
            }}
            variant="primary"
            iconName="arrow.right.circle.fill"
          />
        ) : null}

        {debug && lastReading ? (
          <SensorLivePreview
            distanceMm={lastReading.distanceMm}
            rawDistanceMm={lastReading.rawDistanceMm}
            distanceValid={lastReading.distanceValid}
            signalActive={streamReceiving}
            streamStateMessage={streamStateMessage}
            source={lastReading.source}
            timestamp={lastReading.timestamp}
            sensorStatus={lastReading.sensorStatus}
            firmwareVersion={lastReading.firmwareVersion}
            deviceId={lastReading.deviceId}
          />
        ) : null}

        {/* Technical debug — only when enabled */}
        {debug ? (
          <>
            <Pressable
              onPress={() => {
                hapticLight();
                setTechExpanded((prev) => !prev);
              }}
              style={({ pressed }) => [styles.accordionHeader, pressed && styles.accordionHeaderPressed]}
              accessibilityRole="button"
              accessibilityLabel={techExpanded ? 'Ocultar detalles técnicos' : 'Mostrar detalles técnicos'}>
              <AppText variant="bodySmall" style={styles.accordionTitle}>
                Detalles técnicos
              </AppText>
              <AppText variant="bodyLarge" style={styles.accordionChevron}>
                {techExpanded ? '▾' : '▸'}
              </AppText>
            </Pressable>

            {techExpanded ? (
              <AppCard style={styles.techCard}>
                <View style={styles.techHeaderRow}>
                  <IconSymbol name="gearshape.fill" size={16} color={wellnessColors.textSecondary} />
                  <AppText variant="caption" style={styles.techSection}>
                    Conexión y diagnóstico
                  </AppText>
                </View>
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.urlInput}
                  placeholder="ws://192.168.4.1:81"
                  placeholderTextColor={wellnessColors.textMuted}
                />
                <AppText variant="caption" style={styles.urlHint}>
                  URL del WebSocket del ESP32. Cambia solo si tu firmware usa otra dirección.
                </AppText>

                <View style={styles.techDivider} />
                <AppText variant="caption" style={styles.techSection}>
                  Telemetría
                </AppText>
                <DiagRow label="status" value={statusLabel(status)} />
                <DiagRow label="source" value={formatScalar(lastReading?.source)} />
                <DiagRow label="distanceMm" value={formatScalar(lastReading?.distanceMm)} />
                <DiagRow label="rawDistanceMm" value={formatScalar(lastReading?.rawDistanceMm)} />
                <DiagRow label="distanceValid" value={formatScalar(lastReading?.distanceValid)} />
                <DiagRow label="timestamp" value={formatScalar(lastReading?.timestamp)} />
                <DiagRow label="sensorStreamState" value={sensorStreamState} />
                <DiagRow
                  label="lastDataReceivedAt"
                  value={
                    lastDataReceivedAt === null ? '—' : String(lastDataReceivedAt)
                  }
                />
                <DiagRow
                  label="mensajes"
                  value={`${messageCount} (${messagesPerSecond.toFixed(1)} mps)`}
                />
                <DiagRow label="closeCode" value={closeCode === null ? '—' : String(closeCode)} />
                <DiagRow label="closeReason" value={closeReason ?? '—'} />
                <DiagRow label="errorMessage" value={errorMessage ?? '—'} />

                <AppText variant="label" style={styles.techJsonLabel}>
                  Último JSON crudo
                </AppText>
                <AppText variant="caption" style={styles.techJson} numberOfLines={6}>
                  {lastRawMessage ? truncateJson(lastRawMessage) : 'Sin mensajes recibidos aún.'}
                </AppText>

                <View style={styles.techDivider} />
                <AppText variant="caption" style={styles.techSection}>
                  Diagnóstico avanzado
                </AppText>

                <AppButton
                  title={isMock ? 'Detener lectura de prueba' : 'Iniciar lectura de prueba'}
                  onPress={() => {
                    hapticLight();
                    if (isMock) stopMock();
                    else startMock();
                  }}
                  variant="ghost"
                />
                <AppButton
                  title="Laboratorio de hardware"
                  onPress={() => {
                    hapticLight();
                    router.push('/hardware-lab');
                  }}
                  variant="ghost"
                />
                <AppButton
                  title="Prueba raw WebSocket"
                  onPress={() => {
                    hapticLight();
                    router.push('/esp32-raw-test');
                  }}
                  variant="ghost"
                />
              </AppCard>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DiagRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.diagRow}>
      <AppText variant="caption" style={styles.diagKey}>
        {label}
      </AppText>
      <AppText variant="caption" style={styles.diagValue} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wellnessColors.background },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: wellnessRadius.md,
    backgroundColor: wellnessColors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    color: wellnessColors.textPrimary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hint: {
    lineHeight: 19,
    color: wellnessColors.textSecondary,
  },
  errorBox: {
    marginTop: spacing.md,
    backgroundColor: wellnessColors.dangerSoft,
    borderRadius: wellnessRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorBoxText: {
    lineHeight: 18,
    color: wellnessColors.danger,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: wellnessColors.border,
    marginVertical: spacing.sm,
  },
  calibrationCluster: {
    gap: 10,
  },
  calibTechCard: {
    gap: spacing.sm,
  },
  calibActions: {
    gap: spacing.sm,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: wellnessColors.card,
    borderRadius: wellnessRadius.md,
    borderWidth: 1,
    borderColor: wellnessColors.border,
  },
  accordionHeaderPressed: { opacity: 0.94 },
  accordionTitle: { color: wellnessColors.textPrimary },
  accordionChevron: { color: wellnessColors.textMuted },
  techCard: {
    gap: spacing.sm,
  },
  techHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  techSection: {
    color: wellnessColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  techDivider: {
    height: 1,
    backgroundColor: wellnessColors.border,
    marginVertical: spacing.sm,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: wellnessColors.border,
    backgroundColor: wellnessColors.background,
    borderRadius: wellnessRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: wellnessColors.textPrimary,
    fontSize: 14,
  },
  urlHint: { color: wellnessColors.textMuted, lineHeight: 16 },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    gap: spacing.sm,
  },
  diagKey: { fontWeight: '600', color: wellnessColors.textSecondary },
  diagValue: {
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  techJsonLabel: {
    color: wellnessColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: spacing.sm,
  },
  techJson: {
    lineHeight: 15,
    color: wellnessColors.textPrimary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    backgroundColor: wellnessColors.background,
    borderRadius: wellnessRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: wellnessColors.border,
  },
});
