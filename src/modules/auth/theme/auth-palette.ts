/**
 * Purpose: Auth screens palette — aligned with shared wellness theme.
 * Module: auth
 * Dependencies: shared/theme/wellness-theme
 */

import { wellness } from '@/src/shared/theme/wellness-theme';

export const authPalette = {
  screenBg: wellness.screenBgAlt,
  card: wellness.card,
  cardGlass: wellness.cardGlass,
  text: wellness.text,
  textMuted: wellness.textSecondary,
  /** Sage — main filled buttons */
  primary: wellness.primary,
  /** Olive — titles, key numbers, borders on light sage */
  primaryDark: wellness.primaryDark,
  primaryOnBrand: '#FFFFFF',
  primaryPressed: '#7A9A7A',
  border: wellness.border,
  borderStrong: wellness.borderStrong,
  errorBg: wellness.errorBg,
  errorText: wellness.errorText,
  successBg: wellness.successBg,
  link: wellness.link,
  softGreen: wellness.softGreen,
} as const;
