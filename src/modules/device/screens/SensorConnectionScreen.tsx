import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useCalibrationSnapshot } from '@/src/modules/device/state/use-calibration-snapshot';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import type { SensorConnectionStatus } from '@/src/modules/device/types/sensor-reading';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellness,
  wellnessRadii,
  wellnessShadows,
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
  } = useSensorConnection();

  const { snapshot: calibrationSnapshot } = useCalibrationSnapshot();
  const [techExpanded, setTechExpanded] = useState(false);

  const isConnecting = status === 'connecting';
  const isOnline = status === 'connected' || status === 'receiving';
  const signalValid =
    Boolean(lastReading) &&
    lastReading?.distanceValid === true &&
    typeof lastReading?.distanceMm === 'number' &&
    Number.isFinite(lastReading?.distanceMm ?? NaN);
  const isMock = mode === 'mock' && isOnline;
  const liveReady = isOnline && signalValid;
  const hasCalibration = calibrationSnapshot.kind === 'ready';
  const readyForTherapy = liveReady && hasCalibration;

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

  const heroBadge = useMemo<{ label: string; tone: 'ok' | 'pending' | 'warn' | 'neutral' }>(() => {
    if (status === 'error') return { label: 'Error de conexión', tone: 'warn' };
    if (isConnecting) return { label: 'Conectando…', tone: 'neutral' };
    if (readyForTherapy) return { label: 'Dispositivo listo', tone: 'ok' };
    if (liveReady && !hasCalibration) return { label: 'Falta calibración', tone: 'pending' };
    if (isOnline) return { label: 'Sin señal válida', tone: 'pending' };
    return { label: 'No conectado', tone: 'neutral' };
  }, [hasCalibration, isConnecting, isOnline, liveReady, readyForTherapy, status]);

  const primaryAction = useMemo(() => {
    if (!isOnline) {
      return {
        label: isConnecting ? 'Conectando…' : 'Conectar dispositivo',
        onPress: onConnect,
        disabled: isConnecting,
      };
    }
    return null;
  }, [isConnecting, isOnline, onConnect]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/index" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Preparar dispositivo</Text>
        <Text style={styles.title}>Sensor y calibración</Text>
        <Text style={styles.subtitle}>
          Conecta el sensor por WiFi y revisa la calibración del espirómetro.
        </Text>

        <Text style={styles.sectionLabel}>Conexión del dispositivo</Text>
        {/* Zone A — Estado del dispositivo */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <IconSymbol name="dot.radiowaves.left.and.right" size={40} color={wellness.primaryDark} />
            </View>
            <View
              style={[
                styles.heroBadge,
                heroBadge.tone === 'ok' && styles.heroBadgeOk,
                heroBadge.tone === 'pending' && styles.heroBadgePending,
                heroBadge.tone === 'warn' && styles.heroBadgeWarn,
              ]}>
              {isConnecting ? (
                <ActivityIndicator size="small" color={wellness.primaryDark} />
              ) : null}
              <Text
                style={[
                  styles.heroBadgeText,
                  heroBadge.tone === 'ok' && styles.heroBadgeTextOk,
                  heroBadge.tone === 'pending' && styles.heroBadgeTextPending,
                  heroBadge.tone === 'warn' && styles.heroBadgeTextWarn,
                ]}>
                {heroBadge.label}
              </Text>
            </View>
          </View>

          <Text style={styles.heroStatus}>{statusLabel(status)}</Text>
          <Text style={styles.heroHint}>
            {readyForTherapy
              ? 'Conexión activa y calibración guardada. El dispositivo está listo.'
              : isOnline
                ? hasCalibration
                  ? 'Sensor conectado. Revisa la señal o actualiza la calibración si lo necesitas.'
                  : 'Sensor conectado. Falta registrar la calibración local.'
                : 'Conéctate por WiFi local al ESP32 para revisar el dispositivo.'}
          </Text>

          <View style={styles.statusPillRow}>
            <StatusPill
              label="Conexión"
              value={isOnline ? 'Activa' : 'Inactiva'}
              tone={isOnline ? 'ok' : 'neutral'}
            />
            <StatusPill
              label="Señal"
              value={signalValid ? 'Válida' : 'Sin lectura'}
              tone={signalValid ? 'ok' : isOnline ? 'pending' : 'neutral'}
            />
          </View>

          {status === 'error' && errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{errorMessage}</Text>
              <Pressable
                onPress={onResetConnection}
                style={({ pressed }) => [styles.errorBtn, pressed && styles.errorBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Limpiar conexión y reintentar">
                <Text style={styles.errorBtnText}>Limpiar conexión</Text>
              </Pressable>
            </View>
          ) : null}

        </View>

        {/* Zone B — Acciones principales */}
        {primaryAction ? (
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              primaryAction.disabled && styles.btnDisabled,
              pressed && !primaryAction.disabled && styles.primaryBtnPressed,
            ]}
            onPress={primaryAction.onPress}
            disabled={primaryAction.disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: primaryAction.disabled }}>
            <Text style={[styles.primaryBtnText, primaryAction.disabled && styles.btnTextDisabled]}>
              {primaryAction.label}
            </Text>
          </Pressable>
        ) : null}

        {/* Módulo 2 — Calibración */}
        <View style={styles.moduleDivider} />
        <Text style={styles.sectionLabel}>Calibración</Text>

        <View style={styles.calibrationModule}>
          <View style={styles.calibModuleHeader}>
            <View style={styles.calibModuleIconWrap}>
              <IconSymbol name="gearshape.fill" size={22} color={
                hasCalibration ? wellness.primaryDark : wellness.textSecondary
              } />
            </View>
            <View style={styles.calibModuleTextCol}>
              <Text style={styles.calibModuleTitle}>
                {calibrationSnapshot.kind === 'loading'
                  ? 'Revisando calibración…'
                  : hasCalibration
                    ? 'Calibración guardada'
                    : calibrationSnapshot.kind === 'corrupt'
                      ? 'Calibración con errores'
                      : 'Calibración pendiente'}
              </Text>
              <Text style={styles.calibModuleSubtitle}>
                {calibrationSnapshot.kind === 'ready'
                  ? `${calibrationSnapshot.profile.points.length} ${calibrationSnapshot.profile.points.length === 1 ? 'punto' : 'puntos'} · ${formatShortDate(calibrationSnapshot.profile.updatedAt)}`
                  : calibrationSnapshot.kind === 'corrupt'
                    ? 'El perfil guardado no se pudo leer. Recalibra desde cero.'
                    : calibrationSnapshot.kind === 'loading'
                      ? 'Comprobando datos guardados…'
                      : 'Registra la calibración para usar medición confiable.'}
              </Text>
            </View>
          </View>

          <View style={styles.calibModuleBtnRow}>
            <Pressable
              style={({ pressed }) => [styles.calibModuleBtn, pressed && styles.calibModuleBtnPressed]}
              onPress={onOpenCalibration}
              accessibilityRole="button"
              accessibilityLabel="Ver calibración">
              <Text style={styles.calibModuleBtnText}>
                {hasCalibration ? 'Ver calibración' : 'Ir a calibración'}
              </Text>
            </Pressable>
            {hasCalibration ? (
              <Pressable
                style={({ pressed }) => [styles.calibModuleBtnSecondary, pressed && styles.calibModuleBtnPressed]}
                onPress={onOpenCalibration}
                accessibilityRole="button"
                accessibilityLabel="Recalibrar">
                <Text style={styles.calibModuleBtnSecondaryText}>Recalibrar</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Secondary action — disconnect (solo si está conectado o conectando) */}
        {isOnline || isConnecting ? (
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
            onPress={onDisconnect}
            accessibilityRole="button"
            accessibilityLabel="Desconectar dispositivo">
            <Text style={styles.secondaryBtnText}>Desconectar</Text>
          </Pressable>
        ) : null}

        {/* SensorLivePreview siempre visible cuando hay lectura — feedback emocional inmediato */}
        {lastReading ? (
          <SensorLivePreview
            distanceMm={lastReading.distanceMm}
            rawDistanceMm={lastReading.rawDistanceMm}
            distanceValid={lastReading.distanceValid}
            source={lastReading.source}
            timestamp={lastReading.timestamp}
          />
        ) : null}

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
              <View style={styles.techCard}>
                <View style={styles.techHeaderRow}>
                  <View style={styles.techHeaderIcon}>
                    <IconSymbol name="gearshape.fill" size={16} color={wellness.textSecondary} />
                  </View>
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
                  placeholderTextColor={wellness.textSecondary}
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
                <Text style={styles.techDebugHint}>
                  Opciones para verificación técnica del sensor en este dispositivo.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.debugBtn, pressed && styles.debugBtnPressed]}
                  onPress={() => {
                    hapticLight();
                    if (isMock) stopMock();
                    else startMock();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={isMock ? 'Detener lectura de prueba' : 'Iniciar lectura de prueba'}>
                  <Text style={styles.debugBtnText}>
                    {isMock ? 'Detener lectura de prueba' : 'Iniciar lectura de prueba'}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.debugBtn, pressed && styles.debugBtnPressed]}
                  onPress={() => {
                    hapticLight();
                    router.push('/hardware-lab');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir laboratorio de hardware">
                  <Text style={styles.debugBtnText}>Laboratorio de hardware</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.debugBtn, pressed && styles.debugBtnPressed]}
                  onPress={() => {
                    hapticLight();
                    router.push('/esp32-raw-test');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Prueba raw WebSocket">
                  <Text style={styles.debugBtnText}>Prueba raw WebSocket</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'pending' | 'warn' | 'neutral';
}) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === 'ok' && styles.statusPillOk,
        tone === 'pending' && styles.statusPillPending,
        tone === 'warn' && styles.statusPillWarn,
      ]}>
      <Text style={styles.statusPillLabel}>{label}</Text>
      <Text
        style={[
          styles.statusPillValue,
          tone === 'ok' && styles.statusPillValueOk,
          tone === 'pending' && styles.statusPillValuePending,
          tone === 'warn' && styles.statusPillValueWarn,
        ]}>
        {value}
      </Text>
    </View>
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
  safe: { flex: 1, backgroundColor: wellness.screenBg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: wellness.text,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: wellness.textSecondary,
    marginBottom: spacing.lg,
  },
  heroCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.border,
    ...wellnessShadows.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: wellness.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  heroBadgeOk: { backgroundColor: wellness.successBg, borderColor: wellness.border },
  heroBadgePending: { backgroundColor: wellness.softGreen, borderColor: wellness.border },
  heroBadgeWarn: { backgroundColor: wellness.errorBg, borderColor: wellness.borderStrong },
  heroBadgeText: { fontSize: 12, fontWeight: '800', color: wellness.textSecondary, letterSpacing: 0.2 },
  heroBadgeTextOk: { color: wellness.primaryDark },
  heroBadgeTextPending: { color: wellness.text },
  heroBadgeTextWarn: { color: wellness.errorText },
  heroStatus: {
    fontSize: 24,
    fontWeight: '800',
    color: wellness.primaryDark,
    letterSpacing: -0.3,
  },
  heroHint: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: wellness.textSecondary,
  },
  statusPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statusPill: {
    flexGrow: 1,
    flexBasis: '30%',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  statusPillOk: { backgroundColor: wellness.successBg, borderColor: wellness.border },
  statusPillPending: { backgroundColor: wellness.softGreen, borderColor: wellness.border },
  statusPillWarn: { backgroundColor: wellness.errorBg, borderColor: wellness.borderStrong },
  statusPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusPillValue: { fontSize: 15, fontWeight: '800', color: wellness.text, marginTop: 2 },
  statusPillValueOk: { color: wellness.primaryDark },
  statusPillValuePending: { color: wellness.text },
  statusPillValueWarn: { color: wellness.errorText },
  errorBox: {
    marginTop: spacing.md,
    backgroundColor: wellness.errorBg,
    borderRadius: wellnessRadii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    gap: spacing.sm,
  },
  errorBoxText: { fontSize: 14, lineHeight: 20, color: wellness.errorText, fontWeight: '600' },
  errorBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
  },
  errorBtnPressed: { opacity: 0.9 },
  errorBtnText: { fontSize: 13, fontWeight: '800', color: wellness.errorText },
  primaryBtn: {
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    ...wellnessShadows.cardPress,
  },
  primaryBtnPressed: { opacity: 0.92 },
  primaryBtnText: { fontSize: 17, fontWeight: '800', color: wellness.primaryDark },
  secondaryBtn: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
  },
  secondaryBtnPressed: { opacity: 0.92 },
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: wellness.primaryDark },
  btnDisabled: { opacity: 0.45 },
  btnTextDisabled: { color: wellness.textSecondary },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  moduleDivider: {
    height: 1,
    backgroundColor: wellness.border,
    marginVertical: spacing.lg,
  },
  calibrationModule: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.md,
    ...wellnessShadows.card,
  },
  calibModuleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  calibModuleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calibModuleTextCol: { flex: 1 },
  calibModuleTitle: { fontSize: 17, fontWeight: '800', color: wellness.text },
  calibModuleSubtitle: { fontSize: 14, color: wellness.textSecondary, marginTop: 2, lineHeight: 20 },
  calibModuleBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  calibModuleBtn: {
    flex: 1,
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.borderStrong,
  },
  calibModuleBtnPressed: { opacity: 0.92 },
  calibModuleBtnText: { fontSize: 15, fontWeight: '800', color: wellness.primaryDark },
  calibModuleBtnSecondary: {
    flex: 1,
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.borderStrong,
  },
  calibModuleBtnSecondaryText: { fontSize: 15, fontWeight: '700', color: wellness.primaryDark },
  savedCalibCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.border,
    gap: spacing.md,
    ...wellnessShadows.card,
  },
  savedCalibCardWarn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: wellness.errorBg,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    gap: spacing.md,
  },
  savedCalibCardPressed: { opacity: 0.94 },
  savedCalibIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: wellness.successBg,
    borderWidth: 1,
    borderColor: wellness.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCalibIconWarnWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: wellness.errorBg,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedCalibTextCol: { flex: 1 },
  savedCalibTitle: { fontSize: 16, fontWeight: '800', color: wellness.text },
  savedCalibTitleWarn: { fontSize: 16, fontWeight: '800', color: wellness.errorText },
  savedCalibMeta: { fontSize: 13, color: wellness.textSecondary, marginTop: 2, lineHeight: 18 },
  savedCalibCta: { marginTop: 6, fontSize: 14, fontWeight: '700', color: wellness.link },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.sm,
  },
  accordionHeaderPressed: { opacity: 0.94 },
  accordionTitle: { fontSize: 14, fontWeight: '800', color: wellness.text, letterSpacing: 0.1 },
  accordionChevron: { fontSize: 16, fontWeight: '800', color: wellness.textSecondary },
  techCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.md,
  },
  techHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  techHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techSection: {
    fontSize: 12,
    fontWeight: '800',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  techDivider: {
    height: 1,
    backgroundColor: wellness.border,
    marginVertical: spacing.md,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    backgroundColor: wellness.screenBg,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: wellness.text,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  urlHint: { fontSize: 12, color: wellness.textSecondary, lineHeight: 16 },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    gap: spacing.sm,
  },
  diagKey: { fontSize: 13, fontWeight: '600', color: wellness.textSecondary },
  diagValue: {
    fontSize: 13,
    fontWeight: '700',
    color: wellness.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  techJsonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  techJson: {
    fontSize: 12,
    lineHeight: 16,
    color: wellness.text,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    backgroundColor: wellness.screenBg,
    borderRadius: 10,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  techDebugHint: {
    fontSize: 12,
    color: wellness.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  debugBtn: {
    backgroundColor: wellness.screenBg,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.sm,
  },
  debugBtnPressed: { opacity: 0.9 },
  debugBtnText: { fontSize: 14, fontWeight: '700', color: wellness.textSecondary },
});
