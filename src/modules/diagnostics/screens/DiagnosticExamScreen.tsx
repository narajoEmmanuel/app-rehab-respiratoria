import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActiveVolumeEstimate } from '@/src/modules/device/volume-estimation';
import {
  decayDiagnosticVolume,
  simulatedDiagnosticVolumeForHold,
} from '@/src/modules/diagnostics/diagnostic-volume-input';
import {
  isTouchPracticeDiagnostic,
  parseDiagnosticInputMode,
} from '@/src/modules/diagnostics/diagnostic-input-mode';
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

function applyVolumeSample(
  nextMl: number,
  setCurrentVolume: (v: number) => void,
  setMaxVolume: Dispatch<SetStateAction<number>>,
  maxVolumeRef: MutableRefObject<number>,
  balloonProgress: Animated.Value,
) {
  const clamped = Math.max(0, Math.min(MAX_SIMULATED_VOLUME, nextMl));
  setCurrentVolume(clamped);
  setMaxVolume((oldMax) => {
    const nextMax = Math.max(oldMax, clamped);
    maxVolumeRef.current = nextMax;
    return nextMax;
  });
  const normalized = Math.max(0, Math.min(clamped / MAX_SIMULATED_VOLUME, 1));
  Animated.timing(balloonProgress, {
    toValue: normalized,
    duration: TICK_MS + 30,
    useNativeDriver: true,
  }).start();
}

export function DiagnosticExamScreen() {
  const router = useRouter();
  const { inputMode: inputModeParam } = useLocalSearchParams<{ inputMode?: string }>();
  const inputMode = useMemo(() => parseDiagnosticInputMode(inputModeParam), [inputModeParam]);
  const isTouchPractice = isTouchPracticeDiagnostic(inputMode);

  const [phase, setPhase] = useState<DiagnosticPhase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(TEST_SECONDS);
  const [timeLeftMs, setTimeLeftMs] = useState(ATTEMPT_MS);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [maxVolume, setMaxVolume] = useState(0);
  const [attemptOneMax, setAttemptOneMax] = useState(0);
  const [attemptTwoMax, setAttemptTwoMax] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const pressStartedAtRef = useRef<number | null>(null);
  const balloonProgress = useRef(new Animated.Value(0)).current;
  const maxVolumeRef = useRef(0);
  const isPressingRef = useRef(false);
  const sensorVolumeRef = useRef(0);

  const inAttempt = phase === 'attempt-1' || phase === 'attempt-2';
  const { estimate: activeVolumeEstimate } = useActiveVolumeEstimate({
    enabled: !isTouchPractice && inAttempt,
  });

  useEffect(() => {
    isPressingRef.current = isPressing;
  }, [isPressing]);

  useEffect(() => {
    if (!isTouchPractice && inAttempt) {
      sensorVolumeRef.current = activeVolumeEstimate.roundedVolumeMl ?? 0;
    }
  }, [activeVolumeEstimate.roundedVolumeMl, inAttempt, isTouchPractice]);

  const balloonScale = useMemo(
    () =>
      balloonProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [BALLOON_MIN_SCALE, BALLOON_MAX_SCALE],
        extrapolate: 'clamp',
      }),
    [balloonProgress],
  );

  const resolveAttemptVolume = useCallback((): number => {
    if (isTouchPractice) {
      const holdMs = isPressingRef.current && pressStartedAtRef.current != null
        ? Date.now() - pressStartedAtRef.current
        : 0;
      return simulatedDiagnosticVolumeForHold(MAX_SIMULATED_VOLUME, holdMs);
    }
    return Math.max(0, sensorVolumeRef.current);
  }, [isTouchPractice]);

  useEffect(() => {
    if (phase === 'idle') return;
    const intervalId = setInterval(() => {
      setTimeLeftMs((prev) => Math.max(prev - TICK_MS, 0));

      if (phase === 'attempt-1' || phase === 'attempt-2') {
        const next = resolveAttemptVolume();
        applyVolumeSample(next, setCurrentVolume, setMaxVolume, maxVolumeRef, balloonProgress);
      } else {
        setCurrentVolume((prev) => {
          const next = decayDiagnosticVolume(prev);
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
  }, [balloonProgress, phase, resolveAttemptVolume]);

  useEffect(() => {
    const nextSeconds = Math.ceil(timeLeftMs / 1000);
    setSecondsLeft(nextSeconds);
    if (phase === 'idle' || timeLeftMs > 0) return;

    if (phase === 'attempt-1') {
      const first = maxVolumeRef.current;
      setAttemptOneMax(first);
      setCurrentVolume(first);
      setMaxVolume(first);
      setIsPressing(false);
      pressStartedAtRef.current = null;
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
          inputMode,
        },
      });
    }
  }, [attemptOneMax, inputMode, phase, router, timeLeftMs]);

  const instruction = useMemo(() => {
    if (phase === 'attempt-1' || phase === 'attempt-2') {
      return isTouchPractice
        ? 'Mantén presionado para inspirar. Suelta para bajar el volumen.'
        : 'Inhala profundo hacia el sensor';
    }
    if (phase === 'rest') return 'Descansa y prepárate para el siguiente intento';
    return isTouchPractice
      ? 'Prueba el flujo con 2 intentos de 5 segundos. No es una medición real.'
      : 'Realizaremos 2 intentos de inspiración máxima de 5 segundos cada uno.';
  }, [isTouchPractice, phase]);

  const phaseTitle =
    phase === 'attempt-1'
      ? 'Intento 1 de 2'
      : phase === 'attempt-2'
        ? 'Intento 2 de 2'
        : phase === 'rest'
          ? 'Descanso'
          : 'Diagnóstico respiratorio';

  const currentPhaseDuration = phase === 'rest' ? REST_MS : ATTEMPT_MS;
  const elapsedRatio = 1 - timeLeftMs / currentPhaseDuration;
  const progressRatio = Math.max(0, Math.min(elapsedRatio, 1));

  const onPressIn = () => {
    if (!isTouchPractice || !inAttempt) return;
    pressStartedAtRef.current = Date.now();
    setIsPressing(true);
  };

  const onPressOut = () => {
    if (!isTouchPractice) return;
    setIsPressing(false);
    pressStartedAtRef.current = null;
  };

  const startAttempt = () => {
    maxVolumeRef.current = 0;
    setAttemptOneMax(0);
    setAttemptTwoMax(0);
    setCurrentVolume(0);
    setMaxVolume(0);
    setIsPressing(false);
    pressStartedAtRef.current = null;
    setTimeLeftMs(ATTEMPT_MS);
    setSecondsLeft(TEST_SECONDS);
    setPhase('attempt-1');
    Animated.timing(balloonProgress, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar
        showBackButton
        backFallbackHref="/(tabs)/index"
        onPressProfile={() => router.push('/profile')}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Mini juego de diagnóstico</Text>
        <View style={styles.modeBadgeRow}>
          <View style={[styles.modeBadge, isTouchPractice && styles.modeBadgePractice]}>
            <Text style={[styles.modeBadgeText, isTouchPractice && styles.modeBadgeTextPractice]}>
              {isTouchPractice ? 'Modo práctica' : 'Con sensor'}
            </Text>
          </View>
        </View>
        <Text style={styles.phaseTitle}>{phaseTitle}</Text>
        <Text style={styles.subtitle}>{instruction}</Text>

        {phase === 'idle' ? (
          <Pressable
            style={({ pressed }) => [styles.primaryBtnTop, pressed && styles.primaryBtnTopPressed]}
            onPress={startAttempt}
            accessibilityRole="button"
            accessibilityLabel="Iniciar intento">
            <Text style={styles.primaryBtnTopText}>Iniciar intento</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={!isTouchPractice || !inAttempt}
          style={styles.gameCardPressable}>
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
        </Pressable>

        {phase !== 'idle' ? (
          <View style={styles.runningHintCard}>
            <Text style={styles.runningHintText}>
              {phase === 'rest'
                ? 'Recupera tu respiración. El segundo intento inicia automáticamente.'
                : isTouchPractice
                  ? 'Mantén presionado en el globo para llenarlo. Suelta para que baje.'
                  : 'Sigue inhalando mientras el globo aumenta de tamaño.'}
            </Text>
          </View>
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
    fontSize: 30,
    fontWeight: '800',
    color: wellness.text,
  },
  modeBadgeRow: {
    flexDirection: 'row',
  },
  modeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.28)',
  },
  modeBadgePractice: {
    backgroundColor: 'rgba(61, 90, 74, 0.08)',
    borderColor: wellness.border,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: wellness.primaryDark,
    letterSpacing: 0.2,
  },
  modeBadgeTextPractice: {
    color: wellness.textSecondary,
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
    marginBottom: spacing.sm,
  },
  primaryBtnTop: {
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md + 6,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  primaryBtnTopPressed: {
    opacity: 0.9,
  },
  primaryBtnTopText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
  },
  gameCardPressable: {
    width: '100%',
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
    marginBottom: 4,
  },
  balloonBody: {
    width: 120,
    height: 148,
    borderRadius: 60,
    backgroundColor: '#7EC8E3',
    borderWidth: 2,
    borderColor: '#5BA8C4',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 18,
  },
  balloonHighlight: {
    width: 28,
    height: 36,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginLeft: -36,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: wellness.softGreen,
    borderRadius: wellnessRadii.card,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.text,
  },
  attemptsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  attemptChip: {
    flex: 1,
    borderRadius: wellnessRadii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  attemptChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  attemptChipValue: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  runningHintCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    padding: spacing.md,
  },
  runningHintText: {
    fontSize: 15,
    lineHeight: 22,
    color: wellness.textSecondary,
    textAlign: 'center',
  },
});
