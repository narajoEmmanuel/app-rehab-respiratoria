import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const STAR_COUNT = 24;

function FallingStar({
  left,
  size,
  delayMs,
  durationMs,
  screenHeight,
}: {
  left: number;
  size: number;
  delayMs: number;
  durationMs: number;
  screenHeight: number;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(1, { duration: durationMs, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: durationMs * 0.12 }),
          withTiming(0.9, { duration: durationMs * 0.58 }),
          withTiming(0, { duration: durationMs * 0.3 }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, durationMs, opacity, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: progress.value * screenHeight * 0.6 - 30 },
      { rotate: `${progress.value * 220}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        { left, width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

type AllLevelsCompleteCelebrationModalProps = {
  visible: boolean;
  onGoHome: () => void;
  onRedoDiagnostic: () => void;
  onViewSummary?: () => void;
};

export function AllLevelsCompleteCelebrationModal({
  visible,
  onGoHome,
  onRedoDiagnostic,
  onViewSummary,
}: AllLevelsCompleteCelebrationModalProps) {
  const { width, height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['#055E59', '#078B83', '#34aba5']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
        />
        <View style={styles.starField} pointerEvents="none">
          {Array.from({ length: STAR_COUNT }, (_, i) => (
            <FallingStar
              key={`journey-star-${i}`}
              left={(width * (((i * 41 + 7) % 90) + 5)) / 100}
              size={6 + (i % 5) * 2}
              delayMs={(i * 90) % 800}
              durationMs={1600 + (i % 4) * 400}
              screenHeight={height}
            />
          ))}
        </View>

        <Animated.View entering={FadeInDown.duration(550).delay(150)} style={styles.popup}>
          <Text style={styles.emoji}>🏆</Text>
          <Text style={styles.title}>¡Recorrido completo!</Text>
          <Text style={styles.subtitle}>
            Completaste los 5 niveles con dedicación y constancia.
          </Text>
          <Text style={styles.body}>
            Felicitaciones por tu esfuerzo en este camino respiratorio. Cada sesión sumó a tu
            progreso.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(480).delay(450)} style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={onGoHome} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>Volver al inicio</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={onRedoDiagnostic}
            accessibilityRole="button">
            <Text style={styles.secondaryBtnText}>Realizar nuevamente la evaluación diagnóstica</Text>
          </Pressable>
          {onViewSummary ? (
            <Pressable style={styles.ghostBtn} onPress={onViewSummary} accessibilityRole="button">
              <Text style={styles.ghostBtnText}>Ver resumen de sesión</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    top: -16,
    backgroundColor: '#FFE566',
  },
  popup: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: 30,
    paddingHorizontal: 22,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  emoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: wellness.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: wellness.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  body: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    position: 'absolute',
    bottom: 40,
    left: 22,
    right: 22,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: wellnessRadii.pill,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  secondaryBtnText: {
    color: wellness.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  ghostBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostBtnText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
