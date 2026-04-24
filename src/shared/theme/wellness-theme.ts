/**
 * Purpose: Health / wellness visual tokens for patient-facing screens.
 * Module: shared/theme
 * Dependencies: none
 * Notes: Single source for palette, radii extensions, and glass-like surfaces.
 */

export const wellness = {
  /** Main app canvas */
  screenBg: '#F5F7F3',
  screenBgAlt: '#F4F7F2',

  card: '#FFFFFF',
  /** Soft glass-style surface (no native blur required) */
  cardGlass: 'rgba(255, 255, 255, 0.9)',

  text: '#1E1E1E',
  textSecondary: '#6F756C',

  /** Sage / muted green — buttons, highlights */
  primary: '#8FAF8F',
  /** Olive / depth — titles, icons on light sage */
  primaryDark: '#4F6F52',
  /** Wash behind cards or chips */
  softGreen: '#DDE8D8',

  border: 'rgba(79, 111, 82, 0.14)',
  borderStrong: 'rgba(79, 111, 82, 0.22)',

  errorBg: '#FDF0F1',
  errorText: '#8C3A42',
  successBg: '#E8F2E4',
  link: '#4F6F52',

  tabBarBg: 'rgba(255, 255, 255, 0.94)',
  tabBarBorder: 'rgba(79, 111, 82, 0.1)',
} as const;

/** Extra-rounded radii for wellness cards (extends base `radii`). */
export const wellnessRadii = {
  card: 22,
  cardLarge: 26,
  pill: 32,
  full: 9999,
} as const;

/** Extra bottom padding for scroll areas when using the floating tab bar (light theme). */
export const wellnessFloatingTabBarInset = 108;

export const wellnessShadows = {
  card: {
    shadowColor: '#4F6F52',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  cardPress: {
    shadowColor: '#4F6F52',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tabBar: {
    shadowColor: '#1E1E1E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
