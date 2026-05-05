/**
 * Purpose: Global Inter typography tokens and fallbacks.
 * Module: shared/theme
 * Dependencies: react-native Platform
 */

import { Platform } from 'react-native';

export const fontRegular = 'Inter_400Regular';
export const fontMedium = 'Inter_500Medium';
export const fontSemiBold = 'Inter_600SemiBold';
export const fontBold = 'Inter_700Bold';

/**
 * Backward-compatible font stacks for places still using the previous token shape.
 */
export const Fonts = Platform.select({
  ios: {
    sans: fontRegular,
    serif: 'ui-serif',
    rounded: fontMedium,
    mono: 'ui-monospace',
  },
  default: {
    sans: fontRegular,
    serif: 'serif',
    rounded: fontMedium,
    mono: 'monospace',
  },
  web: {
    sans: `${fontRegular}, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
    serif: "Georgia, 'Times New Roman', serif",
    rounded: `${fontMedium}, 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif`,
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
