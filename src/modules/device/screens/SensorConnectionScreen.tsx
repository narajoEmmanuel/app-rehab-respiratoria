import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { isSensorDebugEnabled } from '@/src/modules/app-mode';
import { SensorLivePreview } from '@/src/modules/device/components/SensorLivePreview';
import {
  getTherapyFromSnapshot,
  isTherapyReadyForActiveSpirometer,
  useCalibrationSnapshot,
} from '@/src/modules/device/state/use-calibration-snapshot';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import {
  isSensorStreamActivelyReceiving,
  SENSOR_STREAM_STATE_LABELS,
} from '@/src/modules/device/stream/sensor-stream-state';
import type { SensorConnectionStatus } from '@/src/modules/device/types/sensor-reading';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { InfoTile } from '@/src/shared/ui/InfoTile';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellnessColors,
  wellnessRadius,
} from '@/src/shared/theme/wellness-theme';

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

function formatShortDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

export function SensorConnectionScreen() {
  const router = useRouter();
  const debug = isSensorDebugEnabled();

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

  const connectionPillLabel = useMemo(() => {
    if (status === 'error') return 'Error';
    if (readyForTherapy) return 'Listo';
    if (liveReady && !therapyReady) return 'Falta calibración';
    if (isOnline) return 'Conectado';
    if (isConnecting) return 'Conectando…';
    return 'Sin conexión';
  }, [isConnecting, isOnline, liveReady, readyForTherapy, status, therapyReady]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/index" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <SectionHeader
          title="Sensor y calibración"
          subtitle="Conecta el sensor por WiFi y revisa la calibración del espirómetro."
        />

        {/* Connection Card */}
        <AppCard>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <IconSymbol name="dot.radiowaves.left.and.right" size={28} color={wellnessColors.primaryDark} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Conexión del dispositivo</Text>
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
              label="Calibración"
              value={therapyReadiness.statusLabel}
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

          <Text style={styles.hint}>
            {streamStateMessage ??
              (readyForTherapy
                ? 'Conexión activa y calibración verificada. Listo para terapia.'
                : isOnline
                  ? therapyReady
                    ? 'Sensor conectado. Revisa la señal si el volumen no aparece en vivo.'
                    : therapyReadiness.detailMessage ??
                      'Sensor conectado. Completa la calibración verificada del espirómetro.'
                  : 'Conecta el dispositivo por WiFi local al ESP32.')}
          </Text>

          {status === 'error' && errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMessage}</Text>
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

        {/* Calibration Card */}
        <View style={styles.divider} />

        <AppCard>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, therapyReady && styles.cardIconWrapActive]}>
              <IconSymbol
                name="gearshape.fill"
                size={22}
                color={therapyReady ? wellnessColors.primaryDark : wellnessColors.textMuted}
              />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>
                {calibrationSnapshot.kind === 'loading'
                  ? 'Revisando calibración…'
                  : therapyReady
                    ? 'Calibración verificada'
                    : calibrationSnapshot.kind === 'corrupt'
                      ? 'Calibración con errores'
                      : 'Calibración pendiente'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {therapyReady
                  ? `${therapyReadiness.spirometerLabel ?? 'Espirómetro'} · ${formatShortDate(
                      calibrationSnapshot.kind === 'ready'
                        ? calibrationSnapshot.profile.updatedAt
                        : Date.now(),
                    )}`
                  : calibrationSnapshot.kind === 'corrupt'
                    ? 'El perfil guardado no se pudo leer. Configura de nuevo el espirómetro.'
                    : calibrationSnapshot.kind === 'loading'
                      ? 'Comprobando configuración…'
                      : therapyReadiness.detailMessage ??
                        'Configura tu espirómetro para estimar el volumen en terapia.'}
              </Text>
            </View>
          </View>

          <View style={styles.calibActions}>
            <AppButton
              title={therapyReady ? 'Ver espirómetro' : 'Configurar espirómetro'}
              onPress={onOpenCalibration}
              variant="secondary"
            />
          </View>
        </AppCard>

        {/* SensorLivePreview */}
        {lastReading ? (
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
              <Text style={styles.accordionTitle}>Detalles técnicos</Text>
              <Text style={styles.accordionChevron}>{techExpanded ? '▾' : '▸'}</Text>
            </Pressable>

            {techExpanded ? (
              <AppCard style={styles.techCard}>
                <View style={styles.techHeaderRow}>
                  <IconSymbol name="gearshape.fill" size={16} color={wellnessColors.textSecondary} />
                  <Text style={styles.techSection}>Conexión y diagnóstico</Text>
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
                <Text style={styles.urlHint}>
                  URL del WebSocket del ESP32. Cambia solo si tu firmware usa otra dirección.
                </Text>

                <View style={styles.techDivider} />
                <Text style={styles.techSection}>Telemetría</Text>
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

                <Text style={styles.techJsonLabel}>Último JSON crudo</Text>
                <Text style={styles.techJson} numberOfLines={6}>
                  {lastRawMessage ? truncateJson(lastRawMessage) : 'Sin mensajes recibidos aún.'}
                </Text>

                <View style={styles.techDivider} />
                <Text style={styles.techSection}>Diagnóstico avanzado</Text>

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
      <Text style={styles.diagKey}>{label}</Text>
      <Text style={styles.diagValue} numberOfLines={2}>
        {value}
      </Text>
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
  cardIconWrapActive: {
    backgroundColor: wellnessColors.successSoft,
  },
  cardHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: wellnessColors.textSecondary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hint: {
    fontSize: 13,
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
    fontSize: 13,
    lineHeight: 18,
    color: wellnessColors.danger,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: wellnessColors.border,
    marginVertical: spacing.sm,
  },
  calibActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  accordionTitle: { fontSize: 14, fontWeight: '700', color: wellnessColors.textPrimary },
  accordionChevron: { fontSize: 16, fontWeight: '800', color: wellnessColors.textMuted },
  techCard: {
    gap: spacing.sm,
  },
  techHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  techSection: {
    fontSize: 12,
    fontWeight: '700',
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
  urlHint: { fontSize: 12, color: wellnessColors.textMuted, lineHeight: 16 },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    gap: spacing.sm,
  },
  diagKey: { fontSize: 12, fontWeight: '600', color: wellnessColors.textSecondary },
  diagValue: {
    fontSize: 12,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  techJsonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: wellnessColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: spacing.sm,
  },
  techJson: {
    fontSize: 11,
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
