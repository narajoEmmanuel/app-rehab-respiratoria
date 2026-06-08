import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { isSensorRuntimeEnabled } from '@/src/config/sensor-runtime-guards';
import { InitialEvaluationCountdownView } from '@/src/modules/diagnostics/components/InitialEvaluationCountdownView';
import { InitialEvaluationWelcomeView } from '@/src/modules/diagnostics/components/InitialEvaluationWelcomeView';
import {
  decayDiagnosticVolume,
  simulatedDiagnosticVolumeForHold,
} from '@/src/modules/diagnostics/diagnostic-volume-input';
import {
  isTouchPracticeDiagnostic,
  resolveDiagnosticInputMode,
} from '@/src/modules/diagnostics/diagnostic-input-mode';
import {
  buildDiagnosticAttemptRecord,
  clearDiagnosticEvaluationSession,
  createDiagnosticEvaluationSession,
  saveDiagnosticEvaluationSession,
  type AttemptTrackingSnapshot,
} from '@/src/modules/diagnostics/diagnostic-evaluation-session-service';
import { useDiagnosticSensorVolume } from '@/src/modules/diagnostics/use-diagnostic-sensor-volume';
import { useInitialEvaluationReadiness } from '@/src/modules/diagnostics/use-initial-evaluation-readiness';
import type { DiagnosticAttemptNumber, DiagnosticEvaluationSession } from '@/src/modules/diagnostics/types';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const TEST_SECONDS = 5;
const ATTEMPT_MS = TEST_SECONDS * 1000;
const REST_MS = 7000;
const COUNTDOWN_MS = 1000;
const COUNTDOWN_START = 3;
const TOUCH_VOLUME_TICK_MS = 50;
const BALLOON_ANIM_MS = 85;
const MAX_SIMULATED_VOLUME = 4200;
const BALLOON_VISUAL_MAX_ML = 3200;
const BALLOON_MIN_SCALE = 0.38;
const BALLOON_MAX_SCALE = 1.95;
const BALLOON_BASE_WIDTH = 88;
const BALLOON_BASE_HEIGHT = 108;

type DiagnosticPhase =
  | 'welcome'
  | 'countdown'
  | 'attempt-1'
  | 'rest'
  | 'attempt-2'
  | 'rest-2'
  | 'attempt-3';

const DIAGNOSTIC_ATTEMPT_COUNT = 3;

function isDiagnosticAttemptPhase(phase: DiagnosticPhase): boolean {
  return phase === 'attempt-1' || phase === 'attempt-2' || phase === 'attempt-3';
}

function isDiagnosticRestPhase(phase: DiagnosticPhase): boolean {
  return phase === 'rest' || phase === 'rest-2';
}

function isTimedPhase(phase: DiagnosticPhase): boolean {
  return isDiagnosticAttemptPhase(phase) || isDiagnosticRestPhase(phase);
}

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

function createEmptyAttemptTracking(): AttemptTrackingSnapshot {
  return {
    peak_volume_ml: 0,
    had_live_signal: false,
    live_sample_count: 0,
    signal_lost_during_attempt: false,
  };
}

function resetAttemptTracking(params: {
  maxVolumeRef: { current: number };
  attemptTrackingRef: { current: AttemptTrackingSnapshot };
  setAttemptOneMax: (v: number) => void;
  setAttemptTwoMax: (v: number) => void;
  setAttemptThreeMax: (v: number) => void;
  setCurrentVolume: (v: number) => void;
  setMaxVolume: (v: number) => void;
  setIsPressing: (v: boolean) => void;
  pressStartedAtRef: { current: number | null };
  balloonProgress: Animated.Value;
}): void {
  params.maxVolumeRef.current = 0;
  params.attemptTrackingRef.current = createEmptyAttemptTracking();
  params.setAttemptOneMax(0);
  params.setAttemptTwoMax(0);
  params.setAttemptThreeMax(0);
  params.setCurrentVolume(0);
  params.setMaxVolume(0);
  params.setIsPressing(false);
  params.pressStartedAtRef.current = null;
  updateBalloonScale(params.balloonProgress, 0);
}

export function DiagnosticExamScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { patient } = usePatientSession();
  const { inputMode: inputModeParam } = useLocalSearchParams<{ inputMode?: string }>();
  const inputMode = useMemo(() => resolveDiagnosticInputMode(inputModeParam), [inputModeParam]);
  const isTouchPractice = isTouchPracticeDiagnostic(inputMode);

  const [phase, setPhase] = useState<DiagnosticPhase>('welcome');
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_START);
  const [secondsLeft, setSecondsLeft] = useState(TEST_SECONDS);
  const [timeLeftMs, setTimeLeftMs] = useState(ATTEMPT_MS);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [maxVolume, setMaxVolume] = useState(0);
  const [attemptOneMax, setAttemptOneMax] = useState(0);
  const [attemptTwoMax, setAttemptTwoMax] = useState(0);
  const [attemptThreeMax, setAttemptThreeMax] = useState(0);
  const [isPressing, setIsPressing] = useState(false);

  const pressStartedAtRef = useRef<number | null>(null);
  const balloonProgress = useRef(new Animated.Value(0)).current;
  const maxVolumeRef = useRef(0);
  const attemptTrackingRef = useRef<AttemptTrackingSnapshot>(createEmptyAttemptTracking());
  const attemptStartedAtRef = useRef<string | null>(null);
  const evaluationSessionRef = useRef<DiagnosticEvaluationSession | null>(null);
  const isPressingRef = useRef(false);
  const phaseDeadlineRef = useRef(0);
  const timerRafRef = useRef<number | null>(null);
  const phaseTransitionLockRef = useRef(false);
  const countdownStartedRef = useRef(false);

  const sensorRuntimeEnabled = isSensorRuntimeEnabled();
  const readiness = useInitialEvaluationReadiness(!isTouchPractice && sensorRuntimeEnabled);
  const canStartEvaluation = isTouchPractice || readiness.canStartNow;
  const canShowStartButton = isTouchPractice || readiness.canStart;

  const inAttempt = isDiagnosticAttemptPhase(phase);

  const ingestVolumeMl = useCallback(
    (ml: number, meta?: { live?: boolean }) => {
      const live = meta?.live ?? true;
      const clamped = Math.max(0, Math.min(MAX_SIMULATED_VOLUME, ml));
      const displayMl = live ? clamped : 0;
      const tracking = attemptTrackingRef.current;

      if (live) {
        tracking.had_live_signal = true;
        tracking.live_sample_count += 1;
        if (clamped > tracking.peak_volume_ml) {
          tracking.peak_volume_ml = clamped;
        }
      } else if (tracking.had_live_signal) {
        tracking.signal_lost_during_attempt = true;
      }

      if (live && clamped > maxVolumeRef.current) {
        maxVolumeRef.current = clamped;
        setMaxVolume(clamped);
      }

      setCurrentVolume(displayMl);
      updateBalloonScale(balloonProgress, displayMl);
    },
    [balloonProgress],
  );

  const appendAttemptToSession = useCallback(
    async (attemptNumber: DiagnosticAttemptNumber) => {
      const session = evaluationSessionRef.current;
      if (!session) return;
      const endedAt = new Date().toISOString();
      const startedAt = attemptStartedAtRef.current ?? endedAt;
      const tracking = { ...attemptTrackingRef.current, peak_volume_ml: maxVolumeRef.current };
      if (isTouchPractice && tracking.peak_volume_ml > 0) {
        tracking.had_live_signal = true;
      }
      const attempt = buildDiagnosticAttemptRecord({
        sessionId: session.session_id,
        patientId: session.patient_id,
        attemptNumber,
        inputMode,
        startedAt,
        endedAt,
        tracking,
      });
      const others = session.attempts.filter((a) => a.attempt_number !== attemptNumber);
      const updated: DiagnosticEvaluationSession = {
        ...session,
        attempts: [...others, attempt].sort((a, b) => a.attempt_number - b.attempt_number),
      };
      evaluationSessionRef.current = updated;
      await saveDiagnosticEvaluationSession(updated);
      return attempt;
    },
    [inputMode, isTouchPractice],
  );

  const navigateToSummary = useCallback(
    (sessionId: string) => {
      router.replace({
        pathname: '/diagnostico-resumen',
        params: {
          evaluationSessionId: sessionId,
          inputMode,
        },
      });
    },
    [inputMode, router],
  );

  const { spirometerLabel, hasLiveReading } = useDiagnosticSensorVolume({
    enabled: !isTouchPractice,
    sampling: inAttempt,
    onVolumeSample: ingestVolumeMl,
  });

  useEffect(() => {
    isPressingRef.current = isPressing;
  }, [isPressing]);

  const armPhaseDeadline = useCallback((durationMs: number) => {
    phaseDeadlineRef.current = Date.now() + durationMs;
    setTimeLeftMs(durationMs);
    setSecondsLeft(Math.ceil(durationMs / 1000));
  }, []);

  const beginFirstAttempt = useCallback(() => {
    void (async () => {
      const priorSessionId = evaluationSessionRef.current?.session_id;
      if (priorSessionId) {
        await clearDiagnosticEvaluationSession(priorSessionId);
      }
      const session = await createDiagnosticEvaluationSession({
        inputMode,
        patientId: patient?.paciente_id ?? null,
      });
      evaluationSessionRef.current = session;
      resetAttemptTracking({
        maxVolumeRef,
        attemptTrackingRef,
        setAttemptOneMax,
        setAttemptTwoMax,
        setAttemptThreeMax,
        setCurrentVolume,
        setMaxVolume,
        setIsPressing,
        pressStartedAtRef,
        balloonProgress,
      });
      attemptStartedAtRef.current = new Date().toISOString();
      setPhase('attempt-1');
      armPhaseDeadline(ATTEMPT_MS);
    })();
  }, [armPhaseDeadline, balloonProgress, inputMode, patient?.paciente_id]);

  const confirmCancelEvaluation = useCallback(() => {
    Alert.alert(
      '¿Cancelar evaluación?',
      'No se guardará ningún resultado.',
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Cancelar evaluación',
          style: 'destructive',
          onPress: () => {
            const sessionId = evaluationSessionRef.current?.session_id;
            if (sessionId) {
              void clearDiagnosticEvaluationSession(sessionId);
            }
            evaluationSessionRef.current = null;
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          },
        },
      ],
    );
  }, [router]);

  const handleBack = useCallback(() => {
    if (phase === 'welcome') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
      return;
    }
    confirmCancelEvaluation();
  }, [confirmCancelEvaluation, phase, router]);

  const handleStartEvaluation = useCallback(() => {
    if (!canStartEvaluation || countdownStartedRef.current) return;
    countdownStartedRef.current = true;
    setCountdownValue(COUNTDOWN_START);
    setPhase('countdown');
  }, [canStartEvaluation]);

  useEffect(() => {
    if (phase === 'welcome') {
      countdownStartedRef.current = false;
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'countdown') return;

    const timer = setTimeout(() => {
      if (countdownValue <= 1) {
        beginFirstAttempt();
      } else {
        setCountdownValue((prev) => prev - 1);
      }
    }, COUNTDOWN_MS);

    return () => clearTimeout(timer);
  }, [beginFirstAttempt, countdownValue, phase]);

  useEffect(() => {
    if (!isTimedPhase(phase)) return;

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
    if (!isTimedPhase(phase) || timeLeftMs > 0) return;
    if (phaseTransitionLockRef.current) return;
    phaseTransitionLockRef.current = true;

    const finishAttemptPhase = async (
      attemptNumber: DiagnosticAttemptNumber,
      setAttemptMax: (v: number) => void,
    ) => {
      const peak = maxVolumeRef.current;
      setAttemptMax(peak);
      setCurrentVolume(peak);
      setMaxVolume(peak);
      setIsPressing(false);
      pressStartedAtRef.current = null;
      await appendAttemptToSession(attemptNumber);
    };

    const startNextAttempt = (nextPhase: 'attempt-2' | 'attempt-3') => {
      maxVolumeRef.current = 0;
      attemptTrackingRef.current = createEmptyAttemptTracking();
      attemptStartedAtRef.current = new Date().toISOString();
      setCurrentVolume(0);
      setMaxVolume(0);
      updateBalloonScale(balloonProgress, 0);
      setPhase(nextPhase);
      armPhaseDeadline(ATTEMPT_MS);
    };

    if (phase === 'attempt-1') {
      void finishAttemptPhase(1, setAttemptOneMax).then(() => {
        setPhase('rest');
        armPhaseDeadline(REST_MS);
        phaseTransitionLockRef.current = false;
      });
      return;
    }

    if (phase === 'rest') {
      startNextAttempt('attempt-2');
      phaseTransitionLockRef.current = false;
      return;
    }

    if (phase === 'attempt-2') {
      void finishAttemptPhase(2, setAttemptTwoMax).then(() => {
        maxVolumeRef.current = 0;
        setCurrentVolume(0);
        setMaxVolume(0);
        updateBalloonScale(balloonProgress, 0);
        setPhase('rest-2');
        armPhaseDeadline(REST_MS);
        phaseTransitionLockRef.current = false;
      });
      return;
    }

    if (phase === 'rest-2') {
      startNextAttempt('attempt-3');
      phaseTransitionLockRef.current = false;
      return;
    }

    if (phase === 'attempt-3') {
      void finishAttemptPhase(3, setAttemptThreeMax).then(() => {
        const sessionId = evaluationSessionRef.current?.session_id;
        if (sessionId) {
          navigateToSummary(sessionId);
        } else {
          phaseTransitionLockRef.current = false;
        }
      });
    }
  }, [
    appendAttemptToSession,
    armPhaseDeadline,
    balloonProgress,
    navigateToSummary,
    phase,
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
    if (isDiagnosticAttemptPhase(phase)) return 'Inhala al máximo';
    if (isDiagnosticRestPhase(phase)) return 'Descansa';
    return 'Evaluación inicial';
  }, [phase]);

  const phaseHint = useMemo(() => {
    if (phase === 'attempt-1') return `Intento 1 de ${DIAGNOSTIC_ATTEMPT_COUNT} · 5 segundos`;
    if (phase === 'attempt-2') return `Intento 2 de ${DIAGNOSTIC_ATTEMPT_COUNT} · 5 segundos`;
    if (phase === 'attempt-3') return `Intento 3 de ${DIAGNOSTIC_ATTEMPT_COUNT} · 5 segundos`;
    if (phase === 'rest') return 'Prepárate para la segunda inspiración';
    if (phase === 'rest-2') return 'Prepárate para la tercera inspiración';
    return `${DIAGNOSTIC_ATTEMPT_COUNT} intentos de inspiración máxima · 5 s cada uno`;
  }, [phase]);

  const phaseCommandVariant = useMemo((): 'inhale' | 'rest' | 'idle' => {
    if (isDiagnosticRestPhase(phase)) return 'rest';
    if (isDiagnosticAttemptPhase(phase)) return 'inhale';
    return 'idle';
  }, [phase]);

  const currentPhaseDuration = isDiagnosticRestPhase(phase) ? REST_MS : ATTEMPT_MS;
  const progressRatio = Math.max(0, Math.min(1, 1 - timeLeftMs / currentPhaseDuration));

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

  const screenBottomInset = insets.bottom + spacing.md;
  const liveLabel = spirometerLabel ?? readiness.spirometerLabel;

  if (phase === 'welcome') {
    return (
      <InitialEvaluationWelcomeView
        canStart={canShowStartButton}
        loading={!isTouchPractice && readiness.loading}
        statusMessage={readiness.statusMessage}
        spirometerLabel={liveLabel}
        onStart={handleStartEvaluation}
        onGoToSensor={
          sensorRuntimeEnabled ? () => router.push('/sensor-connection') : undefined
        }
        onBack={handleBack}
      />
    );
  }

  if (phase === 'countdown') {
    return (
      <SafeAreaView style={styles.welcomeSafe} edges={['top']}>
        <AppTopBar
          showBackButton
          backFallbackHref="/(tabs)/index"
          onPressBack={handleBack}
          onPressProfile={() => router.push('/profile')}
        />
        <InitialEvaluationCountdownView count={countdownValue} />
      </SafeAreaView>
    );
  }

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
          <AppText
            variant="metric"
            style={[
              styles.phaseCommandText,
              phaseCommandVariant === 'rest' && styles.phaseCommandTextRest,
            ]}>
            {phaseActionLabel}
          </AppText>
          <AppText variant="chip" style={styles.phaseCommandHint}>
            {phaseHint}
          </AppText>
        </View>

        <View style={styles.timerRow}>
          <View style={styles.timerBlock}>
            <AppText variant="label" style={styles.timerLabel}>
              Tiempo
            </AppText>
            <AppText variant="metricLarge" style={styles.timerValueCompact}>
              {secondsLeft}s
            </AppText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
          </View>
        </View>

        <AppText variant="caption" style={styles.activeCardMeta}>
          {isTouchPractice
            ? 'Mantén presionado en el globo'
            : inAttempt && !hasLiveReading
              ? 'Esperando señal del sensor'
              : liveLabel
                ? `Medición en vivo · ${liveLabel}`
                : 'Medición en vivo'}
        </AppText>
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
            <AppText variant="label" style={styles.metricLabel}>
              Volumen actual
            </AppText>
            <AppText variant="metricSmall" style={styles.metricValue}>
              {Math.round(currentVolume)} mL
            </AppText>
          </View>
          <View style={styles.metricCard}>
            <AppText variant="label" style={styles.metricLabel}>
              Máximo intento
            </AppText>
            <AppText variant="metricSmall" style={styles.metricValue}>
              {Math.round(maxVolume)} mL
            </AppText>
          </View>
        </View>

        <View style={styles.attemptsRow}>
          <View style={[styles.attemptChip, phase === 'attempt-1' && styles.attemptChipActive]}>
            <AppText variant="chipSmall" style={styles.attemptChipLabel}>
              Intento 1
            </AppText>
            <AppText variant="bodySmall" style={styles.attemptChipValue}>
              {Math.round(attemptOneMax)} mL
            </AppText>
          </View>
          <View style={[styles.attemptChip, phase === 'attempt-2' && styles.attemptChipActive]}>
            <AppText variant="chipSmall" style={styles.attemptChipLabel}>
              Intento 2
            </AppText>
            <AppText variant="bodySmall" style={styles.attemptChipValue}>
              {Math.round(attemptTwoMax)} mL
            </AppText>
          </View>
          <View style={[styles.attemptChip, phase === 'attempt-3' && styles.attemptChipActive]}>
            <AppText variant="chipSmall" style={styles.attemptChipLabel}>
              Intento 3
            </AppText>
            <AppText variant="bodySmall" style={styles.attemptChipValue}>
              {Math.round(attemptThreeMax)} mL
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );

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
        onPressBack={handleBack}
        onPressProfile={() => router.push('/profile')}
      />

      <View style={styles.contentArea}>
        <View style={styles.gameCardShell}>{gameCard}</View>

        <AppText variant="chip" style={styles.safetyHint}>
          Respira con calma. Puedes cancelar si te sientes mal.
        </AppText>
        <Pressable
          style={({ pressed }) => [styles.cancelLink, pressed && styles.cancelLinkPressed]}
          onPress={confirmCancelEvaluation}
          accessibilityRole="button"
          accessibilityLabel="Cancelar evaluación">
          <AppText variant="link" style={styles.cancelLinkText}>
            Cancelar evaluación
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellness.screenBg,
  },
  welcomeSafe: {
    flex: 1,
    backgroundColor: wellness.screenBg,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.md,
  },
  activeCardMeta: {
    color: wellness.textSecondary,
    textAlign: 'center',
  },
  safetyHint: {
    marginTop: spacing.sm,
    fontWeight: '400',
    lineHeight: 18,
    color: wellness.textSecondary,
    textAlign: 'center',
  },
  cancelLink: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelLinkPressed: {
    opacity: 0.65,
  },
  cancelLinkText: {
    color: wellness.primaryDark,
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
    color: wellness.primaryDark,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  phaseCommandTextRest: {
    color: '#9A6B12',
  },
  phaseCommandHint: {
    marginTop: 2,
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
    fontWeight: '600',
    color: wellness.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
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
    fontWeight: '800',
    color: wellness.primaryDark,
  },
});
