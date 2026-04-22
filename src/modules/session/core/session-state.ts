/**
 * Purpose: Minimal session state helpers (placeholder).
 * Module: session/core
 * Dependencies: session/core/types
 * Notes: Replace with real engine when gameplay rules exist.
 */

import type { SessionPhase, SessionSnapshot } from '@/src/modules/session/core/types';

export function createIdleSessionSnapshot(levelId: string): SessionSnapshot {
  return { levelId, phase: 'idle' as SessionPhase, startedAt: null };
}
