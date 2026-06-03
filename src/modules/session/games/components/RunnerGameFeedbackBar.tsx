import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LevelOnePhase } from '@/src/modules/session/engine/level-one/use-level-one-game';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

/** Paleta emocional para mensajes motivacionales (sin saturación agresiva). */
export const RUNNER_FEEDBACK_COLORS = {
  achievement: '#C9A227',
  motivation: '#E8876A',
  special: '#8B7EC8',
  valid: '#4A9B6E',
  failed: '#C45C5C',
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
  restSecondsRemaining: number;
  instructionText: string;
  phaseLabel: string;
  instructionTone: RunnerInstructionTone;
  accentColor: string;
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
}): { phaseLabel: string; instructionText: string; instructionTone: RunnerInstructionTone } {
  const { phase, metaJustReached, inhaleSoftHintVisible, attemptFeedback, holdSecondsRemaining } =
    params;

  if (phase === 'preparing') {
    return { phaseLabel: 'Prepárate', instructionText: 'Listo en unos segundos', instructionTone: 'level' };
  }
  if (phase === 'ready') {
    return { phaseLabel: 'Listo', instructionText: 'Inspira cuando estés preparado', instructionTone: 'level' };
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
    return { phaseLabel: 'Descansa', instructionText: 'Prepárate para la siguiente', instructionTone: 'level' };
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

export function RunnerGameFeedbackBar({
  phase,
  displayVolumeMl,
  targetVolume,
  volumeHudMessage,
  repetition,
  valid,
  failed,
  restSecondsRemaining,
  instructionText,
  phaseLabel,
  instructionTone,
  accentColor,
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
  const phaseColor = instructionColor(instructionTone, accentColor);
  const instructionColorValue = instructionColor(instructionTone, accentColor);

  return (
    <View style={styles.wrap}>
      <View style={styles.metricsRow}>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Volumen</Text>
          <Text style={[styles.metricValue, volumeHudMessage ? styles.metricWaiting : null]}>
            {volumeText}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Meta</Text>
          <Text style={styles.metricValue}>{targetVolume} mL</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.repCell}>
          <Text style={styles.metricLabel}>Rep. {repetition}/10</Text>
          <View style={styles.repChipsRow}>
            <View style={styles.validChip}>
              <Text style={styles.validChipText}>✓ {valid}</Text>
            </View>
            <View style={styles.failedChip}>
              <Text style={styles.failedChipText}>✕ {failed}</Text>
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
              <Text style={styles.pauseBtnText}>Pausar</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {inRest ? (
        <View style={[styles.restCapsule, { borderColor: accentColor }]}>
          <Text style={[styles.restLabel, { color: accentColor }]}>Descansa</Text>
          <View style={[styles.restTimerRing, { borderColor: accentColor }]}>
            <Text style={[styles.restTimerValue, { color: accentColor }]}>
              {restSecondsRemaining}
            </Text>
            <Text style={styles.restTimerUnit}>s</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.phaseBlock, { borderColor: accentColor }]}>
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
    gap: 6,
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: wellnessRadii.card,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  repCell: {
    flex: 1.1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: wellness.border,
    opacity: 0.6,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: wellness.text,
  },
  metricWaiting: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
  },
  repChipsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 1,
  },
  validChip: {
    backgroundColor: 'rgba(74, 155, 110, 0.14)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 155, 110, 0.28)',
  },
  validChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: RUNNER_FEEDBACK_COLORS.valid,
  },
  failedChip: {
    backgroundColor: 'rgba(196, 92, 92, 0.1)',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(196, 92, 92, 0.22)',
  },
  failedChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: RUNNER_FEEDBACK_COLORS.failed,
  },
  pauseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  pauseBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  phaseBlock: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: wellnessRadii.card,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: wellnessRadii.pill,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 2,
  },
  restLabel: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  restTimerRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  restTimerValue: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  restTimerUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: wellness.textSecondary,
    marginTop: -2,
  },
});
