/**
 * Purpose: Shadow presets for cards and elevated surfaces.
 * Module: shared/theme
 * Dependencies: none
 * Notes: RN uses shadow* on iOS and elevation on Android.
 */

import type { ViewStyle } from 'react-native';

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  } satisfies ViewStyle,
} as const;
