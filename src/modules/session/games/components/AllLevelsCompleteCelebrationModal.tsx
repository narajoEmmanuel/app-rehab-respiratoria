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

import { CelebrationSparkleRain } from '@/src/modules/session/games/components/celebration-sparkle-rain';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';
import { RespiraBunnyImage } from '@/src/shared/ui/RespiraBunnyImage';

type AllLevelsCompleteCelebrationModalProps = {
  visible: boolean;
  onRedoDiagnostic: () => void;
  onBackToTherapy: () => void;
};

export function AllLevelsCompleteCelebrationModal({
  visible,
  onRedoDiagnostic,
  onBackToTherapy,
}: AllLevelsCompleteCelebrationModalProps) {
  const bunnyScale = useSharedValue(1);

  useEffect(() => {
    if (!visible) {
      bunnyScale.value = 1;
      return;
    }
    bunnyScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [bunnyScale, visible]);

  const bunnyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bunnyScale.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['#055E59', '#078B83', '#34aba5']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
        />
        <CelebrationSparkleRain count={20} seed={43} colors={['#FFE566', '#FFF4B8', '#FFD700', '#FFFFFF']} />

        <Animated.View
          entering={ZoomIn.duration(500).delay(120).springify().damping(12)}
          style={styles.popup}>
          <Animated.View entering={FadeInDown.duration(520).delay(200)} style={styles.heroBlock}>
            <Animated.View style={bunnyStyle}>
              <RespiraBunnyImage pose="celebrate" size={96} />
            </Animated.View>
            <Text style={styles.title}>¡Increíble!</Text>
            <Text style={styles.subtitle}>Completaste todos los niveles</Text>
            <Text style={styles.body}>Respira Bunny está orgulloso de ti.</Text>
            <Text style={styles.detail}>
              Felicitaciones por tu constancia en este camino respiratorio.
            </Text>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(480).delay(480)} style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={onRedoDiagnostic} accessibilityRole="button">
            <Text style={styles.primaryBtnText}>Realizar nueva evaluación inicial</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={onBackToTherapy} accessibilityRole="button">
            <Text style={styles.secondaryBtnText}>Volver a Terapia</Text>
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
    paddingHorizontal: 22,
  },
  popup: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    shadowColor: '#055E59',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  heroBlock: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    marginTop: 6,
    fontSize: 28,
    fontWeight: '900',
    color: wellness.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    color: wellness.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  body: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: wellness.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  detail: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  actions: {
    position: 'absolute',
    bottom: 36,
    left: 22,
    right: 22,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: 15,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 20,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: wellnessRadii.pill,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  secondaryBtnText: {
    color: wellness.primaryDark,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});

/** Alias for overlay naming in docs and future imports. */
export const AllLevelsCelebrationOverlay = AllLevelsCompleteCelebrationModal;
