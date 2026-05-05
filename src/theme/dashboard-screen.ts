/**
 * Purpose: Shared visual tokens for main tab screens (Inicio, Terapia, Historial).
 * Module: theme
 * Dependencies: spacing
 * Notes: Aligns with Home dashboard — flat cards, Inter via callers using typography.ts.
 */

import { spacing } from '@/src/shared/theme/spacing';

/** Primary accent — RESPIRA+ */
export const dashboardAccent = '#34aba5';

export const dashboardScreen = {
  screenBg: '#F6F7F6',
  cardBg: '#FFFFFF',
  cardRadius: 16,
  cardBorderColor: '#EBEBEB',
  textPrimary: '#111827',
  textPrimaryStrong: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  /** Primary pressable / filled button */
  primaryButtonRadius: 12,
  primaryButtonPaddingVertical: 14,
  primaryButtonMinHeight: 48,
  screenPaddingHorizontal: spacing.lg,
  sectionGap: spacing.lg,
} as const;

/**
 * Bottom padding for ScrollView content with the flat tab bar (no floating capsule).
 * Tab row + labels ≈ 52–56pt; add breathing room above the bar.
 */
export function dashboardScrollBottomPadding(bottomInset: number): number {
  const flatTabBarClusterHeight = 56;
  return bottomInset + flatTabBarClusterHeight + spacing.md;
}
