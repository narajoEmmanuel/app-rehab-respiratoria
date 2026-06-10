import Feather from '@expo/vector-icons/Feather';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { LevelOnePhase } from '@/src/modules/session/engine/level-one/use-level-one-game';
import { PRE_ATTEMPT_COUNTDOWN_MS } from '@/src/modules/session/engine/level-one/level-one-repetition-rules';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const REP_COUNT = 10;
const VALID_FX_MS = 900;
const PREP_TOTAL_SECONDS = Math.max(1, Math.round(PRE_ATTEMPT_COUNTDOWN_MS / 1000));

/** Paleta emocional para mensajes motivacionales (sin saturación agresiva). */
export const RUNNER_FEEDBACK_COLORS = {
  achievement: '#C9A227',
  motivation: '#E8876A',
  special: '#8B7EC8',
  valid: '#4A9B6E',
  failed: '#C45C5C',
  pending: '#C5CEC8',
} as const;

export type RunnerInstructionTone = 'level' | 'achievement' | 'motivation' | 'special';

type RunnerGameFeedbackBarProps = {
  phase: LevelOnePhase;
  displayVolumeMl: number;
  targetVolume: number;
  volumeHudMessage?: string | null;
  repetition: number;
  valid: number;
  failed: number;
  attemptOutcomes: (boolean | null)[];
  restSecondsRemaining: number;
  restTotalSeconds: number;
  prepSecondsRemaining: number;
  instructionText: string;
  phaseLabel: string;
  instructionTone: RunnerInstructionTone;
  accentColor: string;
  attemptFeedback?: 'idle' | 'valid' | 'failed';
  inhaleSoftHintVisible?: boolean;
  showPauseButton?: boolean;
  onPressPause?: () => void;
};

export function resolveRunnerInstruction(params: {
  phase: LevelOnePhase;
  metaJustReached: boolean;
  inhaleSoftHintVisible: boolean;
  attemptFeedback: 'idle' | 'valid' | 'failed';
  holdSecondsRemaining: number;
  prepSecondsRemaining: number;
}): { phaseLabel: string; instructionText: string; instructionTone: RunnerInstructionTone } {
  const {
    phase,
    metaJustReached,
    inhaleSoftHintVisible,
    attemptFeedback,
    holdSecondsRemaining,
  } = params;

  if (phase === 'preparing') {
    return {
      phaseLabel: 'Prepárate',
      instructionText: 'Respira con calma',
      instructionTone: 'special',
    };
  }
  if (phase === 'ready') {
    return { phaseLabel: 'Inspira', instructionText: 'Inspira hasta alcanzar la meta', instructionTone: 'level' };
  }
  if (phase === 'inhaling') {
    if (inhaleSoftHintVisible) {
      return {
        phaseLabel: 'Inspira',
        instructionText: 'Tómate tu tiempo. Puedes descansar o revisar la conexión del sensor.',
        instructionTone: 'motivation',
      };
    }
    return { phaseLabel: 'Inspira', instructionText: 'Inspira hasta alcanzar la meta', instructionTone: 'level' };
  }
  if (phase === 'evaluating') {
    if (metaJustReached) {
      return { phaseLabel: 'Sostén', instructionText: '¡Meta alcanzada!', instructionTone: 'achievement' };
    }
    const holdHint =
      holdSecondsRemaining > 0
        ? `Sostén 2 segundos · ${holdSecondsRemaining}s`
        : 'Sostén 2 segundos';
    return {
      phaseLabel: 'Sostén',
      instructionText: `${holdHint} · Mantente arriba de la meta`,
      instructionTone: 'level',
    };
  }
  if (phase === 'exhale') {
    if (attemptFeedback === 'valid') {
      return { phaseLabel: 'Exhala', instructionText: 'Excelente repetición', instructionTone: 'achievement' };
    }
    if (attemptFeedback === 'failed') {
      return { phaseLabel: 'Exhala', instructionText: 'Ajusta en la próxima', instructionTone: 'motivation' };
    }
    return { phaseLabel: 'Exhala', instructionText: 'Suelta con calma', instructionTone: 'level' };
  }
  if (phase === 'resting') {
    return { phaseLabel: 'Descansa', instructionText: '', instructionTone: 'level' };
  }
  return { phaseLabel: 'Listo', instructionText: '', instructionTone: 'level' };
}

function instructionColor(tone: RunnerInstructionTone, accentColor: string): string {
  switch (tone) {
    case 'achievement':
      return RUNNER_FEEDBACK_COLORS.achievement;
    case 'motivation':
      return RUNNER_FEEDBACK_COLORS.motivation;
    case 'special':
      return RUNNER_FEEDBACK_COLORS.special;
    default:
      return accentColor;
  }
}

function RepetitionDots({ outcomes }: { outcomes: (boolean | null)[] }) {
  const slots = outcomes.length >= REP_COUNT ? outcomes.slice(0, REP_COUNT) : [
    ...outcomes,
    ...Array(REP_COUNT - outcomes.length).fill(null),
  ] as (boolean | null)[];

  return (
    <View style={styles.repDotsRow}>
      {slots.map((outcome, index) => (
        <View
          key={`rep-dot-${index}`}
          style={[
            styles.repDot,
            outcome === true && styles.repDotValid,
            outcome === false && styles.repDotFailed,
            outcome === null && styles.repDotPending,
          ]}
        />
      ))}
    </View>
  );
}

export function RunnerGameFeedbackBar({
  phase,
  displayVolumeMl,
  targetVolume,
  volumeHudMessage,
  repetition,
  valid,
  failed,
  attemptOutcomes,
  restSecondsRemaining,
  restTotalSeconds,
  prepSecondsRemaining,
  instructionText,
  phaseLabel,
  instructionTone,
  accentColor,
  attemptFeedback = 'idle',
  inhaleSoftHintVisible = false,
  showPauseButton = false,
  onPressPause,
}: RunnerGameFeedbackBarProps) {
  const showVolume = phase !== 'preparing' && phase !== 'ready' && phase !== 'not-started';
  const volumeText = volumeHudMessage
    ? volumeHudMessage
    : showVolume
      ? `${Math.round(displayVolumeMl)} mL`
      : '—';
  const inRest = phase === 'resting';
  const inPrep = phase === 'preparing';
  const prepColor = RUNNER_FEEDBACK_COLORS.special;
  const phaseColor = instructionColor(instructionTone, accentColor);
  const instructionColorValue = instructionColor(instructionTone, accentColor);
  const combinedPreInhaleSeconds = restTotalSeconds + PREP_TOTAL_SECONDS;
  /** Descanso visual: últimos 3 s del total pertenecen a «Prepárate» (p. ej. 8→4 descanso, 3→1 prep). */
  const restDisplaySeconds = inRest ? restSecondsRemaining + PREP_TOTAL_SECONDS : 0;
  const restProgress =
    combinedPreInhaleSeconds > 0
      ? Math.min(1, restDisplaySeconds / combinedPreInhaleSeconds)
      : 0;
  const prepProgress =
    PREP_TOTAL_SECONDS > 0 ? Math.min(1, prepSecondsRemaining / PREP_TOTAL_SECONDS) : 0;
  const volumeProgressRatio =
    targetVolume > 0 && showVolume ? Math.min(1, displayVolumeMl / targetVolume) : 0;

  const prepPulse = useSharedValue(1);

  useEffect(() => {
    if (!inPrep) {
      prepPulse.value = 1;
      return;
    }
    prepPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [inPrep, prepPulse]);

  const prepPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: prepPulse.value }],
  }));

  const validFxOpacity = useSharedValue(0);
  const validFxScale = useSharedValue(0.92);

  useEffect(() => {
    if (attemptFeedback !== 'valid') return;
    validFxOpacity.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: VALID_FX_MS - 120, easing: Easing.in(Easing.quad) }),
    );
    validFxScale.value = withSequence(
      withTiming(1.02, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: VALID_FX_MS - 160, easing: Easing.inOut(Easing.quad) }),
    );
  }, [attemptFeedback, validFxOpacity, validFxScale]);

  const validFxStyle = useAnimatedStyle(() => ({
    opacity: validFxOpacity.value,
    transform: [{ scale: validFxScale.value }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.metricsRow}>
        <View style={styles.volumeHeroCell}>
          <Text style={styles.volumeHeroLabel}>Volumen actual</Text>
          <Text style={[styles.volumeHeroValue, volumeHudMessage ? styles.metricWaiting : null]}>
            {volumeText}
          </Text>
          {showVolume && !volumeHudMessage ? (
            <View style={styles.volumeProgressTrack}>
              <View
                style={[
                  styles.volumeProgressFill,
                  {
                    backgroundColor: accentColor,
                    width: `${Math.round(volumeProgressRatio * 100)}%`,
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.targetHeroCell}>
          <Text style={styles.volumeHeroLabel}>Meta</Text>
          <Text style={[styles.targetHeroValue, { color: accentColor }]}>{targetVolume} mL</Text>
        </View>
      </View>

      <View style={styles.secondaryMetricsRow}>
        <View style={styles.repCell}>
          <Text style={styles.secondaryMetricLabel}>Rep. {repetition}/10</Text>
          <View style={styles.repChipsRow}>
            <View style={styles.validChip}>
              <Feather name="check-circle" size={14} color={RUNNER_FEEDBACK_COLORS.valid} />
              <Text style={styles.validChipText}>{valid}</Text>
            </View>
            <View style={styles.failedChip}>
              <Feather name="x-circle" size={14} color={RUNNER_FEEDBACK_COLORS.failed} />
              <Text style={styles.failedChipText}>{failed}</Text>
            </View>
          </View>
        </View>
        {showPauseButton && onPressPause ? (
          <>
            <View style={styles.metricDivider} />
            <Pressable
              style={styles.pauseBtn}
              onPress={onPressPause}
              accessibilityRole="button"
              accessibilityLabel="Pausar sesión">
              <Feather name="pause" size={15} color={wellness.primaryDark} />
              <Text style={styles.pauseBtnText}>Pausar</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <RepetitionDots outcomes={attemptOutcomes} />

      {inRest ? (
        <View style={[styles.restCapsule, { borderColor: accentColor }]}>
          <Text style={[styles.restLabel, { color: accentColor }]}>Descansa</Text>
          <View style={[styles.countdownBubble, { borderColor: `${accentColor}44` }]}>
            <View
              style={[
                styles.countdownBubbleTrack,
                {
                  borderColor: accentColor,
                  opacity: 0.14 + restProgress * 0.4,
                },
              ]}
            />
            <Text style={[styles.countdownBig, { color: accentColor }]}>{restDisplaySeconds}</Text>
          </View>
        </View>
      ) : inPrep ? (
        <Animated.View style={[styles.prepCapsule, { borderColor: prepColor }, prepPulseStyle]}>
          <Text style={[styles.prepLabel, { color: prepColor }]}>Prepárate</Text>
          <View style={[styles.countdownBubble, { borderColor: `${prepColor}50` }]}>
            <View
              style={[
                styles.countdownBubbleTrack,
                {
                  borderColor: prepColor,
                  opacity: 0.18 + prepProgress * 0.45,
                },
              ]}
            />
            <Text style={[styles.countdownBig, { color: prepColor }]}>{prepSecondsRemaining}</Text>
          </View>
          <Text style={[styles.prepHint, { color: prepColor }]}>Respira con calma</Text>
        </Animated.View>
      ) : (
        <View style={[styles.phaseBlock, { borderColor: accentColor }]}>
          <Animated.View style={[styles.validFxOverlay, validFxStyle]} pointerEvents="none">
            <Text style={styles.validFxStars}>✦ ✧ ✦</Text>
          </Animated.View>
          <Text style={[styles.phaseLabel, { color: phaseColor }]}>{phaseLabel}</Text>
          {instructionText ? (
            <Text
              style={[
                styles.instructionText,
                { color: instructionColorValue },
                inhaleSoftHintVisible && styles.instructionSoftHint,
              ]}>
              {instructionText}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: wellnessRadii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  secondaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: wellnessRadii.card,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  volumeHeroCell: {
    flex: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  targetHeroCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  volumeHeroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  volumeHeroValue: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.text,
    lineHeight: 26,
  },
  targetHeroValue: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  volumeProgressTrack: {
    marginTop: 8,
    width: '100%',
    maxWidth: 140,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  volumeProgressFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 2,
  },
  repCell: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: wellness.border,
    opacity: 0.6,
    marginHorizontal: 4,
  },
  secondaryMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  metricWaiting: {
    fontSize: 13,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  repChipsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 1,
  },
  repDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  repDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  repDotValid: {
    backgroundColor: 'rgba(74, 155, 110, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(74, 155, 110, 0.35)',
  },
  repDotFailed: {
    backgroundColor: 'rgba(196, 92, 92, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(196, 92, 92, 0.32)',
  },
  repDotPending: {
    backgroundColor: 'rgba(197, 206, 200, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 206, 200, 0.95)',
  },
  validChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(74, 155, 110, 0.14)',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 155, 110, 0.28)',
  },
  validChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: RUNNER_FEEDBACK_COLORS.valid,
  },
  failedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(196, 92, 92, 0.1)',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(196, 92, 92, 0.22)',
  },
  failedChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: RUNNER_FEEDBACK_COLORS.failed,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  pauseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  phaseBlock: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: wellnessRadii.card,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    overflow: 'hidden',
  },
  validFxOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 162, 39, 0.14)',
    borderRadius: wellnessRadii.card,
  },
  validFxStars: {
    fontSize: 18,
    fontWeight: '800',
    color: RUNNER_FEEDBACK_COLORS.achievement,
    letterSpacing: 6,
  },
  phaseLabel: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  instructionText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  instructionSoftHint: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  restCapsule: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: wellnessRadii.cardLarge,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 2,
  },
  restLabel: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  countdownBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  countdownBubbleTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48,
    borderWidth: 4,
  },
  countdownBig: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
    letterSpacing: -1,
  },
  prepCapsule: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: wellnessRadii.cardLarge,
    backgroundColor: 'rgba(139, 126, 200, 0.08)',
    borderWidth: 2,
  },
  prepLabel: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  prepHint: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.15,
    opacity: 0.9,
  },
});
