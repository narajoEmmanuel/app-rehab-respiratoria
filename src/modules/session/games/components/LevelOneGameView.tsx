import Feather from '@expo/vector-icons/Feather';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  LEVEL_ONE_CLEAR_MIN_NORM,
  LEVEL_ONE_OBSTACLE_TOP_NORM,
} from '@/src/modules/session/engine/level-one/level-one-repetition-rules';
import {
  resolveRunnerInstruction,
  RunnerGameFeedbackBar,
} from '@/src/modules/session/games/components/RunnerGameFeedbackBar';
import { RunnerBunnyCoachBubble } from '@/src/modules/session/games/components/RunnerBunnyCoachBubble';
import { resolveRunnerCoachCue } from '@/src/modules/session/games/components/resolve-runner-coach-cue';
import { TouchInputPressFeedback } from '@/src/modules/session/games/components/TouchInputPressFeedback';
import {
  DesertBackdropCactus,
  DesertGroundSegment,
  DesertNearDecor,
  DesertSun,
  DuneSilhouette,
  InspirationMetaPyramid,
  InspirationMetaSnowman,
  InspirationMetaTractor,
  InspirationMetaTreasureChest,
  InspirationMetaRocket,
  OceanBackdropLife,
  OceanNearDecor,
  OceanSandGroundSegment,
  OceanWaterDepthLayer,
  SCENE_THEME_TOKENS,
  SpaceBackdropLife,
  SpaceDepthLayer,
  SpaceGroundSegment,
  SpaceNearDecor,
  SnowBackdropPines,
  SnowGroundSegment,
  SnowHillSilhouette,
  SnowNearDecor,
} from '@/src/modules/session/games/components/level-runner-scene';
import type { LevelOnePhase } from '@/src/modules/session/engine/level-one/use-level-one-game';
import type { LevelGameTheme, LevelObstacleType } from '@/src/modules/session/levels/level-gameplay-config';
import { wellness, wellnessColors, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { RespiraBunny } from '@/src/shared/ui/RespiraBunny';
import { RespiraBunnyImage } from '@/src/shared/ui/RespiraBunnyImage';

/** Altura mínima de salto (px) y rango adicional hasta la meta de inspiración. */
const JUMP_BASE_PX = 14;
const JUMP_RANGE_PX = 90;
const MAX_JUMP_PX = JUMP_BASE_PX + JUMP_RANGE_PX;
/** Escala solo visual del protagonista (conejo + colina); la lógica sigue en MAX_JUMP_PX. */
const GAME_VISUAL_SCALE = 1.26;
const RABBIT_ANCHOR_BOTTOM = 52;
const OBSTACLE_TOP_NORM = LEVEL_ONE_OBSTACLE_TOP_NORM;
/** Ancho de la colina-meta (escala visual). */
const META_HILL_WIDTH = Math.round(128 * GAME_VISUAL_SCALE);
/** Altura visual de la colina: base + cima alineada al salto máximo del conejo. */
const META_HILL_VISUAL_H = Math.round((MAX_JUMP_PX + 28) * GAME_VISUAL_SCALE);
/** Duración del mensaje «¡Ups!» y nube de impacto. */
const CRASH_UPS_TOAST_MS = 1500;
/** Celebración visual tras repetición válida (solo presentación; el motor no cambia). */
const VALID_CELEBRATION_MS = 1900;
const VALID_CELEBRATION_BUNNY_PX = 44;
/** Fin del choque: conejo normal y obstáculo fuera antes de DESCANSA. */
const CRASH_RECOVER_MS = 1900;
/** Altura aproximada del sprite del conejo (cuerpo + orejas, escala visual). */
const RABBIT_FIGURE_HEIGHT_PX = Math.round(88 * GAME_VISUAL_SCALE);
const RABBIT_VISUAL_WIDTH_PX = Math.round(72 * GAME_VISUAL_SCALE);
/** Altura mínima de la escena en pantallas pequeñas. */
const GAME_SCENE_MIN_FLOOR_PX = 252;

const wellnessShadowsSafe = {
  shadowColor: '#3D5A4A',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
  elevation: 4,
};

type LevelOneGameViewProps = {
  phase: LevelOnePhase;
  session: number;
  repetition: number;
  valid: number;
  failed: number;
  attemptOutcomes?: (boolean | null)[];
  restTotalSeconds?: number;
  holdSecondsRemaining: number;
  prepSecondsRemaining: number;
  restSecondsRemaining: number;
  attemptFeedback: 'idle' | 'valid' | 'failed';
  onPressIn: () => void;
  onPressOut: () => void;
  onPressPause?: () => void;
  /** Captura mantener/soltar pantalla como inspiración (entrada táctil). */
  touchInputEnabled?: boolean;
  simulatedVolume: number;
  displayVolumeMl: number;
  displayVolumeSource: 'sensor' | 'fallback';
  displayU95Ml?: number | null;
  displayVolumeStatus?: string;
  /** Mensaje breve cuando no hay volumen vivo (p. ej. señal obsoleta). */
  volumeHudMessage?: string | null;
  /** Muestra U95 y detalle técnico solo en depuración del sensor. */
  showSensorDebugMetrics?: boolean;
  targetVolume: number;
  holdMs?: number;
  sustainMs?: number;
  targetReached?: boolean;
  obstacleActive?: boolean;
  liveCrashSignal?: number;
  levelLabel?: string;
  levelDisplayName?: string;
  accentColor?: string;
  metaJustReached?: boolean;
  inhaleSoftHintVisible?: boolean;
  theme?: LevelGameTheme;
  obstacleType?: LevelObstacleType;
  introMode?: boolean;
  /** When false, hides runner RespiraBunny + shadow only (scene parallax keeps running). */
  showRunnerRabbit?: boolean;
  /** When false during introMode, hides the scene header title (e.g. level human name). */
  showSceneTitle?: boolean;
  onIntroComplete?: () => void;
  onIntroExit?: () => void;
  /** Visual-only: hide coach during pause modal, pre-start intro overlay, etc. */
  suppressCoachBubble?: boolean;
};

export function LevelOneGameView({
  phase,
  session,
  repetition,
  valid,
  failed,
  attemptOutcomes = [],
  restTotalSeconds = 10,
  holdSecondsRemaining,
  prepSecondsRemaining,
  restSecondsRemaining,
  attemptFeedback,
  onPressIn,
  onPressOut,
  onPressPause,
  touchInputEnabled = false,
  simulatedVolume: _simulatedVolume,
  displayVolumeMl,
  displayVolumeSource: _displayVolumeSource,
  displayU95Ml: _displayU95Ml = null,
  displayVolumeStatus: _displayVolumeStatus,
  volumeHudMessage = null,
  showSensorDebugMetrics: _showSensorDebugMetrics = false,
  targetVolume,
  holdMs = 0,
  sustainMs = 0,
  targetReached = false,
  obstacleActive = false,
  liveCrashSignal = 0,
  levelLabel = 'Nivel 1',
  levelDisplayName,
  accentColor = wellness.primary,
  metaJustReached = false,
  inhaleSoftHintVisible = false,
  theme = 'forest',
  obstacleType = 'mountain',
  introMode = false,
  showRunnerRabbit = true,
  showSceneTitle = true,
  onIntroComplete,
  onIntroExit,
  suppressCoachBubble = false,
}: LevelOneGameViewProps) {
  const sceneTheme = SCENE_THEME_TOKENS[theme];
  const isDesert = theme === 'desert';
  const isSnow = theme === 'snow';
  const isOcean = theme === 'ocean';
  const isSpace = theme === 'space';
  const isThemedScene = isDesert || isSnow || isOcean || isSpace;
  const [touchPressActive, setTouchPressActive] = useState(false);
  const { width: layoutW, height: layoutH } = useWindowDimensions();

  const handleTouchPressIn = useCallback(() => {
    setTouchPressActive(true);
    onPressIn();
  }, [onPressIn]);

  const handleTouchPressOut = useCallback(() => {
    setTouchPressActive(false);
    onPressOut();
  }, [onPressOut]);
  const insets = useSafeAreaInsets();
  const gameSceneMinHeight = useMemo(() => {
    const jumpEnvelope = RABBIT_ANCHOR_BOTTOM + RABBIT_FIGURE_HEIGHT_PX + MAX_JUMP_PX + 24;
    const responsiveFloor = Math.round(layoutH * 0.46);
    return Math.max(GAME_SCENE_MIN_FLOOR_PX, jumpEnvelope, responsiveFloor);
  }, [layoutH]);
  const [crashFxVisible, setCrashFxVisible] = useState(false);
  const [crashToastVisible, setCrashToastVisible] = useState(false);
  const crashSequenceRef = useRef(0);
  const rabbitIsInspiring = phase === 'inhaling' || phase === 'evaluating';
  /** Solo durante los 2 s oficiales de sostén. */
  const showGoalBarrier = obstacleActive;
  const inEvaluating = phase === 'evaluating';
  const inValidFeedback = phase === 'exhale' && attemptFeedback === 'valid';
  const [validCelebrationVisible, setValidCelebrationVisible] = useState(false);
  const validCelebrationAttemptRef = useRef('');
  const validCelebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showGameFeedback = crashToastVisible || validCelebrationVisible;

  const introTitle = levelDisplayName ?? levelLabel;

  const { phaseLabel, instructionText, instructionTone } = useMemo(
    () =>
      resolveRunnerInstruction({
        phase,
        metaJustReached,
        inhaleSoftHintVisible,
        attemptFeedback,
        holdSecondsRemaining,
        prepSecondsRemaining,
      }),
    [
      attemptFeedback,
      holdSecondsRemaining,
      inhaleSoftHintVisible,
      metaJustReached,
      phase,
      prepSecondsRemaining,
    ],
  );

  const sessionActive =
    !introMode &&
    phase !== 'not-started' &&
    phase !== 'session-complete' &&
    phase !== 'interrupted' &&
    phase !== 'level-complete';

  const coachCue = useMemo(
    () =>
      resolveRunnerCoachCue({
        phase,
        attemptFeedback,
        metaJustReached,
        inhaleSoftHintVisible,
        holdSecondsRemaining,
        prepSecondsRemaining,
        restSecondsRemaining,
        sessionActive,
        introMode,
        suppressed:
          suppressCoachBubble || crashToastVisible || inValidFeedback || validCelebrationVisible,
      }),
    [
      attemptFeedback,
      crashToastVisible,
      holdSecondsRemaining,
      inhaleSoftHintVisible,
      inValidFeedback,
      introMode,
      metaJustReached,
      phase,
      prepSecondsRemaining,
      restSecondsRemaining,
      sessionActive,
      suppressCoachBubble,
      validCelebrationVisible,
    ],
  );

  const playCenterX = layoutW * 0.5;
  const rabbitLeft = Math.max(10, playCenterX - RABBIT_VISUAL_WIDTH_PX * 0.48);
  const metaHillLeft = Math.max(6, playCenterX - META_HILL_WIDTH * 0.36);

  const inspirationNormTarget = useMemo(() => {
    if (!rabbitIsInspiring) return 0;
    if (targetVolume > 0 && displayVolumeMl > 0) {
      return Math.min(1.15, displayVolumeMl / targetVolume);
    }
    return 0;
  }, [displayVolumeMl, rabbitIsInspiring, targetVolume]);

  const rabbitClearsObstacle = inspirationNormTarget >= LEVEL_ONE_CLEAR_MIN_NORM;
  const isTouchingGoal = inEvaluating && !rabbitClearsObstacle;

  /** Cima visual del obstáculo alineada al salto norm = 1 (escala de pantalla). */
  const metaPassVisualPx = Math.round(MAX_JUMP_PX * OBSTACLE_TOP_NORM * GAME_VISUAL_SCALE);
  const metaHillBottom = RABBIT_ANCHOR_BOTTOM - 18;
  const collisionImpactLeft = rabbitLeft + Math.round(28 * GAME_VISUAL_SCALE);
  const maxVisualLiftPx = Math.round(MAX_JUMP_PX * GAME_VISUAL_SCALE);

  const tileW = Math.max(320, Math.ceil(layoutW));

  const mountainX = useSharedValue(0);
  const cloudX = useSharedValue(0);
  const groundX = useSharedValue(0);
  const nearX = useSharedValue(0);

  const bobY = useSharedValue(0);
  /** 0–1: inspiración visual (hold o volumen); preparado para sensor dinámico. */
  const inspirationLevel = useSharedValue(0);
  const feedbackPulse = useSharedValue(0);
  const feedbackOverlayOpacity = useSharedValue(0);
  const crashPulse = useSharedValue(0);
  const impactBurst = useSharedValue(0);
  const rabbitKnockbackX = useSharedValue(0);
  const rabbitSquash = useSharedValue(1);
  const sceneShakeX = useSharedValue(0);

  const metaHillOpacity = useSharedValue(0);
  const metaHillTranslateY = useSharedValue(16);

  useEffect(() => {
    if (
      phase === 'ready' ||
      phase === 'inhaling' ||
      phase === 'evaluating' ||
      phase === 'preparing'
    ) {
      setCrashFxVisible(false);
      setCrashToastVisible(false);
    }
  }, [phase]);

  useEffect(() => {
    const dM = 26000;
    const dC = 17500;
    const dG = 5000;
    const dN = 3200;

    cancelAnimation(mountainX);
    cancelAnimation(cloudX);
    cancelAnimation(groundX);
    cancelAnimation(nearX);

    mountainX.value = 0;
    cloudX.value = 0;
    groundX.value = 0;
    nearX.value = 0;

    mountainX.value = withRepeat(
      withTiming(-tileW, { duration: dM, easing: Easing.linear }),
      -1,
      false,
    );

    cloudX.value = withRepeat(
      withTiming(-tileW, { duration: dC, easing: Easing.linear }),
      -1,
      false,
    );

    groundX.value = withRepeat(
      withTiming(-tileW, { duration: dG, easing: Easing.linear }),
      -1,
      false,
    );

    nearX.value = withRepeat(
      withTiming(-tileW, { duration: dN, easing: Easing.linear }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(mountainX);
      cancelAnimation(cloudX);
      cancelAnimation(groundX);
      cancelAnimation(nearX);
    };
  }, [cloudX, groundX, mountainX, nearX, tileW]);

  useEffect(() => {
    bobY.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 138, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 138, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(bobY);
  }, [bobY]);

  useEffect(() => {
    inspirationLevel.value = withSpring(inspirationNormTarget, {
      damping: 20,
      stiffness: 165,
      mass: 0.85,
    });
  }, [inspirationLevel, inspirationNormTarget]);

  useEffect(() => {
    if (rabbitIsInspiring) return;
    const restingDescent =
      phase === 'resting' || inValidFeedback
        ? { damping: 24, stiffness: 95, mass: 1 }
        : { damping: 22, stiffness: 140, mass: 0.9 };
    inspirationLevel.value = withSpring(0, restingDescent);
  }, [inspirationLevel, inValidFeedback, phase, rabbitIsInspiring]);

  /** Reemplaza el toast legacy «Bien hecho» en el mismo instante (exhale + valid). */
  useEffect(() => {
    if (!inValidFeedback) {
      validCelebrationAttemptRef.current = '';
      return;
    }

    const attemptKey = `${session}-${repetition}`;
    if (validCelebrationAttemptRef.current === attemptKey) {
      return;
    }
    validCelebrationAttemptRef.current = attemptKey;

    if (validCelebrationTimerRef.current) {
      clearTimeout(validCelebrationTimerRef.current);
    }
    setValidCelebrationVisible(true);
    validCelebrationTimerRef.current = setTimeout(() => {
      validCelebrationTimerRef.current = null;
      setValidCelebrationVisible(false);
    }, VALID_CELEBRATION_MS);
  }, [inValidFeedback, repetition, session]);

  useEffect(
    () => () => {
      if (validCelebrationTimerRef.current) {
        clearTimeout(validCelebrationTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!validCelebrationVisible) return;
    feedbackPulse.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) }),
    );
  }, [feedbackPulse, validCelebrationVisible]);

  useEffect(() => {
    feedbackOverlayOpacity.value = withTiming(showGameFeedback ? 1 : 0, {
      duration: showGameFeedback ? 220 : 180,
      easing: Easing.out(Easing.quad),
    });
  }, [feedbackOverlayOpacity, showGameFeedback]);

  useEffect(() => {
    if (obstacleActive) {
      metaHillTranslateY.value = 24;
      metaHillOpacity.value = 0;
      metaHillTranslateY.value = withTiming(0, {
        duration: 480,
        easing: Easing.out(Easing.cubic),
      });
      metaHillOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }
    if (!crashFxVisible) {
      metaHillOpacity.value = withTiming(0, {
        duration: 360,
        easing: Easing.bezier(0.4, 0, 0.6, 1),
      });
      metaHillTranslateY.value = withTiming(22, {
        duration: 360,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [crashFxVisible, metaHillOpacity, metaHillTranslateY, obstacleActive, repetition, session]);

  const lastCrashSignalHandledRef = useRef(0);

  const runCrashFx = useCallback(() => {
    const seq = crashSequenceRef.current + 1;
    crashSequenceRef.current = seq;

    setCrashFxVisible(true);
    setCrashToastVisible(true);

    crashPulse.value = 0;
    crashPulse.value = withSequence(
      withTiming(1, { duration: 100, easing: Easing.out(Easing.quad) }),
      withDelay(380, withTiming(0, { duration: 280, easing: Easing.inOut(Easing.quad) })),
    );

    impactBurst.value = 0;
    impactBurst.value = withSequence(
      withTiming(1, { duration: 90, easing: Easing.out(Easing.back(1.6)) }),
      withDelay(CRASH_UPS_TOAST_MS - 200, withTiming(0, { duration: 220, easing: Easing.in(Easing.quad) })),
    );

    rabbitKnockbackX.value = withSequence(
      withTiming(-10, { duration: 70, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 11, stiffness: 220 }),
    );

    rabbitSquash.value = withSequence(
      withTiming(0.88, { duration: 70 }),
      withSpring(1, { damping: 14, stiffness: 280 }),
    );

    sceneShakeX.value = withSequence(
      withTiming(5, { duration: 45 }),
      withTiming(-4, { duration: 45 }),
      withTiming(2, { duration: 40 }),
      withTiming(0, { duration: 50, easing: Easing.out(Easing.quad) }),
    );

    inspirationLevel.value = withSpring(0, { damping: 18, stiffness: 130 });

    const hideUpsToast = setTimeout(() => {
      if (crashSequenceRef.current !== seq) return;
      setCrashToastVisible(false);
    }, CRASH_UPS_TOAST_MS);

    const endCrashRecover = setTimeout(() => {
      if (crashSequenceRef.current !== seq) return;
      setCrashFxVisible(false);
      metaHillOpacity.value = withTiming(0, { duration: 280, easing: Easing.in(Easing.cubic) });
      metaHillTranslateY.value = withTiming(16, { duration: 280 });
    }, CRASH_RECOVER_MS);

    return () => {
      clearTimeout(hideUpsToast);
      clearTimeout(endCrashRecover);
    };
  }, [
    crashPulse,
    impactBurst,
    inspirationLevel,
    metaHillOpacity,
    metaHillTranslateY,
    rabbitKnockbackX,
    rabbitSquash,
    sceneShakeX,
  ]);

  useEffect(() => {
    if (liveCrashSignal <= 0) return;
    if (lastCrashSignalHandledRef.current === liveCrashSignal) return;
    lastCrashSignalHandledRef.current = liveCrashSignal;
    return runCrashFx();
  }, [liveCrashSignal, runCrashFx]);

  const mountainStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: mountainX.value }],
  }));
  const cloudStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudX.value }],
  }));
  const groundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: groundX.value }],
  }));
  const nearStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nearX.value }],
  }));

  const rabbitStyle = useAnimatedStyle(() => {
    const lift = interpolate(inspirationLevel.value, [0, 1], [0, -maxVisualLiftPx]);
    const tilt = interpolate(inspirationLevel.value, [0, 1], [0, -11]);
    return {
      transform: [
        { translateX: rabbitKnockbackX.value },
        { translateY: bobY.value + lift },
        { rotate: `${tilt}deg` },
        { scaleY: rabbitSquash.value },
        { scaleX: interpolate(rabbitSquash.value, [0.88, 1], [1.06, 1]) },
      ],
    };
  });

  const rabbitShadowStyle = useAnimatedStyle(() => {
    const lift = interpolate(inspirationLevel.value, [0, 1], [0, -maxVisualLiftPx]);
    const liftMid = -maxVisualLiftPx * 0.48;
    return {
      opacity: interpolate(lift, [0, liftMid, -maxVisualLiftPx], [0.24, 0.15, 0.08]),
      transform: [
        { translateX: rabbitKnockbackX.value * 0.5 },
        { translateY: interpolate(lift, [0, -maxVisualLiftPx], [0, -8]) },
        { scaleX: interpolate(lift, [0, -maxVisualLiftPx], [1, 0.7]) },
      ],
    };
  });

  const sceneShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sceneShakeX.value }],
  }));

  const impactBurstStyle = useAnimatedStyle(() => ({
    opacity: impactBurst.value,
    transform: [
      { scale: interpolate(impactBurst.value, [0, 1], [0.4, 1.15]) },
      { translateY: interpolate(impactBurst.value, [0, 1], [8, -4]) },
    ],
  }));

  const feedbackStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + feedbackPulse.value * 0.08 }],
  }));

  const feedbackOverlayStyle = useAnimatedStyle(() => ({
    opacity: feedbackOverlayOpacity.value,
    transform: [{ translateY: interpolate(feedbackOverlayOpacity.value, [0, 1], [-8, 0]) }],
  }));

  const metaHillStyle = useAnimatedStyle(() => ({
    opacity: metaHillOpacity.value,
    transform: [{ translateY: metaHillTranslateY.value }],
  }));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...sceneTheme.skyGradient]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.35, y: 1 }}
      />
      <View style={[styles.playfield, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
        {!introMode ? (
          <View style={styles.infoZone}>
            <RunnerGameFeedbackBar
              phase={phase}
              displayVolumeMl={displayVolumeMl}
              targetVolume={targetVolume}
              volumeHudMessage={volumeHudMessage}
              repetition={repetition}
              valid={valid}
              failed={failed}
              attemptOutcomes={attemptOutcomes}
              restSecondsRemaining={restSecondsRemaining}
              restTotalSeconds={restTotalSeconds}
              prepSecondsRemaining={prepSecondsRemaining}
              instructionText={instructionText}
              phaseLabel={phaseLabel}
              instructionTone={instructionTone}
              accentColor={accentColor}
              attemptFeedback={attemptFeedback}
              inhaleSoftHintVisible={inhaleSoftHintVisible}
              showPauseButton={sessionActive && Boolean(onPressPause)}
              onPressPause={onPressPause}
            />
            <View style={styles.coachDock} pointerEvents="none">
              <RunnerBunnyCoachBubble
                visible={coachCue.visible}
                message={coachCue.message}
                pose={coachCue.pose}
                tone={coachCue.tone}
                size="compact"
                accentColor={accentColor}
                autoHideMs={3600}
              />
            </View>
          </View>
        ) : showSceneTitle ? (
          <View style={styles.introTitleRow}>
            <Text style={[styles.introLevelTitle, { color: accentColor }]}>{introTitle}</Text>
          </View>
        ) : null}

        <View style={[styles.gameStage, { minHeight: gameSceneMinHeight }]}>
          <View
            style={[
              styles.scene,
              isThemedScene && { borderColor: sceneTheme.sceneBorder, backgroundColor: sceneTheme.skyGradient[0] },
            ]}>
          <Animated.View style={[styles.parallaxClip, sceneShakeStyle]}>
            <Animated.View style={[styles.mountainStrip, mountainStyle]}>
              {isSpace ? (
                <>
                  <SpaceDepthLayer width={tileW} />
                  <SpaceDepthLayer width={tileW} />
                </>
              ) : isOcean ? (
                <>
                  <OceanWaterDepthLayer width={tileW} />
                  <OceanWaterDepthLayer width={tileW} />
                </>
              ) : isSnow ? (
                <>
                  <SnowHillSilhouette width={tileW} />
                  <SnowHillSilhouette width={tileW} />
                </>
              ) : isDesert ? (
                <>
                  <DuneSilhouette width={tileW} />
                  <DuneSilhouette width={tileW} />
                </>
              ) : (
                <>
                  <MountainSilhouette width={tileW} />
                  <MountainSilhouette width={tileW} />
                </>
              )}
            </Animated.View>

            {!isOcean && !isSpace ? (
              <Animated.View style={[styles.cloudStrip, cloudStyle]}>
                <CloudCluster puffColor={sceneTheme.cloudPuff} />
                <CloudCluster puffColor={sceneTheme.cloudPuff} />
              </Animated.View>
            ) : null}

            {isSpace ? (
              <SpaceBackdropLife />
            ) : isOcean ? (
              <OceanBackdropLife />
            ) : isDesert ? (
              <>
                <DesertSun />
                <DesertBackdropCactus side="left" />
              </>
            ) : isSnow ? (
              <>
                <View style={[styles.sunGlow, { backgroundColor: sceneTheme.sunGlow, opacity: 0.85 }]} />
                <View
                  style={[
                    styles.sunDisc,
                    {
                      backgroundColor: sceneTheme.sunDisc,
                      borderColor: sceneTheme.sunDiscBorder,
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                    },
                  ]}
                />
                <SnowBackdropPines />
              </>
            ) : (
              <>
                <View style={[styles.sunGlow, { backgroundColor: sceneTheme.sunGlow }]} />
                <View
                  style={[
                    styles.sunDisc,
                    {
                      backgroundColor: sceneTheme.sunDisc,
                      borderColor: sceneTheme.sunDiscBorder,
                    },
                  ]}
                />
              </>
            )}

            <Animated.View style={[styles.groundStrip, groundStyle]}>
              {isSpace ? (
                <>
                  <SpaceGroundSegment width={tileW} />
                  <SpaceGroundSegment width={tileW} />
                </>
              ) : isOcean ? (
                <>
                  <OceanSandGroundSegment width={tileW} />
                  <OceanSandGroundSegment width={tileW} />
                </>
              ) : isSnow ? (
                <>
                  <SnowGroundSegment width={tileW} />
                  <SnowGroundSegment width={tileW} />
                </>
              ) : isDesert ? (
                <>
                  <DesertGroundSegment width={tileW} />
                  <DesertGroundSegment width={tileW} />
                </>
              ) : (
                <>
                  <GroundSegment width={tileW} />
                  <GroundSegment width={tileW} />
                </>
              )}
            </Animated.View>

            <Animated.View style={[styles.nearStrip, nearStyle]}>
              {isSpace ? (
                <>
                  <SpaceNearDecor width={tileW} />
                  <SpaceNearDecor width={tileW} />
                </>
              ) : isOcean ? (
                <>
                  <OceanNearDecor width={tileW} />
                  <OceanNearDecor width={tileW} />
                </>
              ) : isSnow ? (
                <>
                  <SnowNearDecor width={tileW} />
                  <SnowNearDecor width={tileW} />
                </>
              ) : isDesert ? (
                <>
                  <DesertNearDecor width={tileW} />
                  <DesertNearDecor width={tileW} />
                </>
              ) : (
                <>
                  <NearGroundDecor width={tileW} />
                  <NearGroundDecor width={tileW} />
                </>
              )}
            </Animated.View>

            <View style={styles.runnerLane}>
              {showRunnerRabbit ? (
                <>
                  <Animated.View
                    style={[
                      styles.rabbitShadow,
                      {
                        left: rabbitLeft + Math.round(20 * GAME_VISUAL_SCALE),
                        bottom: RABBIT_ANCHOR_BOTTOM - 8,
                      },
                      rabbitShadowStyle,
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.rabbitAnchor,
                      { left: rabbitLeft, bottom: RABBIT_ANCHOR_BOTTOM },
                      rabbitStyle,
                    ]}>
                    <View style={styles.rabbitVisualScale}>
                      <RespiraBunny
                        mood={crashFxVisible ? 'crashed' : 'default'}
                        variant={isSpace ? 'astronaut' : 'default'}
                      />
                    </View>
                  </Animated.View>
                </>
              ) : null}

              {showGoalBarrier ? (
                <Animated.View
                  style={[
                    styles.metaHillSlot,
                    {
                      left: metaHillLeft,
                      bottom: metaHillBottom,
                      width: META_HILL_WIDTH,
                      height: META_HILL_VISUAL_H,
                    },
                    metaHillStyle,
                  ]}>
                  {obstacleType === 'rocket' ? (
                    <InspirationMetaRocket
                      passHeightPx={metaPassVisualPx}
                      evaluating={inEvaluating}
                      cleared={rabbitClearsObstacle}
                      touching={isTouchingGoal}
                      visualHeight={META_HILL_VISUAL_H}
                      visualWidth={META_HILL_WIDTH}
                    />
                  ) : obstacleType === 'treasureChest' ? (
                    <InspirationMetaTreasureChest
                      passHeightPx={metaPassVisualPx}
                      evaluating={inEvaluating}
                      cleared={rabbitClearsObstacle}
                      touching={isTouchingGoal}
                      visualHeight={META_HILL_VISUAL_H}
                      visualWidth={META_HILL_WIDTH}
                    />
                  ) : obstacleType === 'snowman' ? (
                    <InspirationMetaSnowman
                      passHeightPx={metaPassVisualPx}
                      evaluating={inEvaluating}
                      cleared={rabbitClearsObstacle}
                      touching={isTouchingGoal}
                      visualHeight={META_HILL_VISUAL_H}
                      visualWidth={META_HILL_WIDTH}
                    />
                  ) : obstacleType === 'pyramid' ? (
                    <InspirationMetaPyramid
                      passHeightPx={metaPassVisualPx}
                      evaluating={inEvaluating}
                      cleared={rabbitClearsObstacle}
                      touching={isTouchingGoal}
                      visualHeight={META_HILL_VISUAL_H}
                      visualWidth={META_HILL_WIDTH}
                    />
                  ) : obstacleType === 'tractor' ? (
                    <InspirationMetaTractor
                      passHeightPx={metaPassVisualPx}
                      evaluating={inEvaluating}
                      cleared={rabbitClearsObstacle}
                      touching={isTouchingGoal}
                      visualHeight={META_HILL_VISUAL_H}
                      visualWidth={META_HILL_WIDTH}
                    />
                  ) : (
                    <InspirationMetaHill
                      passHeightPx={metaPassVisualPx}
                      evaluating={inEvaluating}
                      cleared={rabbitClearsObstacle}
                      touching={isTouchingGoal}
                    />
                  )}
                </Animated.View>
              ) : null}

              {crashToastVisible ? (
                <Animated.View
                  style={[styles.crashImpactAnchor, { left: collisionImpactLeft }, impactBurstStyle]}
                  pointerEvents="none">
                  <CrashImpactFx />
                </Animated.View>
              ) : null}
            </View>
          </Animated.View>

          {!introMode ? (
            <Animated.View
              style={[styles.gameFeedbackOverlay, feedbackOverlayStyle]}
              pointerEvents="none">
              {crashToastVisible ? (
                <View style={styles.toastWarn}>
                  <Text style={styles.toastWarnText}>¡Ups! Sube un poco más la próxima</Text>
                </View>
              ) : null}
              {validCelebrationVisible ? (
                <Animated.View
                  style={[styles.validCelebrationToast, feedbackStyle]}
                  accessibilityRole="text"
                  accessibilityLabel="¡Muy bien! Repetición válida">
                  <RespiraBunnyImage pose="celebrate" size={VALID_CELEBRATION_BUNNY_PX} />
                  <View style={styles.validCelebrationTextCol}>
                    <Text style={styles.validCelebrationTitle}>¡Muy bien!</Text>
                    <Text style={styles.validCelebrationSubtitle}>Repetición válida</Text>
                  </View>
                  <View style={styles.validCelebrationBadge}>
                    <Text style={styles.validCelebrationSparkle}>✦</Text>
                    <Feather name="check-circle" size={20} color={wellness.primary} />
                  </View>
                </Animated.View>
              ) : null}
            </Animated.View>
          ) : null}

          {touchInputEnabled ? (
            <TouchInputPressFeedback visible={touchPressActive} />
          ) : null}

          {!introMode && touchInputEnabled ? (
            <Pressable
              style={styles.gameTouchLayer}
              onPressIn={handleTouchPressIn}
              onPressOut={handleTouchPressOut}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}

          {introMode && onIntroComplete ? (
            <View
              style={[styles.introOverlay, { backgroundColor: sceneTheme.introOverlay }]}
              pointerEvents="box-none">
              <View style={[styles.introCard, { borderColor: accentColor }]}>
                <Text style={[styles.introKicker, { color: accentColor }]}>Terapia respiratoria</Text>
                <Text style={styles.introLine}>
                  Con <Text style={[styles.introStrong, { color: accentColor }]}>INSPIRA</Text>, alcanza
                  la meta de volumen a tu ritmo.
                </Text>
                <Text style={styles.introLine}>
                  Con <Text style={[styles.introStrong, { color: accentColor }]}>SOSTÉN</Text>, mantente
                  arriba de la meta durante 2 segundos.
                </Text>
                <Text style={styles.introLine}>
                  Con <Text style={[styles.introStrong, { color: accentColor }]}>DESCANSA</Text>, exhala y
                  prepárate otra vez.
                </Text>
                <Text style={styles.introLineMuted}>
                  Completa repeticiones válidas para avanzar en tu nivel.
                </Text>
                <Pressable
                  style={[styles.introCta, { backgroundColor: accentColor }]}
                  onPress={onIntroComplete}
                  accessibilityRole="button">
                  <Text style={styles.introCtaText}>Entendido, comenzar</Text>
                </Pressable>
                {onIntroExit ? (
                  <Pressable style={styles.introExitBtn} onPress={onIntroExit} accessibilityRole="button">
                    <Text style={styles.introExitBtnText}>Regresar</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function MountainSilhouette({ width }: { width: number }) {
  return (
    <View style={[styles.mtnTile, { width }]}>
      <View style={[styles.mtnPeak, { left: width * 0.08 }]} />
      <View style={[styles.mtnPeakTall, { left: width * 0.28 }]} />
      <View style={[styles.mtnPeakShort, { left: width * 0.52 }]} />
      <View style={[styles.mtnPeak, { left: width * 0.72 }]} />
    </View>
  );
}

function CloudCluster({ puffColor = 'rgba(255,255,255,0.92)' }: { puffColor?: string }) {
  return (
    <View style={styles.cloudTile}>
      <View style={[styles.cloudPuff, { width: 72, left: 0, top: 4, backgroundColor: puffColor }]} />
      <View style={[styles.cloudPuff, { width: 52, left: 56, top: 12, backgroundColor: puffColor }]} />
      <View style={[styles.cloudPuff, { width: 64, left: 112, top: 6, backgroundColor: puffColor }]} />
      <View style={[styles.cloudPuff, { width: 48, left: 186, top: 14, backgroundColor: puffColor }]} />
    </View>
  );
}

function GroundSegment({ width }: { width: number }) {
  return (
    <View style={[styles.groundTile, { width }]}>
      <LinearGradient
        colors={['#A8CFAE', '#93C29A', '#7FB388']}
        style={styles.groundGrassTop}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.groundDirt} />
      <View style={[styles.groundStripe, { left: width * 0.15 }]} />
      <View style={[styles.groundStripe, { left: width * 0.45 }]} />
      <View style={[styles.groundStripe, { left: width * 0.75 }]} />
    </View>
  );
}

function NearGroundDecor({ width }: { width: number }) {
  return (
    <View style={[styles.nearTile, { width }]}>
      <View style={[styles.tuft, { left: width * 0.12 }]} />
      <View style={[styles.tuftSmall, { left: width * 0.35 }]} />
      <View style={[styles.tuft, { left: width * 0.58 }]} />
      <View style={[styles.tuftTiny, { left: width * 0.82 }]} />
    </View>
  );
}

/**
 * Colina orgánica: la cima visual coincide con el salto del conejo a norm = 1 (sin etiquetas).
 */
function InspirationMetaHill({
  passHeightPx,
  evaluating,
  cleared,
  touching,
}: {
  passHeightPx: number;
  evaluating: boolean;
  cleared: boolean;
  touching: boolean;
}) {
  const isAlert = touching || (evaluating && !cleared);
  const moundHeight = Math.min(passHeightPx + 40, META_HILL_VISUAL_H - 4);

  const slopeColors = isAlert
    ? (['#8FAF8E', '#6F9174', '#5A7A62', '#4D6B55'] as const)
    : (['#A8CEB0', '#85B490', '#6B9D78', '#5C8E6A'] as const);

  return (
    <View style={styles.metaHillRoot} pointerEvents="none">
      <View style={styles.metaHillGroundShadow} />

      <View style={[styles.metaHillMound, { height: moundHeight }]}>
        <LinearGradient
          colors={[...slopeColors]}
          locations={[0, 0.38, 0.72, 1]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)', 'transparent']}
          locations={[0, 0.35, 1]}
          style={styles.metaHillLightFace}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
        <LinearGradient
          colors={['transparent', 'rgba(42, 62, 48, 0.12)']}
          style={styles.metaHillShadeFace}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.2)', 'transparent']}
          style={[styles.metaHillSummitBand, { bottom: passHeightPx - 8 }]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      {cleared && evaluating ? (
        <View style={[styles.metaHillClearedGlow, { bottom: passHeightPx - 10 }]} />
      ) : null}
      {touching ? <View style={styles.metaHillContactTint} /> : null}
    </View>
  );
}

function CrashImpactFx() {
  return (
    <View style={styles.crashFxWrap} pointerEvents="none">
      <View style={styles.crashFxPuffOuter} />
      <View style={styles.crashFxPuffInner} />
      <Text style={styles.crashFxBoom}>¡Ups!</Text>
    </View>
  );
}

const SKY_TOP = '#D8EBDF';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    borderRadius: wellnessRadii.cardLarge,
    overflow: 'hidden',
    ...wellnessShadowsSafe,
  },
  playfield: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  infoZone: {
    flexShrink: 0,
    width: '100%',
    zIndex: 2,
  },
  coachDock: {
    width: '100%',
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  hudOuter: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  hudBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  hudSolidOverlay: {
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.58)',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
  },
  hudHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  hudTitleMini: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: wellness.textSecondary,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  hudPause: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  hudPauseText: {
    fontSize: 11,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  hudGrid: {
    gap: 5,
  },
  hudRow2: {
    flexDirection: 'row',
    gap: 6,
  },
  hudRow3: {
    flexDirection: 'row',
    gap: 5,
  },
  hudCell: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(61, 90, 74, 0.08)',
    minHeight: 58,
    justifyContent: 'center',
  },
  hudCellCompact: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    minHeight: 36,
    borderRadius: 10,
  },
  hudCellAccent: {
    backgroundColor: 'rgba(52, 171, 165, 0.08)',
    borderColor: 'rgba(52, 171, 165, 0.15)',
  },
  hudCellLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: wellness.textSecondary,
    marginBottom: 4,
  },
  hudCellLabelCompact: {
    fontSize: 9,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  hudCellValue: {
    fontSize: 15,
    fontWeight: '800',
    color: wellness.text,
  },
  hudCellValueCompact: {
    fontSize: 12,
    fontWeight: '800',
  },
  hudCellUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: wellness.textSecondary,
  },
  hudCellValueAccent: {
    color: wellness.primaryDark,
  },
  introTitleRow: {
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 4,
  },
  introLevelTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  introHudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  introHudLevel: {
    fontSize: 14,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  pauseCompact: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  pauseCompactText: {
    fontSize: 12,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  gameStage: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  scene: {
    flex: 1,
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(79, 111, 82, 0.14)',
    overflow: 'hidden',
    backgroundColor: SKY_TOP,
  },
  parallaxClip: {
    flex: 1,
    overflow: 'hidden',
  },
  mountainStrip: {
    position: 'absolute',
    bottom: 118,
    left: 0,
    flexDirection: 'row',
  },
  mtnTile: {
    height: 64,
    justifyContent: 'flex-end',
  },
  mtnPeak: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 38,
    borderRightWidth: 38,
    borderBottomWidth: 48,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(154, 182, 168, 0.55)',
  },
  mtnPeakTall: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 46,
    borderRightWidth: 46,
    borderBottomWidth: 62,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(138, 168, 152, 0.5)',
  },
  mtnPeakShort: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 32,
    borderRightWidth: 32,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(168, 190, 176, 0.45)',
  },
  cloudStrip: {
    position: 'absolute',
    top: 22,
    left: 0,
    flexDirection: 'row',
  },
  cloudTile: {
    width: 320,
    height: 44,
    position: 'relative',
  },
  cloudPuff: {
    position: 'absolute',
    height: 22,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  sunGlow: {
    position: 'absolute',
    right: 24,
    top: 28,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 235, 180, 0.35)',
  },
  sunDisc: {
    position: 'absolute',
    right: 32,
    top: 36,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0E4B8',
    borderWidth: 1,
    borderColor: 'rgba(200, 180, 120, 0.35)',
  },
  groundStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    flexDirection: 'row',
  },
  groundTile: {
    height: 72,
    position: 'relative',
  },
  groundGrassTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 22,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  groundDirt: {
    ...StyleSheet.absoluteFillObject,
    top: 18,
    backgroundColor: '#8BAF92',
  },
  groundStripe: {
    position: 'absolute',
    top: 36,
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(70, 98, 78, 0.12)',
  },
  nearStrip: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    flexDirection: 'row',
    height: 20,
  },
  nearTile: {
    height: 20,
    position: 'relative',
  },
  tuft: {
    position: 'absolute',
    bottom: 0,
    width: 10,
    height: 16,
    borderRadius: 5,
    backgroundColor: '#7BA67F',
    opacity: 0.9,
  },
  tuftSmall: {
    position: 'absolute',
    bottom: 0,
    width: 8,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#89B88E',
  },
  tuftTiny: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    height: 9,
    borderRadius: 3,
    backgroundColor: '#78A67C',
  },
  runnerLane: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    pointerEvents: 'box-none',
    alignItems: 'center',
  },
  gameTouchLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
    backgroundColor: 'transparent',
  },
  volumeSection: {
    flexShrink: 0,
    marginTop: 6,
    marginBottom: 2,
  },
  volumeBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(61, 90, 74, 0.1)',
    ...wellnessShadowsSafe,
  },
  volumeBarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    letterSpacing: 0.3,
  },
  volumeBarValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  volumeBarValue: {
    fontSize: 28,
    fontWeight: '900',
    color: wellness.primaryDark,
  },
  volumeBarU95: {
    fontSize: 13,
    fontWeight: '700',
    color: wellness.textSecondary,
  },
  volumeBarUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.textSecondary,
  },
  volumeBarHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
  },
  volumeBarWaiting: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: wellness.textSecondary,
    textAlign: 'center',
  },
  rabbitAnchor: {
    position: 'absolute',
    zIndex: 8,
  },
  rabbitVisualScale: {
    transform: [{ scale: GAME_VISUAL_SCALE }],
  },
  rabbitShadow: {
    position: 'absolute',
    width: Math.round(44 * GAME_VISUAL_SCALE),
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(35, 55, 42, 0.2)',
    zIndex: 7,
  },
  metaHillSlot: {
    position: 'absolute',
    zIndex: 6,
    overflow: 'visible',
  },
  metaHillRoot: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  metaHillGroundShadow: {
    position: 'absolute',
    left: '8%',
    right: '6%',
    bottom: 2,
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(35, 55, 42, 0.14)',
  },
  metaHillMound: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    borderTopLeftRadius: 72,
    borderTopRightRadius: 56,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
  },
  metaHillLightFace: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '48%',
  },
  metaHillShadeFace: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '38%',
  },
  metaHillSummitBand: {
    position: 'absolute',
    left: '12%',
    right: '14%',
    height: 20,
    borderRadius: 12,
  },
  metaHillClearedGlow: {
    position: 'absolute',
    left: 8,
    right: 10,
    height: 26,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 171, 165, 0.18)',
    zIndex: 2,
  },
  metaHillContactTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180, 95, 80, 0.12)',
    zIndex: 4,
  },
  crashImpactAnchor: {
    position: 'absolute',
    bottom: 88,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crashFxWrap: {
    width: 88,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crashFxPuffOuter: {
    position: 'absolute',
    width: 72,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 2,
    borderColor: 'rgba(201, 162, 39, 0.35)',
  },
  crashFxPuffInner: {
    position: 'absolute',
    width: 48,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 235, 200, 0.9)',
  },
  crashFxBoom: {
    fontSize: 18,
    fontWeight: '900',
    color: '#8C3A42',
    letterSpacing: 0.5,
    zIndex: 2,
  },
  phaseStrip: {
    marginTop: 4,
    marginBottom: 2,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(61, 90, 74, 0.08)',
    alignItems: 'center',
  },
  phaseStripTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: wellness.primaryDark,
    letterSpacing: 0.8,
  },
  phaseStripSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
  },
  phaseTrack: {
    marginTop: 8,
    width: '100%',
    maxWidth: 220,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
  },
  phaseFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: wellness.primary,
  },
  gameFeedbackOverlay: {
    position: 'absolute',
    top: 16,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 22,
  },
  toastSoft: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  toastSoftText: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  toastWarn: {
    backgroundColor: wellness.errorBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(140, 58, 66, 0.2)',
  },
  toastWarnText: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.errorText,
  },
  validCelebrationToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 340,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: wellnessRadii.cardLarge,
    backgroundColor: wellnessColors.primarySubtle,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 171, 165, 0.32)',
    ...wellnessShadows.soft,
  },
  validCelebrationTextCol: {
    flex: 1,
    gap: 2,
  },
  validCelebrationTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.primaryDark,
    letterSpacing: 0.2,
  },
  validCelebrationSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: wellness.textSecondary,
    letterSpacing: 0.15,
  },
  validCelebrationBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingLeft: 2,
  },
  validCelebrationSparkle: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(201, 162, 39, 0.75)',
    letterSpacing: 1,
  },
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(216, 235, 223, 0.42)',
    zIndex: 30,
  },
  introCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: wellness.border,
    ...wellnessShadowsSafe,
  },
  introKicker: {
    fontSize: 12,
    fontWeight: '800',
    color: wellness.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    textAlign: 'center',
  },
  introLine: {
    fontSize: 14,
    lineHeight: 21,
    color: wellness.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  introLineMuted: {
    fontSize: 13,
    lineHeight: 19,
    color: wellness.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  introStrong: {
    fontWeight: '900',
    color: wellness.primaryDark,
  },
  introCta: {
    marginTop: 14,
    backgroundColor: wellness.primary,
    paddingVertical: 15,
    borderRadius: wellnessRadii.pill,
    alignItems: 'center',
  },
  introCtaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  introExitBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  introExitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: wellness.textSecondary,
  },
});
