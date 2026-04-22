/**
 * Purpose: Resolve theme color from props override or palette.
 * Module: shared/utils
 * Dependencies: shared/theme/colors, shared/utils/use-color-scheme
 */

import { Colors } from '@/src/shared/theme/colors';
import { useColorScheme } from '@/src/shared/utils/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
}
