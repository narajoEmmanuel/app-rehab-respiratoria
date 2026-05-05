import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const TEST_SECONDS = 5;
const ATTEMPT_MS = TEST_SECONDS * 1000;
const REST_MS = 7000;
const TICK_MS = 200;
const MAX_SIMULATED_VOLUME = 4200;
const BALLOON_MIN_SCALE = 0.7;
const BALLOON_MAX_SCALE = 1.35;

type DiagnosticPhase = 'idle' | 'attempt-1' | 'rest' | 'attempt-2';

export function DiagnosticExamScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<DiagnosticPhase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(TEST_SECONDS);
  const [timeLeftMs, setTimeLeftMs] = useState(ATTEMPT_MS);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [maxVolume, setMaxVolume] = useState(0);
  const [attemptOneMax, setAttemptOneMax] = useState(0);
  const [attemptTwoMax, setAttemptTwoMax] = useState(0);
  const balloonProgress = useRef(new Animated.Value(0)).current;
  const maxVolumeRef = useRef(0);
  const balloonScale = useMemo(
    () =>
      balloonProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [BALLOON_MIN_SCALE, BALLOON_MAX_SCALE],
        extrapolate: 'clamp',
      }),
    [balloonProgress],
  );

  useEffect(() => {
    if (phase === 'idle') return;
    const intervalId = setInterval(() => {
      setTimeLeftMs((prev) => Math.max(prev - TICK_MS, 0));

      if (phase === 'attempt-1' || phase === 'attempt-2') {
        setCurrentVolume((prev) => {
          const delta = Math.floor(Math.random() * 85) + 70;
          const next = Math.min(MAX_SIMULATED_VOLUME, prev + delta);
          setMaxVolume((oldMax) => {
            const nextMax = Math.max(oldMax, next);
            maxVolumeRef.current = nextMax;
            return nextMax;
          });
          const normalized = Math.max(0, Math.min(next / MAX_SIMULATED_VOLUME, 1));
          Animated.timing(balloonProgress, {
            toValue: normalized,
            duration: TICK_MS + 30,
            useNativeDriver: true,
          }).start();
          return next;
        });
      } else {
        setCurrentVolume((prev) => {
          const next = Math.max(0, prev - (Math.floor(Math.random() * 50) + 90));
          const normalized = Math.max(0, Math.min(next / MAX_SIMULATED_VOLUME, 1));
          Animated.timing(balloonProgress, {
            toValue: normalized,
            duration: TICK_MS + 30,
            useNativeDriver: true,
          }).start();
          return next;
        });
      }
    }, TICK_MS);

    return () => clearInterval(intervalId);
  }, [balloonProgress, phase]);

  useEffect(() => {
    const nextSeconds = Math.ceil(timeLeftMs / 1000);
    setSecondsLeft(nextSeconds);
    if (phase === 'idle' || timeLeftMs > 0) return;

    if (phase === 'attempt-1') {
      const first = maxVolumeRef.current;
      setAttemptOneMax(first);
      setCurrentVolume(first);
      setMaxVolume(first);
      setPhase('rest');
      setTimeLeftMs(REST_MS);
      return;
    }

    if (phase === 'rest') {
      maxVolumeRef.current = 0;
      setCurrentVolume(0);
      setMaxVolume(0);
      setPhase('attempt-2');
      setTimeLeftMs(ATTEMPT_MS);
      return;
    }

    if (phase === 'attempt-2') {
      const second = maxVolumeRef.current;
      const finalVim = Math.max(attemptOneMax, second);
      setAttemptTwoMax(second);
      router.replace({
        pathname: '/diagnostico-resumen',
        params: {
          attempt1: String(attemptOneMax),
          attempt2: String(second),
          vim: String(finalVim),
        },
      });
    }
  }, [attemptOneMax, phase, router, timeLeftMs]);

  const instruction = useMemo(
    () => {
      if (phase === 'attempt-1' || phase === 'attempt-2') return 'Inhala profundo';
      if (phase === 'rest') return 'Descansa y prepárate para el siguiente intento';
      return 'Realizaremos 2 intentos de inspiración máxima de 5 segundos cada uno.';
    },
    [phase],
  );
  const phaseTitle = phase === 'attempt-1' ? 'Intento 1 de 2' : phase === 'attempt-2' ? 'Intento 2 de 2' : phase === 'rest' ? 'Descanso' : 'Diagnóstico respiratorio';
  const currentPhaseDuration = phase === 'rest' ? REST_MS : ATTEMPT_MS;
  const elapsedRatio = 1 - timeLeftMs / currentPhaseDuration;
  const progressRatio = Math.max(0, Math.min(elapsedRatio, 1));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar
        showBackButton
        backFallbackHref="/(tabs)/index"
        onPressProfile={() => router.push('/profile')}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mini juego de diagnóstico</Text>
        <Text style={styles.phaseTitle}>{phaseTitle}</Text>
        <Text style={styles.subtitle}>{instruction}</Text>

        <View style={styles.gameCard}>
          <View style={styles.timerBadge}>
            <Text style={styles.timerLabel}>Tiempo restante</Text>
            <Text style={styles.timerValue}>{secondsLeft}</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
          </View>

          <View style={styles.balloonStage}>
            <View style={styles.balloonThread} />
            <Animated.View style={[styles.balloonBody, { transform: [{ scale: balloonScale }] }]}>
              <View style={styles.balloonHighlight} />
            </Animated.View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Volumen actual</Text>
              <Text style={styles.metricValue}>{Math.round(currentVolume)} mL</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Máximo intento</Text>
              <Text style={styles.metricValue}>{Math.round(maxVolume)} mL</Text>
            </View>
          </View>
          <View style={styles.attemptsRow}>
            <View style={styles.attemptChip}>
              <Text style={styles.attemptChipLabel}>Intento 1</Text>
              <Text style={styles.attemptChipValue}>{Math.round(attemptOneMax)} mL</Text>
            </View>
            <View style={styles.attemptChip}>
              <Text style={styles.attemptChipLabel}>Intento 2</Text>
              <Text style={styles.attemptChipValue}>{Math.round(attemptTwoMax)} mL</Text>
            </View>
          </View>
        </View>

        {phase === 'idle' ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              maxVolumeRef.current = 0;
              setAttemptOneMax(0);
              setAttemptTwoMax(0);
              setCurrentVolume(0);
              setMaxVolume(0);
              setTimeLeftMs(ATTEMPT_MS);
              setSecondsLeft(TEST_SECONDS);
              setPhase('attempt-1');
              Animated.timing(balloonProgress, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
              }).start();
            }}>
            <Text style={styles.primaryBtnText}>Iniciar intento</Text>
          </Pressable>
        ) : (
          <View style={styles.runningHintCard}>
            <Text style={styles.runningHintText}>
              {phase === 'rest'
                ? 'Recupera tu respiración. El segundo intento inicia automáticamente.'
                : 'Sigue inhalando mientras el globo aumenta de tamaño.'}
            </Text>
          </View>
        )}
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
    fontSize: 30,
    fontWeight: '800',
    color: wellness.text,
  },
  phaseTitle: {
    marginTop: spacing.xs,
    fontSize: 20,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 25,
    color: wellness.textSecondary,
    marginBottom: spacing.xs,
  },
  gameCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellness.border,
    padding: spacing.md,
  },
  timerBadge: {
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  timerLabel: {
    fontSize: 13,
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timerValue: {
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: wellnessRadii.full,
    backgroundColor: '#E3EEE3',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: wellnessRadii.full,
    backgroundColor: wellness.primary,
  },
  balloonStage: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 230,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  balloonThread: {
    width: 2,
    height: 30,
    backgroundColor: '#9AB89B',
  },
  balloonBody: {
    width: 145,
    height: 165,
    borderRadius: 90,
    backgroundColor: '#62C4BF',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderWidth: 2,
    borderColor: '#43AFA8',
  },
  balloonHighlight: {
    width: 38,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginTop: 24,
    marginLeft: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: wellness.border,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.md,
    backgroundColor: '#F8FBF7',
  },
  metricLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: wellness.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  attemptsRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  attemptChip: {
    flex: 1,
    borderRadius: wellnessRadii.pill,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  attemptChipLabel: {
    fontSize: 12,
    color: wellness.textSecondary,
    fontWeight: '700',
  },
  attemptChipValue: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
    color: wellness.text,
  },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  runningHintCard: {
    marginTop: spacing.lg,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: '#EEF6EC',
    padding: spacing.md,
  },
  runningHintText: {
    fontSize: 15,
    lineHeight: 22,
    color: wellness.primaryDark,
    textAlign: 'center',
  },
});
