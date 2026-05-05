import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const TEST_SECONDS = 5;

export function DiagnosticExamScreen() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TEST_SECONDS);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [maxVolume, setMaxVolume] = useState(0);
  const [balloonScale, setBalloonScale] = useState(1);

  useEffect(() => {
    if (!started || secondsLeft <= 0) return;

    const intervalId = setInterval(() => {
      setCurrentVolume((prev) => {
        const next = Math.max(0, prev + Math.floor(Math.random() * 180 - 20));
        setMaxVolume((oldMax) => Math.max(oldMax, next));
        setBalloonScale(1 + Math.min(0.9, next / 2500));
        return next;
      });
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [started, secondsLeft]);

  useEffect(() => {
    if (started && secondsLeft <= 0) {
      router.replace({
        pathname: '/diagnostico-resumen',
        params: { vim: String(maxVolume) },
      });
    }
  }, [maxVolume, router, secondsLeft, started]);

  const instruction = useMemo(
    () =>
      started
        ? 'Mantente inhalando durante la simulación.'
        : 'Inhala lo más profundo posible y mantén durante 5 segundos',
    [started],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar
        showBackButton
        backFallbackHref="/(tabs)/index"
        onPressProfile={() => router.push('/profile')}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Examen diagnóstico</Text>
        <Text style={styles.subtitle}>{instruction}</Text>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Contador</Text>
          <Text style={styles.metricValue}>{secondsLeft}s</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Volumen actual</Text>
          <Text style={styles.metricValue}>{currentVolume} mL</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Volumen máximo</Text>
          <Text style={styles.metricValue}>{maxVolume} mL</Text>
        </View>

        <View style={styles.gameCard}>
          <Text style={styles.gameTitle}>Mini juego de inspiración</Text>
          <View style={styles.gameLane}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${Math.min(100, Math.max(0, (currentVolume / 2500) * 100))}%` },
                ]}
              />
            </View>
            <View style={styles.balloonWrap}>
              <Text style={[styles.balloon, { transform: [{ scale: balloonScale }] }]}>🎈</Text>
            </View>
          </View>
        </View>

        {!started ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              setCurrentVolume(0);
              setMaxVolume(0);
              setSecondsLeft(TEST_SECONDS);
              setStarted(true);
            }}>
            <Text style={styles.primaryBtnText}>Iniciar prueba</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellness.screenBg,
    paddingBottom: wellnessFloatingTabBarInset,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: wellness.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: wellness.textSecondary,
    marginBottom: spacing.sm,
  },
  metricCard: {
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: wellness.border,
    borderRadius: wellnessRadii.card,
    padding: spacing.lg,
  },
  metricLabel: {
    fontSize: 14,
    textTransform: 'uppercase',
    color: wellness.textSecondary,
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  primaryBtn: {
    marginTop: spacing.md,
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  gameCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    padding: spacing.md,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.primaryDark,
    marginBottom: spacing.sm,
  },
  gameLane: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  barTrack: {
    width: 28,
    height: 150,
    borderRadius: 999,
    backgroundColor: '#d5e8d5',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: wellness.primary,
    borderRadius: 999,
  },
  balloonWrap: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balloon: {
    fontSize: 56,
  },
});
