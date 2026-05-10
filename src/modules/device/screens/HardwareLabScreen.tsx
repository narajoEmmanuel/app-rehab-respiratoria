import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isHardwareLabAccessible, isOfflineSensorTestEnabled, useAppMode } from '@/src/modules/app-mode';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellness,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

export function HardwareLabScreen() {
  const router = useRouter();
  const { setMode } = useAppMode();
  const labEnabled = isHardwareLabAccessible();

  useFocusEffect(
    useCallback(() => {
      if (isOfflineSensorTestEnabled()) {
        setMode('offline_sensor_test');
      }
    }, [setMode]),
  );

  const goHome = () => {
    router.replace('/');
  };

  if (!labEnabled) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.blockedInner}>
          <Text style={styles.blockedTitle}>Hardware Lab no disponible</Text>
          <Text style={styles.blockedBody}>
            En prototipo local (EXPO_PUBLIC_ENABLE_CLOUD_AUTH distinto de true) el lab está disponible. En
            desarrollo con nube activada, define también EXPO_PUBLIC_ENABLE_OFFLINE_SENSOR_TEST=true.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio"
          >
            <Text style={styles.primaryBtnLabel}>Volver al inicio</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Hardware Lab</Text>
        <Text style={styles.subtitle}>Modo local de prueba de sensor</Text>
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Este laboratorio es experimental, no clínico y no sincroniza datos.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => router.push('/sensor-connection')}
          accessibilityRole="button"
          accessibilityLabel="Conexión del sensor"
        >
          <Text style={styles.cardTitle}>Conexión del sensor</Text>
          <Text style={styles.cardDesc}>
            Estado WebSocket, diagnóstico ESP32 y vista previa en vivo (distanceMm).
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => router.push('/esp32-raw-test')}
          accessibilityRole="button"
          accessibilityLabel="Prueba raw WebSocket"
        >
          <Text style={styles.cardTitle}>Prueba raw WebSocket</Text>
          <Text style={styles.cardDesc}>
            Prueba mínima de respaldo para verificar conexión directa con el ESP32.
          </Text>
        </Pressable>

        <Text style={styles.upcomingNote}>
          Más herramientas de laboratorio se enlazarán aquí cuando el protocolo lo defina.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
          onPress={goHome}
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
        >
          <Text style={styles.ghostBtnLabel}>Volver al inicio</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellness.screenBg,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  blockedInner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: wellness.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  blockedBody: {
    fontSize: 15,
    color: wellness.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: wellness.primaryDark,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: wellness.textSecondary,
    marginBottom: spacing.md,
  },
  warningBox: {
    backgroundColor: wellness.softGreen,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: wellness.primaryDark,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...wellnessShadows.card,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.text,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    fontSize: 14,
    color: wellness.textSecondary,
    lineHeight: 20,
  },
  upcomingNote: {
    fontSize: 13,
    lineHeight: 18,
    color: wellness.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  primaryBtn: {
    alignSelf: 'center',
    backgroundColor: wellness.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: wellnessRadii.card,
  },
  primaryBtnLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ghostBtn: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  ghostBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: wellness.link,
  },
  pressed: {
    opacity: 0.88,
  },
});
