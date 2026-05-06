/**
 * Purpose: Per-level accent colors and semantic labels for Terapia / niveles (RESPIRA+).
 * Module: theme
 * Notes: Soft tints for surfaces — keep contrast AA on text paired with accents.
 */

export type LevelNumber = 1 | 2 | 3 | 4 | 5 | 6;

export type LevelVisualIdentity = {
  levelNumber: LevelNumber;
  accent: string;
  /** Light wash for tags / chips (non-gradient). */
  accentSoft: string;
  semantic: string;
};

const LEVEL_IDENTITIES: readonly LevelVisualIdentity[] = [
  { levelNumber: 1, accent: '#34ABA5', accentSoft: 'rgba(52, 171, 165, 0.14)', semantic: 'Base' },
  { levelNumber: 2, accent: '#4A90E2', accentSoft: 'rgba(74, 144, 226, 0.14)', semantic: 'Ritmo' },
  { levelNumber: 3, accent: '#55C879', accentSoft: 'rgba(85, 200, 121, 0.14)', semantic: 'Control' },
  { levelNumber: 4, accent: '#8F7CF6', accentSoft: 'rgba(143, 124, 246, 0.14)', semantic: 'Enfoque' },
  { levelNumber: 5, accent: '#FF9F7A', accentSoft: 'rgba(255, 159, 122, 0.16)', semantic: 'Resistencia' },
  { levelNumber: 6, accent: '#F5B84B', accentSoft: 'rgba(245, 184, 75, 0.16)', semantic: 'Dominio' },
] as const;

const FALLBACK: LevelVisualIdentity = LEVEL_IDENTITIES[0];

export function parseLevelNumberFromId(levelId: string): LevelNumber {
  const match = /^level-(\d+)$/.exec(levelId);
  const n = match ? Number.parseInt(match[1], 10) : 1;
  if (Number.isNaN(n) || n < 1) return 1;
  if (n > 6) return 6;
  return n as LevelNumber;
}

export function getLevelVisualIdentity(levelId: string): LevelVisualIdentity {
  const n = parseLevelNumberFromId(levelId);
  return LEVEL_IDENTITIES[n - 1] ?? FALLBACK;
}
