import { useRouter } from 'expo-router';
import { useCallback } from 'react';
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

import { useEsp32WebSocketSensor } from '@/src/modules/device/adapters/use-esp32-websocket-sensor';
import { SensorLivePreview } from '@/src/modules/device/components/SensorLivePreview';
import { isCloudAuthEnabled, isHardwareLabAccessible } from '@/src/modules/app-mode';
import {
  OFFLINE_SENSOR_TEST_USER,
  isOfflineSensorTestEnabled,
} from '@/src/modules/device/offline-sensor-test';
import type { SensorConnectionStatus } from '@/src/modules/device/types/sensor-reading';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
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
      return 'idle';
    case 'connecting':
      return 'connecting';
    case 'connected':
      return 'connected';
    case 'error':
      return 'error';
    case 'disconnected':
      return 'disconnected';
    case 'receiving':
      return 'connected';
    default:
      return state;
  }
}

function formatBoolean(value: boolean | undefined): string {
  if (value === undefined) return '—';
  return value ? 'sí' : 'no';
}

function formatNumber(value: number | undefined, suffix = ''): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return `${value}${suffix}`;
}

function truncateJson(raw: string | null, maxLength = 320): string {
  if (!raw) return '—';
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength)}…`;
}

export function SensorConnectionScreen() {
  const router = useRouter();
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
    startMock,
    stopMock,
  } = useEsp32WebSocketSensor();

  const onConnect = useCallback(() => {
    hapticLight();
    connect();
  }, [connect]);

  const onStartMock = useCallback(() => {
    hapticLight();
    startMock();
  }, [startMock]);

  const onStopMock = useCallback(() => {
    hapticLight();
    stopMock();
  }, [stopMock]);

  const onDisconnect = useCallback(() => {
    hapticLight();
    disconnect();
  }, [disconnect]);

  const isConnecting = status === 'connecting';
  const showReading = Boolean(lastReading);
  const sustainedSeconds = lastReading ? (lastReading.sustainedTimeMs / 1000).toFixed(1) : '0.0';
  const modeLabel = mode === 'mock' ? 'simulado' : 'real';
  const showPrototypeOrDevBanner = !isCloudAuthEnabled() || isOfflineSensorTestEnabled;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/index" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Conexión del sensor</Text>

        {showPrototypeOrDevBanner ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              {!isCloudAuthEnabled()
                ? 'Modo prototipo local, datos no sincronizados con la nube'
                : 'Modo offline de prueba de sensor, no sincronizado con la nube'}
            </Text>
            {isOfflineSensorTestEnabled ? (
              <Text style={styles.offlineBannerMeta}>
                Usuario local: {OFFLINE_SENSOR_TEST_USER.name} ({OFFLINE_SENSOR_TEST_USER.id}) -{' '}
                {OFFLINE_SENSOR_TEST_USER.source}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Estado</Text>
          <View style={styles.statusRow}>
            {isConnecting ? (
              <ActivityIndicator size="small" color={wellness.primaryDark} />
            ) : null}
            <Text style={styles.statusValue}>{statusLabel(status)}</Text>
          </View>
          <Text style={styles.statusHint}>Modo activo: {modeLabel}</Text>
        </View>

        <View style={styles.urlCard}>
          <Text style={styles.statusLabel}>URL WebSocket del ESP32</Text>
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
          <Text style={styles.urlHint}>Usa WiFi local para conectarte al ESP32 por WebSocket.</Text>
        </View>

        <View style={styles.diagCard}>
          <Text style={styles.statusLabel}>Diagnóstico ESP32</Text>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>Estado</Text>
            <Text style={styles.diagValue}>{statusLabel(status)}</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>Modo</Text>
            <Text style={styles.diagValue}>{modeLabel}</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>URL</Text>
            <Text style={styles.diagValue} numberOfLines={1}>
              {url || '—'}
            </Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>Último error</Text>
            <Text style={styles.diagValue}>{errorMessage ?? '—'}</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>Close code</Text>
            <Text style={styles.diagValue}>{closeCode === null ? '—' : String(closeCode)}</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>Close reason</Text>
            <Text style={styles.diagValue}>{closeReason ?? '—'}</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>source</Text>
            <Text style={styles.diagValue}>{lastReading?.source ?? '—'}</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>distanceMm</Text>
            <Text style={styles.diagValue}>{formatNumber(lastReading?.distanceMm, ' mm')}</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>rawDistanceMm</Text>
            <Text style={styles.diagValue}>{formatNumber(lastReading?.rawDistanceMm, ' mm')}</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>distanceValid</Text>
            <Text style={styles.diagValue}>{formatBoolean(lastReading?.distanceValid)}</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>timestamp</Text>
            <Text style={styles.diagValue}>{formatNumber(lastReading?.timestamp)}</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagKey}>Mensajes</Text>
            <Text style={styles.diagValue}>
              {messageCount} ({messagesPerSecond.toFixed(1)} mps)
            </Text>
          </View>
          <Text style={[styles.diagKey, styles.diagJsonLabel]}>Último JSON crudo</Text>
          <Text style={styles.diagJson} numberOfLines={6}>
            {lastRawMessage ? truncateJson(lastRawMessage) : 'Sin mensajes recibidos aún.'}
          </Text>
          <Text style={[styles.diagKey, styles.diagJsonLabel]}>Último SensorReading parseado</Text>
          <Text style={styles.diagJson} numberOfLines={6}>
            {lastReading ? truncateJson(JSON.stringify(lastReading)) : 'Sin lectura parseada aún.'}
          </Text>
        </View>

        <SensorLivePreview
          distanceMm={lastReading?.distanceMm}
          rawDistanceMm={lastReading?.rawDistanceMm}
          distanceValid={lastReading?.distanceValid}
          source={lastReading?.source}
          timestamp={lastReading?.timestamp}
        />

        {isHardwareLabAccessible() ? (
          <View style={styles.labCard}>
            <Text style={styles.statusLabel}>Hardware Lab</Text>
            <Text style={styles.labHint}>
              Diagnóstico y rutas de prueba del ESP32 (WiFi local, sin Bluetooth).
            </Text>
            <Pressable
              style={({ pressed }) => [styles.labLink, pressed && styles.labLinkPressed]}
              onPress={() => {
                hapticLight();
                router.push('/hardware-lab');
              }}
              accessibilityRole="button"
              accessibilityLabel="Abrir Hardware Lab">
              <Text style={styles.labLinkText}>Abrir Hardware Lab</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.labLinkSecondary, pressed && styles.labLinkPressed]}
              onPress={() => {
                hapticLight();
                router.push('/esp32-raw-test');
              }}
              accessibilityRole="button"
              accessibilityLabel="Prueba raw WebSocket avanzada">
              <Text style={styles.labLinkSecondaryText}>Prueba raw WebSocket (avanzado)</Text>
            </Pressable>
          </View>
        ) : null}

        {(status === 'connected' || status === 'receiving' || mode === 'mock') && showReading ? (
          <View style={styles.bannerOk}>
            <IconSymbol name="checkmark.circle.fill" size={22} color={wellness.primaryDark} />
            <Text style={styles.bannerOkText}>
              {mode === 'mock'
                ? 'Modo demostración activo. Puedes usar la app sin hardware.'
                : 'Conexión ESP32 activa por WiFi local y WebSocket.'}
            </Text>
          </View>
        ) : null}

        {status === 'error' && errorMessage ? (
          <View style={styles.bannerErr}>
            <Text style={styles.bannerErrText}>{errorMessage}</Text>
          </View>
        ) : null}

        {showReading ? (
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Última lectura recibida</Text>
            <Text style={styles.readingValue}>Volumen: {lastReading?.volumeMl ?? 0} mL</Text>
            <Text style={styles.readingHint}>Tiempo sostenido: {sustainedSeconds} s</Text>
            <Text style={styles.readingHint}>
              Repeticiones válidas: {lastReading?.validRepetitions ?? 0}
            </Text>
            <Text style={styles.readingHint}>
              Estado de flujo: {lastReading?.flowState ?? 'idle'} ({lastReading?.source ?? mode})
            </Text>
          </View>
        ) : (
          <View style={styles.readingCardMuted}>
            <Text style={styles.readingMuted}>
              Conecta por WiFi local o activa el modo demostración para ver lecturas.
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            isConnecting && styles.btnDisabled,
            pressed && !isConnecting && styles.primaryBtnPressed,
          ]}
          onPress={onConnect}
          disabled={isConnecting}
          accessibilityRole="button"
          accessibilityState={{ disabled: isConnecting }}>
          <Text style={[styles.primaryBtnText, isConnecting && styles.btnTextDisabled]}>
            Conectar por WiFi
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.secondaryBtnPressed,
          ]}
          onPress={onDisconnect}
          accessibilityRole="button">
          <Text style={styles.secondaryBtnText}>Desconectar</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
          onPress={onStartMock}
          accessibilityRole="button">
          <Text style={styles.ghostBtnText}>Usar modo demostración</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
          onPress={onStopMock}
          accessibilityRole="button">
          <Text style={styles.ghostBtnText}>Detener demostración</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wellness.screenBg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: wellness.text,
    letterSpacing: -0.3,
    marginBottom: spacing.lg,
  },
  statusCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.md,
    ...wellnessShadows.cardPress,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  statusHint: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: wellness.textSecondary,
  },
  urlCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.md,
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
  urlHint: {
    fontSize: 13,
    color: wellness.textSecondary,
    lineHeight: 18,
  },
  diagCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.md,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    gap: spacing.sm,
  },
  diagKey: {
    fontSize: 13,
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  diagValue: {
    fontSize: 14,
    fontWeight: '700',
    color: wellness.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  diagJsonLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  diagJson: {
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
  bannerOk: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: wellness.successBg,
    borderRadius: wellnessRadii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.sm,
  },
  bannerOkText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: wellness.primaryDark,
    fontWeight: '600',
  },
  bannerErr: {
    backgroundColor: wellness.errorBg,
    borderRadius: wellnessRadii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    marginBottom: spacing.lg,
  },
  bannerErrText: {
    fontSize: 15,
    lineHeight: 22,
    color: wellness.errorText,
    fontWeight: '600',
  },
  offlineBanner: {
    backgroundColor: wellness.softGreen,
    borderRadius: wellnessRadii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    marginBottom: spacing.md,
  },
  offlineBannerText: {
    fontSize: 15,
    lineHeight: 21,
    color: wellness.text,
    fontWeight: '700',
  },
  offlineBannerMeta: {
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 18,
    color: wellness.textSecondary,
  },
  labCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.md,
  },
  labHint: {
    fontSize: 14,
    color: wellness.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  labLink: {
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
  },
  labLinkPressed: { opacity: 0.92 },
  labLinkText: { fontSize: 16, fontWeight: '800', color: wellness.primaryDark },
  labLinkSecondary: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  labLinkSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: wellness.link,
    textDecorationLine: 'underline',
  },
  readingCard: {
    backgroundColor: wellness.cardGlass,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.lg,
    ...wellnessShadows.card,
  },
  readingCardMuted: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.lg,
  },
  readingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: wellness.textSecondary,
    marginBottom: spacing.xs,
  },
  readingValue: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.primaryDark,
    marginBottom: spacing.sm,
  },
  readingHint: { fontSize: 14, lineHeight: 20, color: wellness.textSecondary },
  readingMuted: { fontSize: 15, lineHeight: 22, color: wellness.textSecondary },
  primaryBtn: {
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md + 2,
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
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
  },
  secondaryBtnPressed: { opacity: 0.92 },
  secondaryBtnText: { fontSize: 17, fontWeight: '700', color: wellness.primaryDark },
  ghostBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  ghostBtnPressed: { opacity: 0.8 },
  ghostBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.link,
    textDecorationLine: 'underline',
  },
  btnDisabled: { opacity: 0.45 },
  btnTextDisabled: { color: wellness.textSecondary },
});
