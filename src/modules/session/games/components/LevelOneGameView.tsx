import { useEffect, useRef } from 'react';
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
  const monkeyIsJumping = phase === 'holding';
  const obstacleA = useRef(new Animated.Value(360)).current;
  const obstacleB = useRef(new Animated.Value(620)).current;
  const obstacleC = useRef(new Animated.Value(780)).current;
  const obstacleD = useRef(new Animated.Value(980)).current;
  const cloudOffset = useRef(new Animated.Value(0)).current;
  const groundOffset = useRef(new Animated.Value(0)).current;
  const sunScale = useRef(new Animated.Value(1)).current;
  const monkeyBounce = useRef(new Animated.Value(0)).current;
  const monkeyStride = useRef(new Animated.Value(0)).current;

  const showObstacles = phase === 'ready' || phase === 'holding';

  const status = getStatusText({
    phase,
    holdSecondsRemaining,
    prepSecondsRemaining,
    restSecondsRemaining,
    attemptFeedback,
  });

  useEffect(() => {
    const obstacleLoopA = Animated.loop(
      Animated.timing(obstacleA, {
        toValue: -80,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );
    const obstacleLoopB = Animated.loop(
      Animated.timing(obstacleB, {
        toValue: -80,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );
    const obstacleLoopC = Animated.loop(
      Animated.timing(obstacleC, {
        toValue: -80,
        duration: 2700,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );
    const obstacleLoopD = Animated.loop(
      Animated.timing(obstacleD, {
        toValue: -80,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    );
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
    const runLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(monkeyBounce, {
          toValue: -6,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(monkeyBounce, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ])
    );

    const strideLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(monkeyStride, {
          toValue: 2,
          duration: 220,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(monkeyStride, {
          toValue: 0,
          duration: 220,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    obstacleLoopA.start();
    obstacleLoopB.start();
    obstacleLoopC.start();
    obstacleLoopD.start();
    cloudLoop.start();
    groundLoop.start();
    sunLoop.start();
    runLoop.start();
    strideLoop.start();

    return () => {
      obstacleLoopA.stop();
      obstacleLoopB.stop();
      obstacleLoopC.stop();
      obstacleLoopD.stop();
      cloudLoop.stop();
      groundLoop.stop();
      sunLoop.stop();
      runLoop.stop();
      strideLoop.stop();
    };
  }, [
    cloudOffset,
    groundOffset,
    monkeyBounce,
    monkeyStride,
    obstacleA,
    obstacleB,
    obstacleC,
    obstacleD,
    sunScale,
  ]);

  useEffect(() => {
    obstacleA.setValue(360);
  }, [obstacleA]);

  useEffect(() => {
    obstacleB.setValue(620);
  }, [obstacleB]);

  useEffect(() => {
    if (showObstacles) {
      // Cuando el juego dice "Inspira", reseteamos obstáculos para que se vean claros.
      obstacleA.setValue(360);
      obstacleB.setValue(560);
      obstacleC.setValue(740);
      obstacleD.setValue(940);
    }
  }, [obstacleA, obstacleB, obstacleC, obstacleD, showObstacles]);

  return (
    <View style={styles.container}>
      <ProgressHud session={session} repetition={repetition} valid={valid} failed={failed} />
      <View style={styles.metricsCard}>
        <Text style={styles.metricText}>Tiempo sostenido: {holdSeconds.toFixed(1)} / 3 s</Text>
        <Text style={styles.metricText}>Volumen simulado: {Math.round(simulatedVolume)} mL</Text>
        <Text style={styles.metricText}>Meta del nivel: {targetVolume} mL</Text>
      </View>
      <GameStatusBanner primaryText={status.primary} secondaryText={status.secondary} />

      <View style={styles.scene}>
        <Pressable style={styles.stopButton} onPress={onPressStop}>
          <Text style={styles.stopButtonText}>STOP</Text>
        </Pressable>
        <Animated.Text style={[styles.cloudsLayer, { transform: [{ translateX: cloudOffset }] }]}>
          ☁️ ☁️ ☁️ ☁️
        </Animated.Text>
        <Animated.Text
          style={[
            styles.cloudsLayer,
            { transform: [{ translateX: Animated.add(cloudOffset, 220) }] },
          ]}>
          ☁️ ☁️ ☁️ ☁️
        </Animated.Text>
        <Animated.Text style={[styles.sun, { transform: [{ scale: sunScale }] }]}>☀️</Animated.Text>

        <Animated.Text
          style={[styles.groundText, { transform: [{ translateX: groundOffset }] }]}>
          🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿
        </Animated.Text>
        <Animated.Text
          style={[
            styles.groundText,
            { transform: [{ translateX: Animated.add(groundOffset, 240) }] },
          ]}>
          🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿
        </Animated.Text>

        <Animated.Text
          style={[
            styles.monkey,
            monkeyIsJumping ? styles.monkeyJumping : null,
            { transform: [{ translateY: monkeyBounce }, { translateX: monkeyStride }] },
          ]}>
          🧍
        </Animated.Text>

        {showObstacles ? (
          <>
            <Animated.Text style={[styles.obstacle, { bottom: 32, transform: [{ translateX: obstacleA }] }]}>
              🪵
            </Animated.Text>
            <Animated.Text style={[styles.obstacle, { bottom: 36, transform: [{ translateX: obstacleB }] }]}>
              🪨
            </Animated.Text>
            <Animated.Text style={[styles.obstacle, { bottom: 30, transform: [{ translateX: obstacleC }] }]}>
              🌳
            </Animated.Text>
            <Animated.Text style={[styles.obstacle, { bottom: 38, transform: [{ translateX: obstacleD }] }]}>
              🌿
            </Animated.Text>
          </>
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
    height: 230,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#87d35a',
    backgroundColor: '#77c9ff',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  metricsCard: {
    width: '100%',
    backgroundColor: '#214b2f',
    borderWidth: 1,
    borderColor: '#8be09a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  metricText: {
    color: '#e8ffeb',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  stopButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: '#d90429',
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
  cloudsLayer: {
    position: 'absolute',
    top: 12,
    left: 0,
    fontSize: 24,
  },
  sun: {
    position: 'absolute',
    right: 16,
    top: 18,
    fontSize: 26,
  },
  groundText: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    fontSize: 24,
  },
  monkey: {
    position: 'absolute',
    left: 54,
    bottom: 28,
    fontSize: 58,
  },
  monkeyJumping: {
    bottom: 105,
  },
  obstacle: {
    position: 'absolute',
    left: 0,
    fontSize: 34,
  },
  touchZone: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#1f4a11',
    borderWidth: 1,
    borderColor: '#a8f178',
    padding: 14,
  },
  touchTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  touchDescription: {
    marginTop: 8,
    color: '#d6ffc4',
    textAlign: 'center',
    fontSize: 14,
  },
});
