import { StyleSheet, Text, View } from 'react-native';

import type { LevelOnePhase } from '@/src/modules/session/engine/level-one/use-level-one-game';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

type RunnerGameFeedbackBarProps = {
  phase: LevelOnePhase;
  displayVolumeMl: number;
  targetVolume: number;
  volumeHudMessage?: string | null;
  repetition: number;
  valid: number;
  failed: number;
  instructionText: string;
  phaseLabel: string;
  accentColor: string;
  inhaleSoftHintVisible?: boolean;
};

export function resolveRunnerInstruction(params: {
  phase: LevelOnePhase;
  metaJustReached: boolean;
  inhaleSoftHintVisible: boolean;
  attemptFeedback: 'idle' | 'valid' | 'failed';
  holdSecondsRemaining: number;
}): { phaseLabel: string; instructionText: string } {
  const { phase, metaJustReached, inhaleSoftHintVisible, attemptFeedback, holdSecondsRemaining } =
    params;

  if (phase === 'preparing') {
    return { phaseLabel: 'Prepárate', instructionText: 'Listo en unos segundos' };
  }
  if (phase === 'ready') {
    return { phaseLabel: 'Listo', instructionText: 'Inspira cuando estés preparado' };
  }
  if (phase === 'inhaling') {
    if (inhaleSoftHintVisible) {
      return {
        phaseLabel: 'Inspira',
        instructionText: 'Tómate tu tiempo. Puedes descansar o revisar la conexión del sensor.',
      };
    }
    return { phaseLabel: 'Inspira', instructionText: 'Inspira hasta alcanzar la meta' };
  }
  if (phase === 'evaluating') {
    if (metaJustReached) {
      return { phaseLabel: 'Sostén', instructionText: '¡Meta alcanzada!' };
    }
    const holdHint =
      holdSecondsRemaining > 0
        ? `Sostén 2 segundos · ${holdSecondsRemaining}s`
        : 'Sostén 2 segundos';
    return { phaseLabel: 'Sostén', instructionText: `${holdHint} · Mantente arriba de la meta` };
  }
  if (phase === 'exhale') {
    if (attemptFeedback === 'valid') {
      return { phaseLabel: 'Exhala', instructionText: 'Buen intento' };
    }
    if (attemptFeedback === 'failed') {
      return { phaseLabel: 'Exhala', instructionText: 'Ajusta en la próxima' };
    }
    return { phaseLabel: 'Exhala', instructionText: 'Suelta con calma' };
  }
  if (phase === 'resting') {
    return { phaseLabel: 'Descansa', instructionText: 'Prepárate para la siguiente' };
  }
  return { phaseLabel: 'Listo', instructionText: '' };
}

export function RunnerGameFeedbackBar({
  phase,
  displayVolumeMl,
  targetVolume,
  volumeHudMessage,
  repetition,
  valid,
  failed,
  instructionText,
  phaseLabel,
  accentColor,
  inhaleSoftHintVisible = false,
}: RunnerGameFeedbackBarProps) {
  const showVolume = phase !== 'preparing' && phase !== 'ready' && phase !== 'not-started';
  const volumeText = volumeHudMessage
    ? volumeHudMessage
    : showVolume
      ? `${Math.round(displayVolumeMl)} mL`
      : '—';

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
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Rep.</Text>
          <Text style={styles.metricValueSmall}>
            {repetition}/10 · ✓{valid} · ✗{failed}
          </Text>
        </View>
      </View>

      <View style={[styles.phaseBlock, { borderColor: accentColor }]}>
        <Text style={[styles.phaseLabel, { color: accentColor }]}>{phaseLabel}</Text>
        {instructionText ? (
          <Text
            style={[
              styles.instructionText,
              inhaleSoftHintVisible && styles.instructionSoftHint,
            ]}>
            {instructionText}
          </Text>
        ) : null}
      </View>
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
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  metricCell: {
    flex: 1,
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
  metricValueSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.text,
  },
  metricWaiting: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
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
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  instructionSoftHint: {
    fontSize: 12,
    fontStyle: 'italic',
    color: wellness.textSecondary,
  },
});
