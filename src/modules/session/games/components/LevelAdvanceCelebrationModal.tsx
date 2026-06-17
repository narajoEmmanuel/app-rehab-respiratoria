import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { LevelGameTheme } from '@/src/modules/session/levels/level-gameplay-config';
import { CelebrationSparkleRain } from '@/src/modules/session/games/components/celebration-sparkle-rain';
import { SCENE_THEME_TOKENS } from '@/src/modules/session/games/components/level-runner-scene';
import { RUNNER_FEEDBACK_COLORS } from '@/src/modules/session/games/components/RunnerGameFeedbackBar';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';
import { RespiraBunnyImage } from '@/src/shared/ui/RespiraBunnyImage';

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
  const sceneTheme = SCENE_THEME_TOKENS[theme];
  const bunnyBob = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      bunnyBob.value = 0;
      return;
    }
    bunnyBob.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [bunnyBob, visible]);

  const bunnyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bunnyBob.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={[...sceneTheme.skyGradient]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
        />
        <CelebrationSparkleRain count={16} seed={41} />

        <Animated.View style={[styles.bunnyHero, bunnyStyle]} pointerEvents="none">
          <RespiraBunnyImage pose="wink" size={120} />
        </Animated.View>

        <Animated.View
          entering={ZoomIn.duration(420).delay(180).springify().damping(14)}
          style={styles.popup}>
          <Animated.View entering={FadeInDown.duration(480).delay(260)}>
            <Text style={[styles.title, { color: RUNNER_FEEDBACK_COLORS.achievement }]}>
              ¡Lo lograste!
            </Text>
            <Text style={styles.subtitle}>Pasaste al siguiente nivel</Text>
            <Text style={styles.body}>Sigue construyendo tu avance respiratorio.</Text>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(450).delay(520)} style={styles.actions}>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: accentColor }]}
            onPress={onContinue}
            accessibilityRole="button">
            <Text style={styles.primaryBtnText}>Ver resumen y continuar</Text>
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
  bunnyHero: {
    position: 'absolute',
    bottom: '14%',
    alignItems: 'center',
    opacity: 0.92,
  },
  popup: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#3D5A4A',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.2,
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

/** Alias for overlay naming in docs and future imports. */
export const LevelUpCelebrationOverlay = LevelAdvanceCelebrationModal;
