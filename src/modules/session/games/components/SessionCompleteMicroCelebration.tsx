import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RUNNER_FEEDBACK_COLORS } from '@/src/modules/session/games/components/RunnerGameFeedbackBar';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const SPARKLE_OFFSETS = [
  { top: -18, left: -22 },
  { top: -14, right: -20 },
  { bottom: -16, left: -18 },
  { bottom: -12, right: -24 },
] as const;

type SessionCompleteMicroCelebrationProps = {
  visible: boolean;
};

export function SessionCompleteMicroCelebration({ visible }: SessionCompleteMicroCelebrationProps) {
  const checkScale = useSharedValue(0.6);
  const checkOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      checkScale.value = 0.6;
      checkOpacity.value = 0;
      glowOpacity.value = 0;
      return;
    }
    checkOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) });
    checkScale.value = withSequence(
      withTiming(1.12, { duration: 420, easing: Easing.out(Easing.back(1.4)) }),
      withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }),
    );
    glowOpacity.value = withDelay(
      120,
      withSequence(
        withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) }),
        withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
    );
  }, [visible, checkOpacity, checkScale, glowOpacity]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop} pointerEvents="none">
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(200)} style={styles.cardWrap}>
          <LinearGradient
            colors={['rgba(255,252,245,0.98)', 'rgba(232,245,236,0.96)']}
            style={styles.card}>
            <Animated.View style={[styles.glowRing, glowStyle]} />
            <Animated.View style={[styles.checkCircle, checkStyle]}>
              <LinearGradient
                colors={[RUNNER_FEEDBACK_COLORS.achievement, '#E8C547']}
                style={styles.checkGradient}>
                <Text style={styles.checkMark}>✓</Text>
              </LinearGradient>
              {SPARKLE_OFFSETS.map((pos, index) => (
                <Text
                  key={`sparkle-${index}`}
                  style={[styles.sparkle, pos]}
                  accessibilityElementsHidden>
                  ✦
                </Text>
              ))}
            </Animated.View>
            <Text style={styles.title}>Sesión completada</Text>
            <Text style={styles.subtitle}>Buen control durante la sesión</Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(46, 74, 62, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 320,
  },
  card: {
    alignItems: 'center',
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.35)',
    overflow: 'hidden',
  },
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(201, 162, 39, 0.22)',
    top: 28,
  },
  checkCircle: {
    width: 88,
    height: 88,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  checkMark: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -2,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 14,
    color: RUNNER_FEEDBACK_COLORS.achievement,
    fontWeight: '800',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: wellness.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});
