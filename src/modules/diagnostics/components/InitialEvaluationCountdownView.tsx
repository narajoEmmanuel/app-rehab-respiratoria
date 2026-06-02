import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors } from '@/src/shared/theme/wellness-theme';

type InitialEvaluationCountdownViewProps = {
  count: number;
};

const COUNTDOWN_TOTAL = 3;

function CountdownProgressDots({ count }: { count: number }) {
  const filledDots = COUNTDOWN_TOTAL - count + 1;

  return (
    <View style={styles.dotsRow} accessibilityLabel={`Paso ${filledDots} de ${COUNTDOWN_TOTAL}`}>
      {Array.from({ length: COUNTDOWN_TOTAL }, (_, index) => {
        const active = index < filledDots;
        return (
          <View
            key={index}
            style={[styles.dot, active ? styles.dotActive : styles.dotInactive]}
          />
        );
      })}
    </View>
  );
}

function CountdownDigitWithHalo({
  count,
  digitSize,
  lineHeight,
}: {
  count: number;
  digitSize: number;
  lineHeight: number;
}) {
  const haloScale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.28);

  useEffect(() => {
    haloScale.value = 1;
    haloOpacity.value = 0.28;
    haloScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 850, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    haloOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 850, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.22, { duration: 850, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [count, haloOpacity, haloScale]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
    opacity: haloOpacity.value,
  }));

  const ringSize = digitSize + 72;

  return (
    <View style={[styles.digitStage, { width: ringSize, height: ringSize }]}>
      <Animated.View
        style={[
          styles.haloRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
          },
          haloStyle,
        ]}
      />
      <Animated.Text
        key={count}
        entering={ZoomIn.duration(260).springify().damping(16)}
        exiting={FadeOut.duration(160)}
        style={[styles.digit, { fontSize: digitSize, lineHeight }]}
        accessibilityRole="text"
        accessibilityLabel={`${count}`}>
        {count}
      </Animated.Text>
    </View>
  );
}

export function InitialEvaluationCountdownView({ count }: InitialEvaluationCountdownViewProps) {
  const { width } = useWindowDimensions();
  const digitSize = Math.round(Math.min(132, Math.max(104, width * 0.28)));
  const lineHeight = Math.round(digitSize * 1.05);

  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Comienza en</Text>

      <CountdownDigitWithHalo count={count} digitSize={digitSize} lineHeight={lineHeight} />

      <CountdownProgressDots count={count} />

      <Text style={styles.hint}>Prepárate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: wellnessColors.primarySubtle,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: wellness.textSecondary,
    marginBottom: spacing.lg,
    letterSpacing: 0.2,
  },
  digitStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(52, 171, 165, 0.45)',
    backgroundColor: 'rgba(52, 171, 165, 0.06)',
  },
  digit: {
    fontWeight: '900',
    color: wellness.primaryDark,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: wellness.primary,
  },
  dotInactive: {
    backgroundColor: 'rgba(52, 171, 165, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.28)',
  },
  hint: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    color: wellness.primary,
  },
});
