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

import type { LevelGameTheme } from '@/src/modules/session/levels/level-gameplay-config';
import { SCENE_THEME_TOKENS } from '@/src/modules/session/games/components/level-runner-scene';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const STAR_COUNT = 16;

type StarSpec = { leftPct: number; delay: number; size: number; duration: number };

function buildStars(width: number): StarSpec[] {
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    leftPct: ((i * 37 + 11) % 92) + 4,
    delay: (i * 120) % 900,
    size: 6 + (i % 4) * 2,
    duration: 1800 + (i % 5) * 320,
  }));
}

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
          withTiming(1, { duration: durationMs * 0.15 }),
          withTiming(0.85, { duration: durationMs * 0.55 }),
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
      { translateY: progress.value * screenHeight * 0.55 - 40 },
      { rotate: `${progress.value * 180}deg` },
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

function WinkingRabbit() {
  const wink = useSharedValue(1);

  useEffect(() => {
    wink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200 }),
        withTiming(0.08, { duration: 120 }),
        withTiming(1, { duration: 120 }),
        withTiming(1, { duration: 1400 }),
      ),
      -1,
      false,
    );
  }, [wink]);

  const rightEyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: wink.value }],
  }));

  return (
    <View style={styles.rabbitWrap} pointerEvents="none">
      <View style={styles.rabbitEarsRow}>
        <View style={styles.rabbitEar} />
        <View style={styles.rabbitEar} />
      </View>
      <View style={styles.rabbitTorso}>
        <View style={styles.rabbitEyeLeft} />
        <Animated.View style={[styles.rabbitEyeRight, rightEyeStyle]} />
        <View style={styles.rabbitNose} />
      </View>
    </View>
  );
}

type LevelAdvanceCelebrationModalProps = {
  visible: boolean;
  theme?: LevelGameTheme;
  accentColor?: string;
  onContinue: () => void;
};

export function LevelAdvanceCelebrationModal({
  visible,
  theme = 'forest',
  accentColor = wellness.primary,
  onContinue,
}: LevelAdvanceCelebrationModalProps) {
  const { width, height } = useWindowDimensions();
  const sceneTheme = SCENE_THEME_TOKENS[theme];
  const stars = buildStars(width);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={[...sceneTheme.skyGradient]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
        />
        <View style={styles.starField} pointerEvents="none">
          {stars.map((star, index) => (
            <FallingStar
              key={`star-${index}`}
              left={(width * star.leftPct) / 100}
              size={star.size}
              delayMs={star.delay}
              durationMs={star.duration}
              screenHeight={height}
            />
          ))}
        </View>

        <WinkingRabbit />

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.popup}>
          <Text style={[styles.title, { color: accentColor }]}>Lo lograste</Text>
          <Text style={styles.subtitle}>Pasaste al siguiente nivel</Text>
          <Text style={styles.body}>Sigue construyendo tu avance respiratorio.</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(450).delay(500)} style={styles.actions}>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: accentColor }]}
            onPress={onContinue}
            accessibilityRole="button">
            <Text style={styles.primaryBtnText}>Ver resumen</Text>
          </Pressable>
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
    paddingHorizontal: 24,
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    top: -20,
    backgroundColor: '#FFE566',
    shadowColor: '#FFD700',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  rabbitWrap: {
    position: 'absolute',
    bottom: '18%',
    alignItems: 'center',
    opacity: 0.35,
    transform: [{ scale: 2.2 }],
  },
  rabbitEarsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: -4,
  },
  rabbitEar: {
    width: 14,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#FAFAF7',
    borderWidth: 1.5,
    borderColor: '#7A8A82',
  },
  rabbitTorso: {
    width: 44,
    height: 40,
    borderRadius: 18,
    backgroundColor: '#FAFAF7',
    borderWidth: 1.5,
    borderColor: '#7A8A82',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rabbitEyeLeft: {
    position: 'absolute',
    top: 12,
    left: 10,
    width: 5,
    height: 7,
    borderRadius: 3,
    backgroundColor: '#3D5A4A',
  },
  rabbitEyeRight: {
    position: 'absolute',
    top: 12,
    right: 10,
    width: 5,
    height: 7,
    borderRadius: 3,
    backgroundColor: '#3D5A4A',
  },
  rabbitNose: {
    position: 'absolute',
    bottom: 10,
    width: 6,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#E8B8C8',
  },
  popup: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#3D5A4A',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: wellness.text,
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
  },
  primaryBtn: {
    borderRadius: wellnessRadii.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
