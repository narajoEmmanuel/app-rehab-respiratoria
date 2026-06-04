import type { LevelOnePhase } from '@/src/modules/session/engine/level-one/use-level-one-game';

export type RunnerCoachPose = 'wink' | 'celebrate';

export type RunnerCoachTone = 'info' | 'success' | 'encourage' | 'rest';

export type RunnerCoachCue = {
  visible: boolean;
  message: string;
  pose: RunnerCoachPose;
  tone: RunnerCoachTone;
};

export type ResolveRunnerCoachCueParams = {
  phase: LevelOnePhase;
  attemptFeedback: 'idle' | 'valid' | 'failed';
  metaJustReached: boolean;
  inhaleSoftHintVisible: boolean;
  holdSecondsRemaining: number;
  prepSecondsRemaining: number;
  restSecondsRemaining: number;
  sessionActive: boolean;
  introMode?: boolean;
  suppressed?: boolean;
};

const HIDDEN_CUE: RunnerCoachCue = {
  visible: false,
  message: '',
  pose: 'wink',
  tone: 'info',
};

const TERMINAL_OR_INACTIVE_PHASES: ReadonlySet<LevelOnePhase> = new Set([
  'not-started',
  'session-complete',
  'level-complete',
  'interrupted',
]);

function visibleCue(
  message: string,
  pose: RunnerCoachPose,
  tone: RunnerCoachTone,
): RunnerCoachCue {
  return { visible: true, message, pose, tone };
}

/**
 * Declarative coach copy for Level 1 runner — no timers, no React, no gameplay side effects.
 */
export function resolveRunnerCoachCue(params: ResolveRunnerCoachCueParams): RunnerCoachCue {
  const {
    phase,
    attemptFeedback,
    metaJustReached,
    inhaleSoftHintVisible,
    sessionActive,
    introMode = false,
    suppressed = false,
  } = params;

  if (suppressed || !sessionActive || introMode) {
    return HIDDEN_CUE;
  }

  if (TERMINAL_OR_INACTIVE_PHASES.has(phase)) {
    return HIDDEN_CUE;
  }

  switch (phase) {
    case 'preparing':
      return visibleCue(
        'Prepárate. La próxima inspiración es a tu ritmo.',
        'wink',
        'info',
      );
    case 'ready':
      return visibleCue('Cuando estés listo, inspira hacia la meta.', 'wink', 'info');
    case 'inhaling':
      if (inhaleSoftHintVisible) {
        return visibleCue(
          'Sin prisa. Revisa el sensor si hace falta.',
          'wink',
          'encourage',
        );
      }
      return visibleCue('Sube con calma hasta la meta de volumen.', 'wink', 'info');
    case 'evaluating':
      if (metaJustReached) {
        return visibleCue('Meta alcanzada. Sostén un momento.', 'celebrate', 'success');
      }
      return visibleCue('Mantén el volumen arriba de la meta.', 'wink', 'info');
    case 'resting':
      return visibleCue('Exhala y deja que el cuerpo se relaje.', 'wink', 'rest');
    case 'exhale':
      if (attemptFeedback === 'valid') {
        return visibleCue('Buen trabajo. Repetición registrada.', 'celebrate', 'success');
      }
      if (attemptFeedback === 'failed') {
        return visibleCue('Ajusta en la siguiente. Vas bien.', 'wink', 'encourage');
      }
      return HIDDEN_CUE;
    default:
      return HIDDEN_CUE;
  }
}
