/**
 * Purpose: Simulated sensor discovery, connection, and calibration (WiFi/WebSocket real en fases posteriores; ahora mock / modo demostración).
 * Module: device
 * Dependencies: expo-router, react-native, device mocks, wellness theme
 * Notes: UI state only; safe for Expo Go. Move route to (tabs) later without changing this file.
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import { mockRespiratorySamples } from '@/src/modules/device/mocks/mock-device-data';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellness,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

export type SensorConnectionFlowState =
  | 'disconnected'
  | 'scanning'
  | 'connected'
  | 'calibrated'
  | 'error';

const SCAN_MS = 1600;
const CALIBRATE_MS = 1200;
const READING_MS = 700;

function hapticLight() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function statusLabel(state: SensorConnectionFlowState): string {
  switch (state) {
    case 'disconnected':
      return 'Desconectado';
    case 'scanning':
      return 'Buscando sensor…';
    case 'connected':
      return 'Conectado';
    case 'calibrated':
      return 'Calibrado';
    case 'error':
      return 'Error de conexión';
    default:
      return state;
  }
}

export function SensorConnectionScreen() {
  const router = useRouter();
  const [flow, setFlow] = useState<SensorConnectionFlowState>('disconnected');
  const [readingIndex, setReadingIndex] = useState(0);
  const [usingSimulatedData, setUsingSimulatedData] = useState(false);
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calibrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearScanTimer = useCallback(() => {
    if (scanTimer.current) {
      clearTimeout(scanTimer.current);
      scanTimer.current = null;
    }
  }, []);

  const clearCalibrateTimer = useCallback(() => {
    if (calibrateTimer.current) {
      clearTimeout(calibrateTimer.current);
      calibrateTimer.current = null;
    }
  }, []);

  const clearReadingTimer = useCallback(() => {
    if (readingTimer.current) {
      clearInterval(readingTimer.current);
      readingTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearScanTimer();
      clearCalibrateTimer();
      clearReadingTimer();
    };
  }, [clearScanTimer, clearCalibrateTimer, clearReadingTimer]);

  const showReading =
    usingSimulatedData || flow === 'connected' || flow === 'calibrated';
  const sample = mockRespiratorySamples[readingIndex % mockRespiratorySamples.length];

  useEffect(() => {
    if (!showReading) {
      clearReadingTimer();
      return;
    }
    readingTimer.current = setInterval(() => {
      setReadingIndex((i) => i + 1);
    }, READING_MS);
    return clearReadingTimer;
  }, [showReading, clearReadingTimer]);

  const onSearch = useCallback(() => {
    hapticLight();
    clearScanTimer();
    setUsingSimulatedData(false);
    setFlow('scanning');

    scanTimer.current = setTimeout(() => {
      const fail = Math.random() < 0.22;
      if (fail) {
        setFlow('error');
      } else {
        setFlow('connected');
      }
      scanTimer.current = null;
    }, SCAN_MS);
  }, [clearScanTimer]);

  const onCalibrate = useCallback(() => {
    if (flow !== 'connected') return;
    hapticLight();
    clearCalibrateTimer();

    calibrateTimer.current = setTimeout(() => {
      setFlow('calibrated');
      calibrateTimer.current = null;
    }, CALIBRATE_MS);
  }, [flow, clearCalibrateTimer]);

  const onSimulated = useCallback(() => {
    hapticLight();
    clearScanTimer();
    clearCalibrateTimer();
    setFlow('calibrated');
    setUsingSimulatedData(true);
  }, [clearScanTimer, clearCalibrateTimer]);

  const scanning = flow === 'scanning';
  const canSearch = !scanning;
  const canCalibrate = flow === 'connected';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            hapticLight();
            router.back();
          }}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Volver">
          <IconSymbol name="chevron.left" size={22} color={wellness.primaryDark} />
          <Text style={styles.backLabel}>Volver</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Conexión y calibración del sensor</Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Estado</Text>
          <View style={styles.statusRow}>
            {scanning ? (
              <ActivityIndicator size="small" color={wellness.primaryDark} />
            ) : null}
            <Text style={styles.statusValue}>{statusLabel(flow)}</Text>
          </View>
        </View>

        {flow === 'connected' || flow === 'calibrated' || usingSimulatedData ? (
          <View style={styles.bannerOk}>
            <IconSymbol name="checkmark.circle.fill" size={22} color={wellness.primaryDark} />
            <Text style={styles.bannerOkText}>
              Sensor conectado de forma simulada. La lectura inferior es solo de demostración.
            </Text>
          </View>
        ) : null}

        {flow === 'calibrated' || usingSimulatedData ? (
          <View style={styles.bannerCal}>
            <Text style={styles.bannerCalText}>
              Calibración simulada lista. Puedes continuar con tu sesión cuando integremos el
              hardware real.
            </Text>
          </View>
        ) : null}

        {flow === 'error' ? (
          <View style={styles.bannerErr}>
            <Text style={styles.bannerErrText}>
              No se encontró ningún sensor (simulación). Pulsa «Buscar sensor» para intentarlo de
              nuevo.
            </Text>
          </View>
        ) : null}

        {showReading ? (
          <View style={styles.readingCard}>
            <Text style={styles.readingLabel}>Lectura simulada del sensor</Text>
            <Text style={styles.readingValue}>
              Flujo: {sample.flow.toFixed(2)} (t = {sample.timestamp}s)
            </Text>
            <Text style={styles.readingHint}>
              Datos simulados del sensor (modo demostración); la lectura en vivo llegará por WebSocket en la WiFi local.
            </Text>
          </View>
        ) : (
          <View style={styles.readingCardMuted}>
            <Text style={styles.readingMuted}>Conecta o usa datos simulados para ver la lectura.</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            !canSearch && styles.btnDisabled,
            pressed && canSearch && styles.primaryBtnPressed,
          ]}
          onPress={onSearch}
          disabled={!canSearch}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSearch }}>
          <Text style={[styles.primaryBtnText, !canSearch && styles.btnTextDisabled]}>
            Buscar sensor
          </Text>
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
          onPress={onSimulated}
          accessibilityRole="button">
          <Text style={styles.ghostBtnText}>Usar datos simulados</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wellness.screenBg },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  backBtnPressed: { opacity: 0.75 },
  backLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: wellness.primaryDark,
  },
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
