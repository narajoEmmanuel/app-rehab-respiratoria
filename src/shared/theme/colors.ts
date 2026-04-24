/**
 * Purpose: Semantic color tokens for light and dark themes.
 * Module: shared/theme
 * Dependencies: wellness-theme
 * Notes: Light mode follows wellness palette; dark kept for system theme.
 */

import { wellness } from '@/src/shared/theme/wellness-theme';

/** Tab / link accent: olive in light mode for contrast on pale background */
const tintColorLight = wellness.primaryDark;
const tintColorDark = '#A3C4A3';

export const Colors = {
  light: {
    text: wellness.text,
    background: wellness.screenBg,
    tint: tintColorLight,
    icon: wellness.textSecondary,
    tabIconDefault: wellness.textSecondary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
} as const;
