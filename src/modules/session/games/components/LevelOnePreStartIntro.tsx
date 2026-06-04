/**
 * Purpose: Back-compat alias for Level 1 pre-start intro.
 * Module: session/games
 * Notes: Prefer RunnerLevelPreStartIntro for new code.
 */

import { getLevelDisplayMeta } from '@/src/modules/session/levels/level-difficulty-config';
import {
  RunnerLevelPreStartIntro,
  type RunnerLevelPreStartIntroProps,
} from '@/src/modules/session/games/components/RunnerLevelPreStartIntro';
import { getLevelVisualIdentity, parseLevelNumberFromId } from '@/src/theme/level-colors';

export type LevelOnePreStartIntroProps = {
  onStart: () => void;
  onBack: () => void;
};

/** @deprecated Use RunnerLevelPreStartIntro with level props. */
export function LevelOnePreStartIntro({ onStart, onBack }: LevelOnePreStartIntroProps) {
  const levelId = 'level-1';
  const meta = getLevelDisplayMeta(levelId);
  const visual = getLevelVisualIdentity(levelId);

  const props: RunnerLevelPreStartIntroProps = {
    levelId,
    levelNumber: parseLevelNumberFromId(levelId),
    levelTitle: meta.humanName,
    accentColor: visual.accent,
    secondaryAccentColor: visual.accentSoft,
    onStart,
    onBack,
  };

  return <RunnerLevelPreStartIntro {...props} />;
}
