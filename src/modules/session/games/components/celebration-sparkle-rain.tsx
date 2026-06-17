import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export type SparkleSpec = {
  leftPct: number;
  delay: number;
  size: number;
  duration: number;
};

export function buildSparkleSpecs(count: number, widthSeed = 37): SparkleSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    leftPct: ((i * widthSeed + 11) % 92) + 4,
    delay: (i * 120) % 900,
    size: 6 + (i % 4) * 2,
    duration: 1800 + (i % 5) * 320,
  }));
}

function SparkleParticle({
  left,
  size,
  delayMs,
  durationMs,
  screenHeight,
  color = '#FFE566',
}: {
  left: number;
  size: number;
  delayMs: number;
  durationMs: number;
  screenHeight: number;
  color?: string;
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
        styles.sparkle,
        { left, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
      pointerEvents="none"
    />
  );
}

type CelebrationSparkleRainProps = {
  count?: number;
  seed?: number;
  colors?: string[];
};

export function CelebrationSparkleRain({
  count = 16,
  seed = 37,
  colors = ['#FFE566', '#FFD700', '#FFF8DC'],
}: CelebrationSparkleRainProps) {
  const { width, height } = useWindowDimensions();
  const specs = buildSparkleSpecs(count, seed);

  return (
    <View style={styles.field} pointerEvents="none">
      {specs.map((sparkle, index) => (
        <SparkleParticle
          key={`sparkle-${index}`}
          left={(width * sparkle.leftPct) / 100}
          size={sparkle.size}
          delayMs={sparkle.delay}
          durationMs={sparkle.duration}
          screenHeight={height}
          color={colors[index % colors.length]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  sparkle: {
    position: 'absolute',
    top: -20,
    shadowColor: '#FFD700',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
});
