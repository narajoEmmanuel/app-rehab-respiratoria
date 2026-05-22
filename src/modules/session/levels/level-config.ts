/**
 * Purpose: Configuration for one playable level (difficulty + which visual to use).
 * Module: session/levels
 * Dependencies: session/games/game-types, session/levels/level-difficulty
 * Notes: difficulty and gameVisualId are intentionally separate fields.
 */

import type { GameVisualId } from '@/src/modules/session/games/game-types';
import type { LevelDifficulty } from '@/src/modules/session/levels/level-difficulty';
import type { LevelGameTheme, LevelObstacleType } from '@/src/modules/session/levels/level-gameplay-config';

export type LevelDefinition = {
  id: string;
  title: string;
  /** Clinical / UX difficulty, not tied to a specific minigame. */
  difficulty: LevelDifficulty;
  /** Which visual minigame component to mount for this level. */
  gameVisualId: GameVisualId;
  /** Runner game scene theme (forest / desert). */
  theme?: LevelGameTheme;
  /** Goal obstacle during official hold. */
  obstacleType?: LevelObstacleType;
  /** Used by UI to communicate availability. */
  comingSoon?: boolean;
};
