import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { RESPIRA_3000_CLAMP_MAX_ML } from '@/src/modules/device/calibration/predefined-calibration-models';
import { AppText } from '@/src/shared/ui/AppText';

export type LiveVolumeCardProps = {
  volumeMl?: number | null;
  maxVolumeMl?: number;
  isLive?: boolean;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 200;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const BAR_HEIGHT = 230;
const BAR_TRACK_WIDTH = 19;
const BAR_FILL_WIDTH = 11;
const BAR_LABELS = [3000, 2250, 1500, 750, 0] as const;

const TEAL = '#12A39A';
const TEAL_TRACK = '#DFF3F0';
const TEAL_WAVE = 'rgba(18, 163, 154, 0.12)';

function formatVolumeMl(volumeMl: number): string {
  return Math.round(volumeMl).toLocaleString('en-US');
}

function WaveDecoration({ animated }: { animated: boolean }) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      translateX.value = withRepeat(
        withSequence(
          withTiming(-18, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
          withTiming(18, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      translateX.value = withTiming(0, { duration: 300 });
    }
  }, [animated, translateX]);

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.waveWrap, waveStyle]} pointerEvents="none">
      <Svg width="140%" height={90} viewBox="0 0 400 90" preserveAspectRatio="none">
        <Path
          d="M0 52 C 50 28, 100 72, 150 48 S 250 20, 300 50 S 380 68, 400 44 L 400 90 L 0 90 Z"
          fill={TEAL_WAVE}
        />
        <Path
          d="M0 68 C 60 48, 120 82, 180 58 S 280 38, 340 62 S 390 74, 400 60 L 400 90 L 0 90 Z"
          fill="rgba(18, 163, 154, 0.07)"
        />
      </Svg>
    </Animated.View>
  );
}

function VolumeRing({
  progress,
  isLive,
  displayValue,
}: {
  progress: number;
  isLive: boolean;
  displayValue: string;
}) {
  const animatedProgress = useSharedValue(progress);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedProgress, progress]);

  useEffect(() => {
    if (isLive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.035, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.88, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isLive, pulseOpacity, pulseScale]);

  const ringContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  const center = RING_SIZE / 2;

  return (
    <Animated.View style={[styles.ringContainer, ringContainerStyle]}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={RING_RADIUS}
            stroke={TEAL_TRACK}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={RING_RADIUS}
            stroke={TEAL}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            animatedProps={progressProps}
          />
        </G>
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <AppText variant="metricLarge" style={[styles.volumeValue, !isLive && styles.volumeValueMuted]}>
          {displayValue}
        </AppText>
        <AppText variant="metricSmall" style={styles.volumeUnit}>
          mL
        </AppText>
      </View>
    </Animated.View>
  );
}

function VerticalScaleBar({ progress, isLive }: { progress: number; isLive: boolean }) {
  const animatedProgress = useSharedValue(progress);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedProgress, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    height: Math.max(0, Math.min(1, animatedProgress.value)) * BAR_HEIGHT,
  }));

  const dotStyle = useAnimatedStyle(() => {
    const ratio = Math.max(0, Math.min(1, animatedProgress.value));
    return {
      bottom: ratio * BAR_HEIGHT - 12,
      opacity: isLive && ratio > 0 ? 1 : 0,
    };
  });

  return (
    <View style={styles.barRow}>
      <View style={styles.barTrackOuter}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, fillStyle, !isLive && styles.barFillIdle]} />
        </View>
        <Animated.View style={[styles.barDot, dotStyle]} />
      </View>
      <View style={styles.barLabels}>
        {BAR_LABELS.map((label) => (
          <AppText key={label} variant="bodySmall" style={styles.barLabel}>
            {label.toLocaleString('en-US')}
          </AppText>
        ))}
      </View>
    </View>
  );
}

export function LiveVolumeCard({
  volumeMl = null,
  maxVolumeMl = RESPIRA_3000_CLAMP_MAX_ML,
  isLive = false,
}: LiveVolumeCardProps) {
  const hasReading = volumeMl !== null && volumeMl !== undefined && Number.isFinite(volumeMl);
  const safeVolume = Math.max(0, Math.min(hasReading ? volumeMl : 0, maxVolumeMl));
  const progress = hasReading && isLive ? safeVolume / maxVolumeMl : 0;
  const displayValue = hasReading && isLive ? formatVolumeMl(safeVolume) : '—';
  const statusLive = isLive && hasReading;

  return (
    <View style={styles.card}>
      <WaveDecoration animated={statusLive} />

      <AppText variant="titleMedium" style={styles.title}>
        Volumen estimado
      </AppText>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, statusLive ? styles.statusDotLive : styles.statusDotIdle]} />
        <AppText variant="statusValue" style={styles.statusText}>
          {statusLive ? 'En vivo' : 'Sin lectura'}
        </AppText>
      </View>

      <View style={styles.visualRow}>
        <VolumeRing progress={progress} isLive={statusLive} displayValue={displayValue} />
        <VerticalScaleBar progress={progress} isLive={statusLive} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 24,
    minHeight: 410,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5F0EE',
    shadowColor: '#0B3F3A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  waveWrap: {
    position: 'absolute',
    bottom: 0,
    left: '-20%',
    right: 0,
    height: 90,
    zIndex: 0,
  },
  title: {
    color: '#101828',
    textAlign: 'center',
    zIndex: 1,
  },
  statusRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotLive: {
    backgroundColor: TEAL,
  },
  statusDotIdle: {
    backgroundColor: '#A8B0B8',
  },
  statusText: {
    color: '#667085',
    fontWeight: '500',
  },
  visualRow: {
    marginTop: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    zIndex: 1,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TEAL,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeValue: {
    fontSize: 48,
    color: '#101828',
    lineHeight: 52,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  volumeValueMuted: {
    color: '#A8B0B8',
  },
  volumeUnit: {
    color: '#667085',
    marginTop: -2,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: BAR_HEIGHT,
    gap: 10,
  },
  barTrackOuter: {
    width: BAR_TRACK_WIDTH,
    height: BAR_HEIGHT,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  barTrack: {
    width: BAR_TRACK_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_TRACK_WIDTH,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDEDEA',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: BAR_FILL_WIDTH,
    alignSelf: 'center',
    backgroundColor: TEAL,
    borderRadius: BAR_FILL_WIDTH,
    minHeight: 0,
  },
  barFillIdle: {
    opacity: 0,
  },
  barDot: {
    position: 'absolute',
    alignSelf: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: TEAL,
    marginBottom: -12,
    shadowColor: TEAL,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  barLabels: {
    height: BAR_HEIGHT,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  barLabel: {
    color: '#7A8594',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
