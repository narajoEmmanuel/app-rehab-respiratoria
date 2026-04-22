/**
 * Purpose: Core session domain types (lifecycle, snapshots).
 * Module: session/core
 * Dependencies: none
 * Notes: Keep independent from visual game implementation.
 */

export type SessionPhase = 'idle' | 'running' | 'paused' | 'completed';

export type SessionSnapshot = {
  levelId: string;
  phase: SessionPhase;
  startedAt: number | null;
};
