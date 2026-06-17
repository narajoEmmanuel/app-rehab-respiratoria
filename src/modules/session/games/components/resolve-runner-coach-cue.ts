import type { LevelOnePhase } from '@/src/modules/session/engine/level-one/use-level-one-game';

export type RunnerCoachPose = 'wink' | 'celebrate';

export type RunnerCoachTone = 'info' | 'success' | 'encourage' | 'rest';

export type RunnerCoachCue = {
  visible: boolean;
  message: string;
  pose: RunnerCoachPose;
  tone: RunnerCoachTone;
  autoHideMs?: number;
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

const DEFAULT_COACH_VISIBLE_MS = 5200;
const BRIEF_COACH_VISIBLE_MS = 4800;

function visibleCue(
  message: string,
  pose: RunnerCoachPose,
  tone: RunnerCoachTone,
  autoHideMs = DEFAULT_COACH_VISIBLE_MS,
): RunnerCoachCue {
  return { visible: true, message, pose, tone, autoHideMs };
}

/**
 * Declarative coach copy for Level 1 runner — no timers, no React, no gameplay side effects.
 * Fewer cues during inhale/hold; longer display for messages that remain.
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
      return visibleCue('La próxima inspiración es a tu ritmo.', 'wink', 'info', BRIEF_COACH_VISIBLE_MS);
    case 'ready':
    case 'inhaling':
      if (inhaleSoftHintVisible) {
        return visibleCue('Sin prisa. Revisa el sensor si hace falta.', 'wink', 'encourage');
      }
      return HIDDEN_CUE;
    case 'evaluating':
      if (metaJustReached) {
        return visibleCue('Meta alcanzada. Sostén un momento.', 'celebrate', 'success', BRIEF_COACH_VISIBLE_MS);
      }
      return HIDDEN_CUE;
    case 'resting':
      return visibleCue('Respira con calma.', 'wink', 'rest', BRIEF_COACH_VISIBLE_MS);
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
