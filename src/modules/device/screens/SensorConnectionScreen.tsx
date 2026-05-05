/**
 * Purpose: Simulated sensor discovery, connection, and calibration (WiFi/WebSocket real en fases posteriores; ahora mock / modo demostración).
 * Module: device
 * Dependencies: expo-router, react-native, device mocks, wellness theme
 * Notes: UI state only; safe for Expo Go. Move route to (tabs) later without changing this file.
 */
import { useCallback, useEffect, useState } from 'react';
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
      return 'Inactivo';
    case 'connecting':
      return 'Conectando por WiFi local…';
    case 'connected':
      return 'Conectado por WebSocket';
    case 'receiving':
      return 'Recibiendo datos';
    case 'error':
      return 'Error de conexión';
    case 'disconnected':
      return 'Desconectado';
    default:
      return state;
  }
}

export function SensorConnectionScreen() {
  const {
    status,
    mode,
    lastReading,
    errorMessage,
    url,
    setUrl,
    connect,
    disconnect,
    startMock,
    stopMock,
  } = useEsp32WebSocketSensor();
  const [isCalibrated, setIsCalibrated] = useState(false);

  const onConnect = useCallback(() => {
    hapticLight();
    setIsCalibrated(false);
    connect();
  }, [connect]);

  const onCalibrate = useCallback(() => {
    if (status !== 'connected' && status !== 'receiving') return;
    hapticLight();
    setIsCalibrated(true);
  }, [status]);

  const onStartMock = useCallback(() => {
    hapticLight();
    setIsCalibrated(false);
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

  useEffect(() => {
    if (status === 'disconnected' || status === 'error') {
      setIsCalibrated(false);
    }
  }, [status]);

  const isConnecting = status === 'connecting';
  const canCalibrate = status === 'connected' || status === 'receiving';
  const showReading = Boolean(lastReading);
  const sustainedSeconds = lastReading ? (lastReading.sustainedTimeMs / 1000).toFixed(1) : '0.0';
  const modeLabel = mode === 'mock' ? 'Modo demostración' : 'WebSocket (ESP32)';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/index" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Conexión y calibración del sensor</Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Estado</Text>
          <View style={styles.statusRow}>
            {isConnecting ? (
              <ActivityIndicator size="small" color={wellness.primaryDark} />
            ) : null}
            <Text style={styles.statusValue}>{statusLabel(status)}</Text>
          </View>
          <Text style={styles.statusHint}>Modo actual: {modeLabel}</Text>
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

        {isCalibrated ? (
          <View style={styles.bannerCal}>
            <Text style={styles.bannerCalText}>
              Calibración de sensor completada en esta pantalla.
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
          style={({ pressed }) => [
            styles.secondaryBtn,
            !canCalibrate && styles.btnDisabled,
            pressed && canCalibrate && styles.secondaryBtnPressed,
          ]}
          onPress={onCalibrate}
          disabled={!canCalibrate}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canCalibrate }}>
          <Text style={[styles.secondaryBtnText, !canCalibrate && styles.btnTextDisabled]}>
            Calibrar sensor
          </Text>
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
  bannerCal: {
    backgroundColor: wellness.softGreen,
    borderRadius: wellnessRadii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.lg,
  },
  bannerCalText: {
    fontSize: 15,
    lineHeight: 22,
    color: wellness.text,
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
