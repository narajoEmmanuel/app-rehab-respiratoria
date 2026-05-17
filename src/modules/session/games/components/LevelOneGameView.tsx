import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { LevelOnePhase } from '@/src/modules/session/engine/level-one/use-level-one-game';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const REQUIRED_HOLD_MS = 3000;

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
  holdSecondsRemaining: number;
  prepSecondsRemaining: number;
  restSecondsRemaining: number;
  attemptFeedback: 'idle' | 'valid' | 'failed';
  onPressIn: () => void;
  onPressOut: () => void;
  onPressStop: () => void;
  simulatedVolume: number;
  targetVolume: number;
  holdSeconds: number;
  holdMs?: number;
  levelLabel?: string;
  introMode?: boolean;
  onIntroComplete?: () => void;
  /** Bloque informativo de volumen estimado (sensor); no altera el juego. */
  estimatedVolumeSlot?: ReactNode;
};

export function LevelOneGameView({
  phase,
  session,
  repetition,
  valid,
  failed,
  holdSecondsRemaining,
  prepSecondsRemaining,
  restSecondsRemaining,
  attemptFeedback,
  onPressIn,
  onPressOut,
  onPressStop,
  simulatedVolume,
  targetVolume,
  holdSeconds,
  holdMs = 0,
  levelLabel = 'Nivel 1',
  introMode = false,
  onIntroComplete,
  estimatedVolumeSlot,
}: LevelOneGameViewProps) {
  const { width: layoutW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rabbitIsHolding = phase === 'holding';
  const showObstacles = phase === 'ready' || phase === 'holding';
  const inRest = phase === 'resting';
  const inFailedFeedback = phase === 'exhale' && attemptFeedback === 'failed';
  const inValidFeedback = phase === 'exhale' && attemptFeedback === 'valid';
  const [failedObstacleFlash, setFailedObstacleFlash] = useState(false);

  const status = getStatusText({
    phase,
    holdSecondsRemaining,
    prepSecondsRemaining,
    restSecondsRemaining,
    attemptFeedback,
  });

  const estadoLabel = (() => {
    if (phase === 'preparing') return 'Prepárate';
    if (phase === 'ready' || phase === 'holding') return 'Sostén';
    if (phase === 'resting') return 'Descansa';
    if (phase === 'exhale') return attemptFeedback === 'failed' ? 'Ajusta' : 'Exhala';
    return status.primary;
  })();

  const holdProgress =
    phase === 'holding' ? Math.min(1, holdMs / REQUIRED_HOLD_MS) : phase === 'ready' ? 0 : 0;

  const tileW = Math.max(320, Math.ceil(layoutW));

  const mountainX = useSharedValue(0);
  const cloudX = useSharedValue(0);
  const groundX = useSharedValue(0);
  const nearX = useSharedValue(0);

  const bobY = useSharedValue(0);
  const jumpOffset = useSharedValue(0);
  const rabbitRot = useSharedValue(0);
  const feedbackPulse = useSharedValue(0);

  /** Montaña-obstáculo: un solo cuerpo que cruza la pantalla (SOSTÉN). */
  const obsMountain = useSharedValue(layoutW + 120);
  const obsMountainOpacity = useSharedValue(0);

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
    if (rabbitIsHolding) {
      const target = -(22 + Math.min(1, holdMs / REQUIRED_HOLD_MS) * 76);
      jumpOffset.value = withTiming(target, { duration: 90, easing: Easing.out(Easing.quad) });
      rabbitRot.value = withTiming(-10, { duration: 110, easing: Easing.out(Easing.cubic) });
    } else {
      jumpOffset.value = withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      rabbitRot.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) });
    }
  }, [holdMs, jumpOffset, rabbitIsHolding, rabbitRot]);

  useEffect(() => {
    if (!inValidFeedback) return;
    feedbackPulse.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) }),
    );
  }, [feedbackPulse, inValidFeedback]);

  const obstacleRunRef = useRef(0);

  useEffect(() => {
    if (!showObstacles) {
      cancelAnimation(obsMountain);
      cancelAnimation(obsMountainOpacity);
      obsMountainOpacity.value = 0;
      obsMountain.value = layoutW + 160;
      return;
    }

    const w = layoutW;
    const runId = ++obstacleRunRef.current;
    const duration = 3400;

    cancelAnimation(obsMountain);
    obsMountainOpacity.value = 0;
    obsMountainOpacity.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });

    obsMountain.value = w + 24;
    obsMountain.value = withTiming(-150, { duration, easing: Easing.linear });

    return () => {
      if (obstacleRunRef.current !== runId) return;
      cancelAnimation(obsMountain);
    };
  }, [layoutW, obsMountain, obsMountainOpacity, showObstacles]);

  useEffect(() => {
    if (!inFailedFeedback) return;
    setFailedObstacleFlash(true);
    cancelAnimation(obsMountain);
    obsMountain.value = 40;
    obsMountainOpacity.value = 1;
    const t = setTimeout(() => setFailedObstacleFlash(false), 280);
    return () => clearTimeout(t);
  }, [inFailedFeedback, obsMountain, obsMountainOpacity]);

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

  const rabbitStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value + jumpOffset.value }, { rotate: `${rabbitRot.value}deg` }],
  }));

  const rabbitShadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(jumpOffset.value, [0, -40, -98], [0.2, 0.14, 0.09]),
    transform: [
      { translateY: interpolate(jumpOffset.value, [0, -98], [0, -5]) },
      { scaleX: interpolate(jumpOffset.value, [0, -98], [1, 0.78]) },
    ],
  }));

  const feedbackStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + feedbackPulse.value * 0.08 }],
  }));

  const obstacleMountainStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: obsMountain.value }],
    opacity: obsMountainOpacity.value,
  }));

  const statusHero = (() => {
    if (phase === 'preparing') return 'PREPÁRATE';
    if (phase === 'ready' || phase === 'holding') return 'SOSTÉN';
    if (phase === 'resting') return 'DESCANSA';
    if (phase === 'exhale') {
      if (attemptFeedback === 'valid') return 'VÁLIDA';
      if (attemptFeedback === 'failed') return 'SIGUE ASÍ';
      return 'EXHALA';
    }
    if (phase === 'session-complete') return 'LISTO';
    return status.primary.toUpperCase();
  })();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#E3F0E8', '#D2E8DA', '#C4DFD0']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.35, y: 1 }}
      />
      <View style={[styles.playfield, { paddingBottom: Math.max(insets.bottom, 10) + 4 }]}>
        {!introMode ? (
          <HudDashboard
            levelLabel={levelLabel}
            session={session}
            repetition={repetition}
            valid={valid}
            failed={failed}
            targetVolume={targetVolume}
            holdSeconds={holdSeconds}
            estadoLabel={estadoLabel}
            onPause={onPressStop}
          />
        ) : (
          <View style={styles.introHudRow}>
            <Text style={styles.introHudLevel}>{levelLabel}</Text>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.pauseCompact} onPress={onPressStop} accessibilityRole="button">
              <Text style={styles.pauseCompactText}>Pausar</Text>
            </Pressable>
          </View>
        )}

        {!introMode && estimatedVolumeSlot ? estimatedVolumeSlot : null}

        <View style={styles.scene}>
          <View style={styles.parallaxClip}>
            <Animated.View style={[styles.mountainStrip, mountainStyle]}>
              <MountainSilhouette width={tileW} />
              <MountainSilhouette width={tileW} />
            </Animated.View>

            <Animated.View style={[styles.cloudStrip, cloudStyle]}>
              <CloudCluster />
              <CloudCluster />
            </Animated.View>

            <View style={styles.sunGlow} />
            <View style={styles.sunDisc} />

            <Animated.View style={[styles.groundStrip, groundStyle]}>
              <GroundSegment width={tileW} />
              <GroundSegment width={tileW} />
            </Animated.View>

            <Animated.View style={[styles.nearStrip, nearStyle]}>
              <NearGroundDecor width={tileW} />
              <NearGroundDecor width={tileW} />
            </Animated.View>

            <View style={styles.runnerLane}>
              <Animated.View style={[styles.rabbitShadow, rabbitShadowStyle]} />
              <Animated.View style={[styles.rabbitAnchor, rabbitStyle]}>
                <RunnerRabbit />
              </Animated.View>

              {showObstacles || failedObstacleFlash ? (
                <Animated.View style={[styles.obstacleSlot, obstacleMountainStyle]}>
                  <ObstacleMountain />
                </Animated.View>
              ) : null}
            </View>
          </View>

          {!introMode ? (
            <View style={styles.phaseBanner}>
              <Text style={styles.phaseBannerTitle}>{statusHero}</Text>
              {status.secondary ? <Text style={styles.phaseBannerSub}>{status.secondary}</Text> : null}
              {phase === 'holding' && !inFailedFeedback ? (
                <View style={styles.phaseTrack}>
                  <View style={[styles.phaseFill, { width: `${holdProgress * 100}%` }]} />
                </View>
              ) : null}
            </View>
          ) : null}

          {inRest ? (
            <View style={styles.toastSoft}>
              <Text style={styles.toastSoftText}>Descansa · paisaje tranquilo</Text>
            </View>
          ) : null}
          {inFailedFeedback ? (
            <View style={styles.toastWarn}>
              <Text style={styles.toastWarnText}>Casi… un poco más la próxima</Text>
            </View>
          ) : null}
          {inValidFeedback ? (
            <Animated.View style={[styles.toastOk, feedbackStyle]}>
              <Text style={styles.toastOkText}>Bien hecho</Text>
            </Animated.View>
          ) : null}

          {!introMode ? (
            <Pressable
              style={styles.gameTouchLayer}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              accessibilityRole="button"
              accessibilityLabel="Mantén presionado para inspirar y sostener"
            />
          ) : null}

          {introMode && onIntroComplete ? (
            <View style={styles.introOverlay} pointerEvents="box-none">
              <View style={styles.introCard}>
                <Text style={styles.introKicker}>Terapia respiratoria</Text>
                <Text style={styles.introLine}>
                  Cuando aparezca <Text style={styles.introStrong}>SOSTÉN</Text>, inspira hasta el volumen
                  objetivo.
                </Text>
                <Text style={styles.introLine}>Al sostener, el conejo salta los obstáculos.</Text>
                <Text style={styles.introLine}>
                  Con <Text style={styles.introStrong}>DESCANSA</Text>, exhala y prepárate otra vez.
                </Text>
                <Text style={styles.introLine}>Completa repeticiones válidas para avanzar.</Text>
                <Pressable style={styles.introCta} onPress={onIntroComplete} accessibilityRole="button">
                  <Text style={styles.introCtaText}>Entendido, comenzar</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {!introMode ? (
          <Pressable
            style={styles.volumeBar}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            accessibilityRole="adjustable"
            accessibilityLabel={`Volumen actual ${Math.round(simulatedVolume)} mililitros. Mantén presionado en el juego o aquí para inspirar.`}>
            <Text style={styles.volumeBarLabel}>Volumen actual</Text>
            <Text style={styles.volumeBarValue}>
              {Math.round(simulatedVolume)}
              <Text style={styles.volumeBarUnit}> mL</Text>
            </Text>
            <Text style={styles.volumeBarHint}>Mantén presionado para inspirar · suelta para exhalar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function HudDashboard({
  levelLabel,
  session,
  repetition,
  valid,
  failed,
  targetVolume,
  holdSeconds,
  estadoLabel,
  onPause,
}: {
  levelLabel: string;
  session: number;
  repetition: number;
  valid: number;
  failed: number;
  targetVolume: number;
  holdSeconds: number;
  estadoLabel: string;
  onPause: () => void;
}) {
  const BlurOrFallback =
    Platform.OS === 'web' ? View : BlurView;

  const blurProps =
    Platform.OS === 'web'
      ? {}
      : { intensity: 34, tint: 'light' as const };

  return (
    <View style={styles.hudOuter}>
      <BlurOrFallback {...blurProps} style={styles.hudBlur}>
        <View style={styles.hudSolidOverlay}>
          <View style={styles.hudHeaderRow}>
            <Text style={styles.hudTitleMini}>Sesión activa</Text>
            <Pressable onPress={onPause} style={styles.hudPause} accessibilityRole="button">
              <Text style={styles.hudPauseText}>Pausar</Text>
            </Pressable>
          </View>
          <View style={styles.hudGrid}>
            <View style={styles.hudRow2}>
              <HudCell compact label="Nivel" value={levelLabel} />
              <HudCell compact label="Sesión" value={`${session}/6`} />
            </View>
            <View style={styles.hudRow2}>
              <HudCell compact label="Rep." value={`${repetition}/10`} />
              <HudCell compact label="Objetivo" value={`${targetVolume} mL`} />
            </View>
            <View style={styles.hudRow2}>
              <HudCell label="Válidas" value={String(valid)} accent />
              <HudCell label="Fallidas" value={String(failed)} />
            </View>
            <View style={styles.hudRow2}>
              <HudCell label="Tiempo" value={`${holdSeconds.toFixed(1)} s`} />
              <HudCell label="Estado" value={estadoLabel} accent />
            </View>
          </View>
        </View>
      </BlurOrFallback>
    </View>
  );
}

function HudCell({
  label,
  value,
  accent,
  compact,
}: {
  label: string;
  value: string;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.hudCell, compact && styles.hudCellCompact, accent && styles.hudCellAccent]}>
      <Text style={[styles.hudCellLabel, compact && styles.hudCellLabelCompact]}>{label}</Text>
      <Text
        style={[styles.hudCellValue, compact && styles.hudCellValueCompact, accent && styles.hudCellValueAccent]}
        numberOfLines={1}>
        {value}
      </Text>
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

function CloudCluster() {
  return (
    <View style={styles.cloudTile}>
      <View style={[styles.cloudPuff, { width: 72, left: 0, top: 4 }]} />
      <View style={[styles.cloudPuff, { width: 52, left: 56, top: 12 }]} />
      <View style={[styles.cloudPuff, { width: 64, left: 112, top: 6 }]} />
      <View style={[styles.cloudPuff, { width: 48, left: 186, top: 14 }]} />
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

/** Montaña que se acerca desde la derecha durante SOSTÉN (mismo ritmo que el fondo lejano). */
function ObstacleMountain() {
  return (
    <View style={styles.mtnObsWrap} pointerEvents="none">
      <View style={styles.mtnObsFog} />
      <View style={styles.mtnObsShadowGround} />
      <View style={styles.mtnObsPeaks}>
        <LinearGradient
          colors={['#A8C4B4', '#7A9A86', '#5F7A68']}
          style={styles.mtnObsPeakLeft}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <LinearGradient
          colors={['#9BB8AA', '#6D8C78', '#4F6A56']}
          style={styles.mtnObsPeakRight}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
      <View style={styles.mtnObsRidge} />
    </View>
  );
}

/** Conejo unificado: una sola jerarquía, proporciones fijas, estilo minimal. */
function RunnerRabbit() {
  const fur = '#FAFAF7';
  const outline = '#7A8A82';
  const innerEar = '#E8B8C8';

  return (
    <View style={styles.bunnyRoot} pointerEvents="none">
      <View style={styles.bunnyEarsRow}>
        <View style={[styles.bunnyEar, { borderColor: outline, backgroundColor: fur }]}>
          <View style={[styles.bunnyEarInner, { backgroundColor: innerEar }]} />
        </View>
        <View style={[styles.bunnyEar, { borderColor: outline, backgroundColor: fur }]}>
          <View style={[styles.bunnyEarInner, { backgroundColor: innerEar }]} />
        </View>
      </View>
      <View style={[styles.bunnyTorso, { borderColor: outline, backgroundColor: fur }]}>
        <View style={styles.bunnyBelly} />
        <View style={styles.bunnyEye} />
        <View style={styles.bunnyNose} />
      </View>
      <View style={styles.bunnyFeetRow}>
        <View style={[styles.bunnyFoot, { borderColor: outline }]} />
        <View style={[styles.bunnyFoot, { borderColor: outline }]} />
      </View>
    </View>
  );
}

function getStatusText({
  phase,
  holdSecondsRemaining,
  prepSecondsRemaining,
  restSecondsRemaining,
  attemptFeedback,
}: {
  phase: LevelOnePhase;
  holdSecondsRemaining: number;
  prepSecondsRemaining: number;
  restSecondsRemaining: number;
  attemptFeedback: 'idle' | 'valid' | 'failed';
}) {
  if (phase === 'preparing') {
    return { primary: 'Prepárate', secondary: `Listo en ${prepSecondsRemaining}s` };
  }
  if (phase === 'ready') {
    return { primary: 'Sostén', secondary: 'Inspira y mantén 3 s' };
  }
  if (phase === 'holding') {
    return { primary: 'Sostén', secondary: `Mantén el aire… ${holdSecondsRemaining}s` };
  }
  if (phase === 'exhale') {
    if (attemptFeedback === 'valid') {
      return { primary: 'Válida', secondary: 'Exhala con calma' };
    }
    if (attemptFeedback === 'failed') {
      return { primary: 'Detente', secondary: 'Mantén más tiempo la próxima' };
    }
    return { primary: 'Exhala', secondary: '' };
  }
  if (phase === 'resting') {
    return { primary: 'Descansa', secondary: `${restSecondsRemaining}s` };
  }
  if (phase === 'session-complete') {
    return { primary: 'Sesión lista', secondary: '' };
  }
  if (phase === 'interrupted') {
    return { primary: 'Interrumpida', secondary: '' };
  }
  return { primary: 'Listo', secondary: '' };
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
    paddingTop: 8,
    paddingBottom: 8,
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
    gap: 6,
  },
  hudRow2: {
    flexDirection: 'row',
    gap: 6,
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
    paddingVertical: 5,
    paddingHorizontal: 8,
    minHeight: 40,
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
  hudCellValueAccent: {
    color: wellness.primaryDark,
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
  scene: {
    flex: 1,
    minHeight: 248,
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
  },
  gameTouchLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
    backgroundColor: 'transparent',
  },
  volumeBar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 2,
    paddingVertical: 12,
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
  volumeBarValue: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '900',
    color: wellness.primaryDark,
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
  rabbitAnchor: {
    position: 'absolute',
    left: '18%',
    bottom: 56,
    zIndex: 8,
  },
  rabbitShadow: {
    position: 'absolute',
    left: '18%',
    marginLeft: 18,
    bottom: 48,
    width: 44,
    height: 9,
    borderRadius: 6,
    backgroundColor: 'rgba(35, 55, 42, 0.2)',
    zIndex: 7,
  },
  obstacleSlot: {
    position: 'absolute',
    bottom: 42,
    left: 0,
    zIndex: 6,
  },
  mtnObsWrap: {
    width: 132,
    height: 86,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  mtnObsFog: {
    position: 'absolute',
    bottom: 12,
    width: 118,
    height: 54,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  mtnObsShadowGround: {
    position: 'absolute',
    bottom: 4,
    width: 108,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(35, 55, 42, 0.18)',
  },
  mtnObsPeaks: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 2,
    marginLeft: -6,
  },
  mtnObsPeakLeft: {
    width: 46,
    height: 52,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(61, 90, 74, 0.45)',
    marginRight: -14,
  },
  mtnObsPeakRight: {
    width: 58,
    height: 68,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 72, 58, 0.5)',
  },
  mtnObsRidge: {
    position: 'absolute',
    top: 18,
    right: 28,
    width: 22,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
    opacity: 0.85,
  },
  bunnyRoot: {
    width: 72,
    height: 88,
    alignItems: 'center',
  },
  bunnyEarsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: -10,
    zIndex: 2,
  },
  bunnyEar: {
    width: 12,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingTop: 5,
  },
  bunnyEarInner: {
    width: 5,
    height: 14,
    borderRadius: 3,
  },
  bunnyTorso: {
    width: 50,
    height: 56,
    borderRadius: 26,
    borderWidth: 1.5,
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  bunnyBelly: {
    position: 'absolute',
    width: 26,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    bottom: 8,
    opacity: 0.95,
  },
  bunnyEye: {
    position: 'absolute',
    top: 18,
    right: 14,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2C3834',
  },
  bunnyNose: {
    position: 'absolute',
    top: 26,
    right: 10,
    width: 6,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E8A0A8',
  },
  bunnyFeetRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: -6,
  },
  bunnyFoot: {
    width: 16,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F0F2EF',
    borderWidth: 1,
  },
  phaseBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  },
  phaseBannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: wellness.primaryDark,
    letterSpacing: 1,
  },
  phaseBannerSub: {
    marginTop: 4,
    fontSize: 12,
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
  toastSoft: {
    position: 'absolute',
    top: 96,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: wellness.border,
    zIndex: 18,
  },
  toastSoftText: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  toastWarn: {
    position: 'absolute',
    top: 96,
    left: 12,
    backgroundColor: wellness.errorBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(140, 58, 66, 0.2)',
    zIndex: 18,
  },
  toastWarnText: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.errorText,
  },
  toastOk: {
    position: 'absolute',
    top: 96,
    right: 12,
    backgroundColor: wellness.successBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: wellness.border,
    zIndex: 18,
  },
  toastOkText: {
    fontSize: 12,
    fontWeight: '800',
    color: wellness.primaryDark,
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
});
