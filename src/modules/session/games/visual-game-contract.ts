/**
 * Purpose: Contract between session UI and a visual minigame component.
 * Module: session/games
 * Dependencies: session/games/game-types
 * Notes: Swapping visuals for a level should not require app-wide refactors.
 */

import type { GameVisualId } from '@/src/modules/session/games/game-types';

export type VisualGameViewProps = {
  gameVisualId: GameVisualId;
  levelId: string;
  /** Called when the visual minigame signals completion (optional). */
  onRequestFinish?: () => void;
};
