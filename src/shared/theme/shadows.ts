/**
 * Purpose: Shadow presets for cards and elevated surfaces.
 * Module: shared/theme
 * Dependencies: none
 * Notes: RN uses shadow* on iOS and elevation on Android.
 */

import type { ViewStyle } from 'react-native';

import { wellnessShadows } from '@/src/shared/theme/wellness-theme';

export const shadows = {
  card: {
    shadowColor: '#4F6F52',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  } satisfies ViewStyle,
  cardFloating: wellnessShadows.card satisfies ViewStyle,
  tabBar: wellnessShadows.tabBar satisfies ViewStyle,
} as const;
