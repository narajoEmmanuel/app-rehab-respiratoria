import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  evaluateDiagnosticSensorReadinessOnDemand,
  showTherapyReadinessAlert,
} from '@/src/modules/device/volume-estimation';
import {
  decayDiagnosticVolume,
  simulatedDiagnosticVolumeForHold,
} from '@/src/modules/diagnostics/diagnostic-volume-input';
import {
  isTouchPracticeDiagnostic,
  parseDiagnosticInputMode,
} from '@/src/modules/diagnostics/diagnostic-input-mode';
import { useDiagnosticSensorVolume } from '@/src/modules/diagnostics/use-diagnostic-sensor-volume';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const TEST_SECONDS = 5;
const ATTEMPT_MS = TEST_SECONDS * 1000;
const REST_MS = 7000;
const TOUCH_VOLUME_TICK_MS = 50;
const BALLOON_ANIM_MS = 85;
const MAX_SIMULATED_VOLUME = 4200;
/** Volumen al que el globo alcanza su tamaño visual máximo en pantalla. */
const BALLOON_VISUAL_MAX_ML = 3200;
const BALLOON_MIN_SCALE = 0.38;
const BALLOON_MAX_SCALE = 1.95;
const BALLOON_BASE_WIDTH = 88;
const BALLOON_BASE_HEIGHT = 108;

type DiagnosticPhase = 'idle' | 'attempt-1' | 'rest' | 'attempt-2' | 'rest-2' | 'attempt-3';

const DIAGNOSTIC_ATTEMPT_COUNT = 3;

function isDiagnosticAttemptPhase(phase: DiagnosticPhase): boolean {
  return phase === 'attempt-1' || phase === 'attempt-2' || phase === 'attempt-3';
}

function isDiagnosticRestPhase(phase: DiagnosticPhase): boolean {
  return phase === 'rest' || phase === 'rest-2';
}

/** Progreso 0–1 con curva perceptual: más contraste entre 0, 1000, 2000 y 3000+ mL. */
function volumeMlToBalloonProgress(volumeMl: number): number {
  const linear = Math.max(0, Math.min(volumeMl / BALLOON_VISUAL_MAX_ML, 1));
  return Math.pow(linear, 0.68);
}

function updateBalloonScale(balloonProgress: Animated.Value, volumeMl: number): void {
  const progress = volumeMlToBalloonProgress(volumeMl);
  balloonProgress.stopAnimation();
  Animated.timing(balloonProgress, {
    toValue: progress,
    duration: BALLOON_ANIM_MS,
    useNativeDriver: true,
  }).start();
}

export function DiagnosticExamScreen() {
  const insets = useSafeAreaInsets();
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
  const [attemptThreeMax, setAttemptThreeMax] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [sensorEntryReady, setSensorEntryReady] = useState(isTouchPractice);
  const pressStartedAtRef = useRef<number | null>(null);
  const balloonProgress = useRef(new Animated.Value(0)).current;
  const maxVolumeRef = useRef(0);
  const isPressingRef = useRef(false);
  const phaseDeadlineRef = useRef(0);
  const timerRafRef = useRef<number | null>(null);
  const phaseTransitionLockRef = useRef(false);

  const inAttempt = isDiagnosticAttemptPhase(phase);

  const ingestVolumeMl = useCallback(
    (ml: number) => {
      const clamped = Math.max(0, Math.min(MAX_SIMULATED_VOLUME, ml));
      if (clamped > maxVolumeRef.current) {
        maxVolumeRef.current = clamped;
        setMaxVolume(clamped);
      }
      setCurrentVolume(clamped);
      updateBalloonScale(balloonProgress, clamped);
    },
    [balloonProgress],
  );

  const {
    modelReady: sensorModelReady,
    sensorConnected,
    spirometerLabel,
  } = useDiagnosticSensorVolume({
    enabled: !isTouchPractice,
    sampling: inAttempt,
    onVolumeSample: ingestVolumeMl,
  });

  useEffect(() => {
    isPressingRef.current = isPressing;
  }, [isPressing]);

  useEffect(() => {
    if (isTouchPractice) {
      setSensorEntryReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const gate = await evaluateDiagnosticSensorReadinessOnDemand({ sensorConnected });
      if (cancelled) return;
      if (!gate.canStartDiagnostic) {
        showTherapyReadinessAlert(gate, (route) => router.replace(route));
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
        return;
      }
      setSensorEntryReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isTouchPractice, router, sensorConnected]);

  const armPhaseDeadline = useCallback((durationMs: number) => {
    phaseDeadlineRef.current = Date.now() + durationMs;
    setTimeLeftMs(durationMs);
    setSecondsLeft(Math.ceil(durationMs / 1000));
  }, []);

  /** Reloj de fase desacoplado del sensor: tiempo real por deadline. */
  useEffect(() => {
    if (phase === 'idle') return;

    const tick = () => {
      const remaining = Math.max(0, phaseDeadlineRef.current - Date.now());
      setTimeLeftMs(remaining);
      setSecondsLeft(Math.max(0, Math.ceil(remaining / 1000)));
      if (remaining > 0) {
        timerRafRef.current = requestAnimationFrame(tick);
      }
    };

    timerRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (timerRafRef.current != null) {
        cancelAnimationFrame(timerRafRef.current);
        timerRafRef.current = null;
      }
    };
  }, [phase]);

  /** Modo práctica: volumen táctil en tick fijo, independiente del reloj. */
  useEffect(() => {
    if (!isTouchPractice || !inAttempt) return;

    const id = setInterval(() => {
      const holdMs =
        isPressingRef.current && pressStartedAtRef.current != null
          ? Date.now() - pressStartedAtRef.current
          : 0;
      const ml = simulatedDiagnosticVolumeForHold(MAX_SIMULATED_VOLUME, holdMs);
      ingestVolumeMl(ml);
    }, TOUCH_VOLUME_TICK_MS);

    return () => clearInterval(id);
  }, [inAttempt, ingestVolumeMl, isTouchPractice]);

  /** Descanso: decaimiento visual del globo sin afectar el reloj. */
  useEffect(() => {
    if (!isDiagnosticRestPhase(phase)) return;

    const id = setInterval(() => {
      setCurrentVolume((prev) => {
        const next = decayDiagnosticVolume(prev);
        updateBalloonScale(balloonProgress, next);
        return next;
      });
    }, TOUCH_VOLUME_TICK_MS);

    return () => clearInterval(id);
  }, [balloonProgress, phase]);

  useEffect(() => {
    phaseTransitionLockRef.current = false;
  }, [phase]);

  useEffect(() => {
    if (phase === 'idle' || timeLeftMs > 0) return;
    if (phaseTransitionLockRef.current) return;
    phaseTransitionLockRef.current = true;

    if (phase === 'attempt-1') {
      const first = maxVolumeRef.current;
      setAttemptOneMax(first);
      setCurrentVolume(first);
      setMaxVolume(first);
      setIsPressing(false);
      pressStartedAtRef.current = null;
      setPhase('rest');
      armPhaseDeadline(REST_MS);
      return;
    }

    if (phase === 'rest') {
      maxVolumeRef.current = 0;
      setCurrentVolume(0);
      setMaxVolume(0);
      updateBalloonScale(balloonProgress, 0);
      setPhase('attempt-2');
      armPhaseDeadline(ATTEMPT_MS);
      return;
    }

    if (phase === 'attempt-2') {
      const second = maxVolumeRef.current;
      setAttemptTwoMax(second);
      setCurrentVolume(second);
      setMaxVolume(second);
      setIsPressing(false);
      pressStartedAtRef.current = null;
      maxVolumeRef.current = 0;
      setCurrentVolume(0);
      setMaxVolume(0);
      updateBalloonScale(balloonProgress, 0);
      setPhase('rest-2');
      armPhaseDeadline(REST_MS);
      return;
    }

    if (phase === 'rest-2') {
      maxVolumeRef.current = 0;
      setCurrentVolume(0);
      setMaxVolume(0);
      updateBalloonScale(balloonProgress, 0);
      setPhase('attempt-3');
      armPhaseDeadline(ATTEMPT_MS);
      return;
    }

    if (phase === 'attempt-3') {
      const third = maxVolumeRef.current;
      const finalVim = Math.max(attemptOneMax, attemptTwoMax, third);
      setAttemptThreeMax(third);
      router.replace({
        pathname: '/diagnostico-resumen',
        params: {
          attempt1: String(attemptOneMax),
          attempt2: String(attemptTwoMax),
          attempt3: String(third),
          vim: String(finalVim),
          inputMode,
        },
      });
    }
  }, [
    armPhaseDeadline,
    attemptOneMax,
    attemptTwoMax,
    balloonProgress,
    inputMode,
    phase,
    router,
    timeLeftMs,
  ]);

  const balloonScale = useMemo(
    () =>
      balloonProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [BALLOON_MIN_SCALE, BALLOON_MAX_SCALE],
        extrapolate: 'clamp',
      }),
    [balloonProgress],
  );

  const phaseActionLabel = useMemo(() => {
    if (isDiagnosticAttemptPhase(phase)) {
      return 'Inhala al máximo';
    }
    if (isDiagnosticRestPhase(phase)) return 'Descansa';
    return 'Evaluación respiratoria inicial';
  }, [phase]);

  const phaseHint = useMemo(() => {
    if (phase === 'attempt-1') return `Intento 1 de ${DIAGNOSTIC_ATTEMPT_COUNT} · 5 segundos`;
    if (phase === 'attempt-2') return `Intento 2 de ${DIAGNOSTIC_ATTEMPT_COUNT} · 5 segundos`;
    if (phase === 'attempt-3') return `Intento 3 de ${DIAGNOSTIC_ATTEMPT_COUNT} · 5 segundos`;
    if (phase === 'rest') return 'Prepárate para la segunda inspiración';
    if (phase === 'rest-2') return 'Prepárate para la tercera inspiración';
    return isTouchPractice
      ? `Modo práctica · ${DIAGNOSTIC_ATTEMPT_COUNT} intentos de 5 s`
      : `${DIAGNOSTIC_ATTEMPT_COUNT} intentos de inspiración máxima · 5 s cada uno`;
  }, [isTouchPractice, phase]);

  const phaseCommandVariant = useMemo((): 'inhale' | 'rest' | 'idle' => {
    if (isDiagnosticRestPhase(phase)) return 'rest';
    if (isDiagnosticAttemptPhase(phase)) return 'inhale';
    return 'idle';
  }, [phase]);

  const currentPhaseDuration = isDiagnosticRestPhase(phase) ? REST_MS : ATTEMPT_MS;
  const progressRatio = Math.max(
    0,
    Math.min(1, 1 - timeLeftMs / currentPhaseDuration),
  );

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

  if (!isTouchPractice && (!sensorEntryReady || !sensorModelReady)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar
          showBackButton
          backFallbackHref="/(tabs)/index"
          onPressProfile={() => router.push('/profile')}
        />
        <View style={styles.centeredLoading}>
          <ActivityIndicator size="large" color={wellness.primary} />
          <Text style={styles.loadingText}>Verificando sensor y calibración…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const startAttempt = () => {
    maxVolumeRef.current = 0;
    setAttemptOneMax(0);
    setAttemptTwoMax(0);
    setAttemptThreeMax(0);
    setCurrentVolume(0);
    setMaxVolume(0);
    setIsPressing(false);
    pressStartedAtRef.current = null;
    setPhase('attempt-1');
    armPhaseDeadline(ATTEMPT_MS);
    updateBalloonScale(balloonProgress, 0);
  };

  const gameCardInner = (
    <View style={styles.gameCardInner}>
      <View style={styles.cardTopSection}>
        <View
          style={[
            styles.phaseCommand,
            phaseCommandVariant === 'inhale' && styles.phaseCommandInhale,
            phaseCommandVariant === 'rest' && styles.phaseCommandRest,
          ]}
          accessibilityRole="header">
          <Text
            style={[
              styles.phaseCommandText,
              phaseCommandVariant === 'rest' && styles.phaseCommandTextRest,
            ]}>
            {phaseActionLabel}
          </Text>
          <Text style={styles.phaseCommandHint}>{phaseHint}</Text>
        </View>

        <View style={styles.timerRow}>
          <View style={styles.timerBlock}>
            <Text style={styles.timerLabel}>Tiempo</Text>
            <Text style={styles.timerValueCompact}>{secondsLeft}s</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
          </View>
        </View>

        {phase !== 'idle' ? (
          <Text style={styles.activeCardMeta}>
            {isTouchPractice
              ? 'Mantén presionado en el globo'
              : spirometerLabel
                ? `Medición en vivo · ${spirometerLabel}`
                : 'Medición en vivo'}
          </Text>
        ) : null}
      </View>

      <View style={styles.balloonZone}>
        <View style={styles.balloonStage}>
          <View style={styles.balloonThread} />
          <Animated.View style={[styles.balloonBody, { transform: [{ scale: balloonScale }] }]}>
            <View style={styles.balloonHighlight} />
          </Animated.View>
        </View>
      </View>

      <View style={styles.cardBottomSection}>
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
          <View style={[styles.attemptChip, phase === 'attempt-1' && styles.attemptChipActive]}>
            <Text style={styles.attemptChipLabel}>Intento 1</Text>
            <Text style={styles.attemptChipValue}>{Math.round(attemptOneMax)} mL</Text>
          </View>
          <View style={[styles.attemptChip, phase === 'attempt-2' && styles.attemptChipActive]}>
            <Text style={styles.attemptChipLabel}>Intento 2</Text>
            <Text style={styles.attemptChipValue}>{Math.round(attemptTwoMax)} mL</Text>
          </View>
          <View style={[styles.attemptChip, phase === 'attempt-3' && styles.attemptChipActive]}>
            <Text style={styles.attemptChipLabel}>Intento 3</Text>
            <Text style={styles.attemptChipValue}>{Math.round(attemptThreeMax)} mL</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const screenBottomInset = insets.bottom + spacing.md;

  const gameCard = isTouchPractice ? (
    <Pressable
      style={styles.gameCardFlexFill}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={!inAttempt}>
      {gameCardInner}
    </Pressable>
  ) : (
    <View style={styles.gameCardFlexFill}>{gameCardInner}</View>
  );

  return (
    <SafeAreaView style={[styles.safe, { paddingBottom: screenBottomInset }]} edges={['top']}>
      <AppTopBar
        showBackButton
        backFallbackHref="/(tabs)/index"
        onPressProfile={() => router.push('/profile')}
      />

      <View style={styles.contentArea}>
        {phase === 'idle' ? (
          <View style={styles.headerZone}>
            <Text style={styles.titleCompact}>Evaluación respiratoria inicial</Text>
            <View style={styles.modeBadgeRow}>
              <View style={[styles.modeBadge, isTouchPractice && styles.modeBadgePractice]}>
                <Text
                  style={[
                    styles.modeBadgeText,
                    isTouchPractice && styles.modeBadgeTextPractice,
                  ]}>
                  {isTouchPractice ? 'Modo práctica' : 'Con sensor'}
                </Text>
              </View>
            </View>
            <Text style={styles.idleIntro}>{phaseHint}</Text>
            {!isTouchPractice && spirometerLabel ? (
              <Text style={styles.sensorReadyInline}>Sensor listo · {spirometerLabel}</Text>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtnTop,
                pressed && styles.primaryBtnTopPressed,
              ]}
              onPress={startAttempt}
              accessibilityRole="button"
              accessibilityLabel="Iniciar intento">
              <Text style={styles.primaryBtnTopText}>Empezar evaluación</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.gameCardShell}>{gameCard}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellness.screenBg,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.md,
  },
  headerZone: {
    flexShrink: 0,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  activeCardMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.text,
  },
  idleIntro: {
    fontSize: 15,
    lineHeight: 21,
    color: wellness.textSecondary,
  },
  sensorReadyInline: {
    fontSize: 13,
    fontWeight: '600',
    color: wellness.primaryDark,
  },
  modeBadgeRow: {
    flexDirection: 'row',
  },
  modeBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.28)',
  },
  modeBadgePractice: {
    backgroundColor: 'rgba(61, 90, 74, 0.08)',
    borderColor: wellness.border,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: wellness.primaryDark,
    letterSpacing: 0.2,
  },
  modeBadgeTextPractice: {
    color: wellness.textSecondary,
  },
  centeredLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: wellness.textSecondary,
    textAlign: 'center',
  },
  primaryBtnTop: {
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
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
  gameCardShell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  gameCardFlexFill: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  gameCardInner: {
    flex: 1,
    minHeight: 0,
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellness.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    justifyContent: 'space-between',
  },
  cardTopSection: {
    flexShrink: 0,
    gap: spacing.sm,
  },
  cardBottomSection: {
    flexShrink: 0,
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  phaseCommand: {
    flexShrink: 0,
    borderRadius: wellnessRadii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(52, 171, 165, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.22)',
    alignItems: 'center',
  },
  phaseCommandInhale: {
    backgroundColor: 'rgba(52, 171, 165, 0.14)',
    borderColor: 'rgba(52, 171, 165, 0.35)',
  },
  phaseCommandRest: {
    backgroundColor: 'rgba(255, 193, 94, 0.12)',
    borderColor: 'rgba(210, 150, 50, 0.35)',
  },
  phaseCommandText: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.primaryDark,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  phaseCommandTextRest: {
    color: '#9A6B12',
  },
  phaseCommandHint: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
  },
  timerRow: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timerBlock: {
    minWidth: 52,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 10,
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  timerValueCompact: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: wellnessRadii.full,
    backgroundColor: '#E3EEE3',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: wellnessRadii.full,
    backgroundColor: wellness.primary,
  },
  balloonZone: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    marginVertical: spacing.xs,
  },
  balloonStage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  balloonThread: {
    width: 2,
    height: 18,
    backgroundColor: '#9AB89B',
    marginBottom: 2,
  },
  balloonBody: {
    width: BALLOON_BASE_WIDTH,
    height: BALLOON_BASE_HEIGHT,
    borderRadius: BALLOON_BASE_WIDTH / 2,
    backgroundColor: '#7EC8E3',
    borderWidth: 2,
    borderColor: '#5BA8C4',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 14,
  },
  balloonHighlight: {
    width: 22,
    height: 28,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginLeft: -28,
  },
  metricsRow: {
    flexShrink: 0,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metricCard: {
    flex: 1,
    backgroundColor: wellness.softGreen,
    borderRadius: wellnessRadii.card,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: wellness.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: wellness.text,
  },
  attemptsRow: {
    flexShrink: 0,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  attemptChip: {
    flex: 1,
    minWidth: 0,
    borderRadius: wellnessRadii.card,
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  attemptChipActive: {
    borderColor: wellness.primary,
    backgroundColor: 'rgba(52, 171, 165, 0.08)',
  },
  attemptChipLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  attemptChipValue: {
    marginTop: 1,
    fontSize: 14,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
});
