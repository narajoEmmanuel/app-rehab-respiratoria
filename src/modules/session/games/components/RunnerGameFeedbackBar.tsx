import Feather from '@expo/vector-icons/Feather';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { LevelOnePhase } from '@/src/modules/session/engine/level-one/use-level-one-game';
import { PRE_ATTEMPT_COUNTDOWN_MS, LEVEL_ONE_OFFICIAL_EVAL_MS } from '@/src/modules/session/engine/level-one/level-one-repetition-rules';
import { StableInstructionPanel } from '@/src/modules/session/games/components/StableInstructionPanel';
import { RUNNER_FEEDBACK_COLORS } from '@/src/modules/session/games/components/runner-feedback-colors';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export { RUNNER_FEEDBACK_COLORS } from '@/src/modules/session/games/components/runner-feedback-colors';

const REP_COUNT = 10;
const VALID_FX_MS = 900;
const PREP_TOTAL_SECONDS = Math.max(1, Math.round(PRE_ATTEMPT_COUNTDOWN_MS / 1000));
const HOLD_TOTAL_SECONDS = Math.max(1, Math.round(LEVEL_ONE_OFFICIAL_EVAL_MS / 1000));

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
  metaJustReached?: boolean;
  holdSecondsRemaining?: number;
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

/** Panel shows only the primary phase label — no secondary hint lines. */
export function resolveVisibleInstructionHint(
  _phaseLabel: string,
  _instructionText: string,
  _options: {
    inhaleSoftHintVisible: boolean;
    metaJustReached: boolean;
    holdSecondsRemaining: number;
    attemptFeedback: 'idle' | 'valid' | 'failed';
  },
): string {
  return '';
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

const COUNT_CHIP_ICON_SIZE = 14;
const COUNT_CHIP_HEIGHT = 32;
const COUNT_CHIP_MIN_WIDTH = 56;

function CountChip({
  iconName,
  value,
  tone,
}: {
  iconName: 'check-circle' | 'x-circle';
  value: number;
  tone: 'valid' | 'failed';
}) {
  const isValid = tone === 'valid';
  return (
    <View style={[styles.countChip, isValid ? styles.validChip : styles.failedChip]}>
      <Feather
        name={iconName}
        size={COUNT_CHIP_ICON_SIZE}
        color={isValid ? RUNNER_FEEDBACK_COLORS.valid : RUNNER_FEEDBACK_COLORS.failed}
      />
      <Text style={[styles.countChipText, isValid ? styles.validChipText : styles.failedChipText]}>
        {value}
      </Text>
    </View>
  );
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
  metaJustReached = false,
  holdSecondsRemaining = 0,
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
  const inHold = phase === 'evaluating';
  const prepColor = RUNNER_FEEDBACK_COLORS.special;
  const phaseColor = instructionColor(instructionTone, accentColor);
  const combinedPreInhaleSeconds = restTotalSeconds + PREP_TOTAL_SECONDS;
  /** Descanso visual: últimos 3 s del total pertenecen a «Prepárate» (p. ej. 8→4 descanso, 3→1 prep). */
  const restDisplaySeconds = inRest ? restSecondsRemaining + PREP_TOTAL_SECONDS : 0;
  const restProgress =
    combinedPreInhaleSeconds > 0
      ? Math.min(1, restDisplaySeconds / combinedPreInhaleSeconds)
      : 0;
  const prepProgress =
    PREP_TOTAL_SECONDS > 0 ? Math.min(1, prepSecondsRemaining / PREP_TOTAL_SECONDS) : 0;
  const holdProgress =
    HOLD_TOTAL_SECONDS > 0 ? Math.min(1, holdSecondsRemaining / HOLD_TOTAL_SECONDS) : 0;
  const holdDisplaySeconds = inHold ? Math.max(0, holdSecondsRemaining) : 0;
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
      <View style={styles.repMetricsRow}>
        <View style={styles.repTopGroup}>
          <Text style={styles.repTopLabel}>Rep. {repetition}/10</Text>
          <View style={styles.repChipsRow}>
            <CountChip iconName="check-circle" value={valid} tone="valid" />
            <CountChip iconName="x-circle" value={failed} tone="failed" />
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

      <View style={styles.volumeMetricsRow}>
        <View style={styles.volumeHeroCell}>
          <Text style={styles.volumeHeroLabel}>Volumen actual</Text>
          <View style={styles.volumeValueSlot}>
            <Text
              style={[styles.volumeHeroValue, volumeHudMessage ? styles.metricWaiting : null]}
              numberOfLines={volumeHudMessage ? 2 : 1}>
              {volumeText}
            </Text>
          </View>
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
          ) : (
            <View style={styles.volumeProgressPlaceholder} />
          )}
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.targetHeroCell}>
          <Text style={styles.volumeHeroLabel}>Meta</Text>
          <View style={styles.volumeValueSlot}>
            <Text style={[styles.targetHeroValue, { color: accentColor }]}>{targetVolume} mL</Text>
          </View>
          <View style={styles.volumeProgressPlaceholder} />
        </View>
      </View>

      <RepetitionDots outcomes={attemptOutcomes} />

      {inRest ? (
        <StableInstructionPanel
          mode="rest"
          accentColor={accentColor}
          topLabel="Descansa"
          centerText={String(restDisplaySeconds)}
          progressRatio={restProgress}
          progressColor={accentColor}
        />
      ) : inPrep ? (
        <StableInstructionPanel
          mode="prep"
          accentColor={accentColor}
          topLabel="Prepárate"
          centerText={String(prepSecondsRemaining)}
          progressRatio={prepProgress}
          progressColor={prepColor}
          pulseStyle={prepPulseStyle}
        />
      ) : inHold ? (
        <StableInstructionPanel
          mode="hold"
          accentColor={accentColor}
          phaseColor={phaseColor}
          topLabel={phaseLabel}
          centerText={String(holdDisplaySeconds)}
          progressRatio={holdProgress}
          progressColor={phaseColor}
          validFxStyle={metaJustReached ? validFxStyle : undefined}
        />
      ) : (
        <StableInstructionPanel
          mode="phase"
          accentColor={accentColor}
          phaseColor={phaseColor}
          centerText={phaseLabel}
          validFxStyle={validFxStyle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 6,
    marginBottom: 2,
  },
  repMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: wellnessRadii.card,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: wellness.border,
    minHeight: 52,
  },
  repTopGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  repTopLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
    minWidth: 68,
    textAlign: 'center',
  },
  volumeMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: wellnessRadii.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
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
  volumeValueSlot: {
    minHeight: 28,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeHeroValue: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.text,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  targetHeroValue: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  volumeProgressPlaceholder: {
    marginTop: 8,
    width: '100%',
    maxWidth: 140,
    height: 5,
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
  metricDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: wellness.border,
    opacity: 0.6,
    marginHorizontal: 4,
  },
  metricWaiting: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  repChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: COUNT_CHIP_MIN_WIDTH,
    height: COUNT_CHIP_HEIGHT,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  countChipText: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 16,
    textAlign: 'center',
    lineHeight: 16,
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
    backgroundColor: 'rgba(74, 155, 110, 0.14)',
    borderColor: 'rgba(74, 155, 110, 0.28)',
  },
  validChipText: {
    color: RUNNER_FEEDBACK_COLORS.valid,
  },
  failedChip: {
    backgroundColor: 'rgba(196, 92, 92, 0.1)',
    borderColor: 'rgba(196, 92, 92, 0.22)',
  },
  failedChipText: {
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
});
