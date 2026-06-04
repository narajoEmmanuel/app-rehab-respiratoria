/**
 * Purpose: UI-only accent surfaces for runner pre-start intro and cards.
 * Module: session/games
 * Notes: Does not affect gameplay, difficulty, or clinical rules.
 */

import { getLevelVisualIdentity } from '@/src/theme/level-colors';
import { wellness, wellnessColors } from '@/src/shared/theme/wellness-theme';

export type RunnerLevelVisualTheme = {
  accent: string;
  accentSoft: string;
  cardTint: string;
  cardBorder: string;
  iconBg: string;
  holdAccent: string;
  holdIconBg: string;
  holdCardBg: string;
  holdCardBorder: string;
  restAccent: string;
  restIconBg: string;
  restCardBg: string;
  restCardBorder: string;
  textOnAccent: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(52, 171, 165, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Soft card tints and hold/rest accents for the pre-start intro — per runner level. */
export function getRunnerLevelVisualTheme(levelId: string): RunnerLevelVisualTheme {
  const identity = getLevelVisualIdentity(levelId);
  const accent = identity.accent;

  return {
    accent,
    accentSoft: identity.accentSoft,
    cardTint: rgbaFromHex(accent, 0.1),
    cardBorder: rgbaFromHex(accent, 0.2),
    iconBg: rgbaFromHex(accent, 0.14),
    holdAccent: '#B45309',
    holdIconBg: wellnessColors.warningSoft,
    holdCardBg: 'rgba(254, 243, 199, 0.55)',
    holdCardBorder: 'rgba(245, 158, 11, 0.22)',
    restAccent: wellnessColors.info,
    restIconBg: wellnessColors.infoSoft,
    restCardBg: 'rgba(219, 234, 254, 0.45)',
    restCardBorder: 'rgba(37, 99, 235, 0.16)',
    textOnAccent: '#FFFFFF',
  };
}

/** Neutral mint wash used when no scene overlay is passed. */
export const RUNNER_PRE_START_DEFAULT_OVERLAY = 'rgba(221, 232, 216, 0.50)';

export function runnerPreStartTitleColor(accent: string): string {
  const rgb = hexToRgb(accent);
  if (!rgb) return wellness.primaryDark;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.62 ? wellness.primaryDark : accent;
}
