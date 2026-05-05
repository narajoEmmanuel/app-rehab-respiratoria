import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { GameStatusBanner } from '@/src/modules/session/games/components/GameStatusBanner';
import { ProgressHud } from '@/src/modules/session/games/components/ProgressHud';
import type { LevelOnePhase } from '@/src/modules/session/engine/level-one/use-level-one-game';

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
}: LevelOneGameViewProps) {
  const rabbitIsHolding = phase === 'holding';
  const obstacleMainX = useRef(new Animated.Value(360)).current;
  const obstacleDecoX = useRef(new Animated.Value(520)).current;
  const cloudOffset = useRef(new Animated.Value(0)).current;
  const groundOffset = useRef(new Animated.Value(0)).current;
  const sunScale = useRef(new Animated.Value(1)).current;
  const rabbitStride = useRef(new Animated.Value(0)).current;
  const rabbitLift = useRef(new Animated.Value(0)).current;
  const stumbleOffset = useRef(new Animated.Value(0)).current;
  const feedbackPulse = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    const cloudLoop = Animated.loop(
      Animated.timing(cloudOffset, {
        toValue: -260,
        duration: 4800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );
    const groundLoop = Animated.loop(
      Animated.timing(groundOffset, {
        toValue: -240,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );
    const sunLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sunScale, {
          toValue: 1.06,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sunScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    const strideLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rabbitStride, {
          toValue: 2,
          duration: 220,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(rabbitStride, {
          toValue: 0,
          duration: 220,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    cloudLoop.start();
    groundLoop.start();
    sunLoop.start();
    strideLoop.start();

    return () => {
      cloudLoop.stop();
      groundLoop.stop();
      sunLoop.stop();
      strideLoop.stop();
    };
  }, [
    cloudOffset,
    groundOffset,
    rabbitStride,
    sunScale,
  ]);

  useEffect(() => {
    if (phase === 'ready') {
      obstacleMainX.setValue(360);
      obstacleDecoX.setValue(520);
      Animated.parallel([
        Animated.timing(obstacleMainX, {
          toValue: 74,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(obstacleDecoX, {
          toValue: 180,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (phase === 'exhale' || phase === 'resting' || phase === 'preparing' || phase === 'not-started') {
      obstacleMainX.setValue(360);
      obstacleDecoX.setValue(520);
    }
  }, [obstacleDecoX, obstacleMainX, phase]);

  useEffect(() => {
    Animated.timing(rabbitLift, {
      toValue: rabbitIsHolding ? 1 : 0,
      duration: rabbitIsHolding ? 180 : 280,
      easing: rabbitIsHolding ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [rabbitIsHolding, rabbitLift]);

  useEffect(() => {
    if (!inFailedFeedback) return;
    setFailedObstacleFlash(true);
    obstacleMainX.setValue(86);
    const clearFlash = setTimeout(() => setFailedObstacleFlash(false), 260);
    Animated.sequence([
      Animated.timing(stumbleOffset, { toValue: -8, duration: 80, useNativeDriver: true }),
      Animated.timing(stumbleOffset, { toValue: 6, duration: 90, useNativeDriver: true }),
      Animated.timing(stumbleOffset, { toValue: -4, duration: 80, useNativeDriver: true }),
      Animated.timing(stumbleOffset, { toValue: 0, duration: 90, useNativeDriver: true }),
    ]).start();
    return () => clearTimeout(clearFlash);
  }, [inFailedFeedback, obstacleMainX, stumbleOffset]);

  useEffect(() => {
    if (!inValidFeedback) return;
    Animated.sequence([
      Animated.timing(feedbackPulse, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(feedbackPulse, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [feedbackPulse, inValidFeedback]);

  const rabbitTranslateY = rabbitLift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -84],
    extrapolate: 'clamp',
  });
  const rabbitShadowScale = rabbitLift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.72],
    extrapolate: 'clamp',
  });
  const rabbitShadowOpacity = rabbitLift.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.1],
    extrapolate: 'clamp',
  });
  const feedbackScale = feedbackPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <ProgressHud session={session} repetition={repetition} valid={valid} failed={failed} />
      <View style={styles.metricsCard}>
        <View style={styles.metricChip}>
          <Text style={styles.metricLabel}>Tiempo</Text>
          <Text style={styles.metricValue}>{holdSeconds.toFixed(1)} / 3 s</Text>
        </View>
        <View style={styles.metricChip}>
          <Text style={styles.metricLabel}>Volumen</Text>
          <Text style={styles.metricValue}>{Math.round(simulatedVolume)} mL</Text>
        </View>
        <View style={styles.metricChip}>
          <Text style={styles.metricLabel}>Meta nivel</Text>
          <Text style={styles.metricValue}>{targetVolume} mL</Text>
        </View>
      </View>
      <GameStatusBanner primaryText={status.primary} secondaryText={status.secondary} />

      <View style={styles.scene}>
        <Pressable style={styles.stopButton} onPress={onPressStop}>
          <Text style={styles.stopButtonText}>STOP</Text>
        </Pressable>
        <Animated.View style={[styles.sun, { transform: [{ scale: sunScale }] }]} />
        <Animated.View style={[styles.cloudGroup, { transform: [{ translateX: cloudOffset }] }]}>
          <View style={[styles.cloud, { width: 82 }]} />
          <View style={[styles.cloud, { width: 60, top: 10 }]} />
          <View style={[styles.cloud, { width: 74, top: 4 }]} />
        </Animated.View>
        <Animated.View
          style={[styles.cloudGroup, { transform: [{ translateX: Animated.add(cloudOffset, 240) }] }]}>
          <View style={[styles.cloud, { width: 82 }]} />
          <View style={[styles.cloud, { width: 60, top: 10 }]} />
          <View style={[styles.cloud, { width: 74, top: 4 }]} />
        </Animated.View>

        <View style={styles.grassBase} />
        <Animated.View style={[styles.grassPattern, { transform: [{ translateX: groundOffset }] }]} />
        <Animated.View
          style={[styles.grassPattern, { transform: [{ translateX: Animated.add(groundOffset, 240) }] }]}
        />

        <Animated.View
          style={[
            styles.rabbitShadow,
            {
              opacity: rabbitShadowOpacity,
              transform: [{ scaleX: rabbitShadowScale }, { translateX: stumbleOffset }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.rabbitWrap,
            {
              transform: [
                { translateY: rabbitTranslateY },
                { translateX: Animated.add(rabbitStride, stumbleOffset) },
              ],
            },
          ]}>
          <View style={styles.rabbitBodyShade} />
          <View style={styles.rabbitBody} />
          <View style={styles.rabbitBelly} />
          <View style={styles.rabbitHead} />
          <View style={[styles.rabbitEar, styles.rabbitEarLeft]} />
          <View style={[styles.rabbitEar, styles.rabbitEarRight]} />
          <View style={styles.rabbitTail} />
          <View style={styles.rabbitEye} />
          <View style={styles.rabbitEyeRight} />
          <View style={styles.rabbitPaw} />
        </Animated.View>

        {showObstacles || failedObstacleFlash ? (
          <>
            <Animated.View
              style={[styles.obstacle, styles.obstacleMain, { transform: [{ translateX: obstacleMainX }] }]}>
              <View style={styles.obstacleCap} />
              <View style={styles.obstacleStripe} />
            </Animated.View>
            <Animated.View
              style={[
                styles.obstacle,
                styles.obstacleDeco,
                { transform: [{ translateX: obstacleDecoX }], opacity: 0.55 },
              ]}>
              <View style={styles.obstacleCap} />
            </Animated.View>
          </>
        ) : null}

        {inRest ? (
          <View style={styles.restBubble}>
            <Text style={styles.restBubbleText}>Descansa</Text>
          </View>
        ) : null}
        {inFailedFeedback ? (
          <View style={styles.failBubble}>
            <Text style={styles.failBubbleText}>Ouch</Text>
          </View>
        ) : null}
        {inValidFeedback ? (
          <Animated.View style={[styles.validBadge, { transform: [{ scale: feedbackScale }] }]}>
            <Text style={styles.validBadgeText}>Bien hecho</Text>
          </Animated.View>
        ) : null}
      </View>

      <Pressable style={styles.touchZone} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Text style={styles.touchTitle}>Mantener presionado para inspirar</Text>
        <Text style={styles.touchDescription}>
          Mantenga 3 segundos para validar la repeticion. Suelte para exhalar.
        </Text>
      </Pressable>
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
    return { primary: 'Preparate', secondary: `Inicia en ${prepSecondsRemaining}s` };
  }
  if (phase === 'ready') {
    return { primary: '¡Sostén!', secondary: 'Presiona y sosten 3 segundos' };
  }
  if (phase === 'holding') {
    return { primary: '¡Sostén!', secondary: `Faltan ${holdSecondsRemaining}s` };
  }
  if (phase === 'exhale') {
    if (attemptFeedback === 'valid') {
      return { primary: '¡Repetición válida!', secondary: 'Exhala' };
    }
    if (attemptFeedback === 'failed') {
      return { primary: 'Intenta mantener más tiempo', secondary: 'Exhala' };
    }
    return { primary: 'Exhala' };
  }
  if (phase === 'resting') {
    return { primary: 'Descansa 3 segundos', secondary: `Faltan ${restSecondsRemaining}s` };
  }
  if (phase === 'session-complete') {
    return { primary: 'Sesion completada', secondary: 'Preparando siguiente sesion' };
  }
  if (phase === 'interrupted') {
    return { primary: 'Sesion interrumpida', secondary: 'Puedes volver a Niveles' };
  }
  return { primary: 'Nivel completado', secondary: 'Regresa a Niveles para continuar' };
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  scene: {
    width: '100%',
    height: 250,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8EC6A5',
    backgroundColor: '#CDECF9',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  metricsCard: {
    width: '100%',
    backgroundColor: '#F8FFF6',
    borderWidth: 1,
    borderColor: '#A7D8B8',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    padding: 10,
    marginBottom: 12,
  },
  metricChip: {
    flex: 1,
    backgroundColor: '#EAF7EE',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#C8E5D2',
  },
  metricLabel: {
    color: '#4B6B56',
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    marginTop: 2,
    color: '#1F3D2A',
    fontSize: 14,
    fontWeight: '700',
  },
  stopButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: '#E9485A',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  stopButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  cloudGroup: {
    position: 'absolute',
    top: 16,
    left: 0,
    flexDirection: 'row',
    gap: 14,
  },
  cloud: {
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  sun: {
    position: 'absolute',
    right: 16,
    top: 18,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD76A',
    shadowColor: '#FFD76A',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  grassBase: {
    position: 'absolute',
    bottom: 0,
    height: 56,
    width: '100%',
    backgroundColor: '#88C97A',
  },
  grassPattern: {
    position: 'absolute',
    bottom: 34,
    left: 0,
    width: 240,
    height: 10,
    backgroundColor: '#6DB266',
  },
  rabbitWrap: {
    position: 'absolute',
    left: 62,
    bottom: 52,
    width: 74,
    height: 74,
  },
  rabbitBodyShade: {
    position: 'absolute',
    width: 54,
    height: 40,
    borderRadius: 22,
    backgroundColor: '#CBD6D2',
    bottom: 7,
    left: 9,
  },
  rabbitBody: {
    position: 'absolute',
    width: 52,
    height: 38,
    borderRadius: 22,
    backgroundColor: '#F2F1EC',
    bottom: 8,
    left: 10,
    borderWidth: 1.5,
    borderColor: '#6B7570',
  },
  rabbitBelly: {
    position: 'absolute',
    width: 24,
    height: 18,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    bottom: 14,
    left: 28,
  },
  rabbitHead: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F1EC',
    top: 6,
    left: 34,
    borderWidth: 1.5,
    borderColor: '#6B7570',
  },
  rabbitEar: {
    position: 'absolute',
    width: 10,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#F2F1EC',
    top: -8,
    borderWidth: 1.5,
    borderColor: '#6B7570',
  },
  rabbitEarLeft: {
    left: 42,
    transform: [{ rotate: '-8deg' }],
  },
  rabbitEarRight: {
    left: 56,
    transform: [{ rotate: '8deg' }],
  },
  rabbitEye: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#223129',
    top: 18,
    left: 52,
  },
  rabbitEyeRight: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#223129',
    top: 20,
    left: 60,
  },
  rabbitTail: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FDFDFC',
    bottom: 22,
    left: 2,
    borderWidth: 1.5,
    borderColor: '#7C8780',
  },
  rabbitPaw: {
    position: 'absolute',
    width: 14,
    height: 8,
    borderRadius: 5,
    backgroundColor: '#DDE4E1',
    bottom: 2,
    left: 22,
    borderWidth: 1,
    borderColor: '#7C8780',
  },
  rabbitShadow: {
    position: 'absolute',
    left: 72,
    bottom: 44,
    width: 52,
    height: 10,
    borderRadius: 10,
    backgroundColor: '#1A2A2C',
  },
  obstacle: {
    position: 'absolute',
    left: 0,
    bottom: 48,
    width: 34,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#C2824D',
    borderWidth: 1.5,
    borderColor: '#875632',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  obstacleMain: {
    height: 58,
  },
  obstacleDeco: {
    height: 40,
  },
  obstacleCap: {
    marginTop: 4,
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F4C766',
  },
  obstacleStripe: {
    marginTop: 8,
    width: 20,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#9A643B',
  },
  restBubble: {
    position: 'absolute',
    top: 54,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  restBubbleText: {
    color: '#355D4A',
    fontWeight: '700',
    fontSize: 13,
  },
  failBubble: {
    position: 'absolute',
    top: 54,
    left: 16,
    backgroundColor: '#FFE7E7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  failBubbleText: {
    color: '#A14646',
    fontWeight: '800',
    fontSize: 13,
  },
  validBadge: {
    position: 'absolute',
    top: 54,
    right: 16,
    backgroundColor: '#E6F8DC',
    borderColor: '#9DCF7E',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  validBadgeText: {
    color: '#355D2A',
    fontWeight: '800',
    fontSize: 13,
  },
  touchZone: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#EEF8EE',
    borderWidth: 1,
    borderColor: '#A7D8B8',
    padding: 14,
  },
  touchTitle: {
    color: '#21402B',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  touchDescription: {
    marginTop: 8,
    color: '#456651',
    textAlign: 'center',
    fontSize: 14,
  },
});
