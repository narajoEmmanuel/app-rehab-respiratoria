/**
 * Purpose: Health / wellness visual tokens for patient-facing screens.
 * Module: shared/theme
 * Dependencies: none
 * Notes: Single source for palette, radii extensions, and glass-like surfaces.
 *        The app root and `app.json` force a light UI; these tokens target that RESPIRA+ look even if the OS theme toggles.
 */

export const wellness = {
  /** Main app canvas — use for SafeAreaView / screen roots (`appScreenBackground`). */
  screenBg: '#F5F7F3',
  screenBgAlt: '#F4F7F2',

  card: '#FFFFFF',
  /** Soft glass-style surface (no native blur required) */
  cardGlass: 'rgba(255, 255, 255, 0.9)',

  text: '#1E1E1E',
  textSecondary: '#6F756C',

  /** Health / wellness accent */
  primary: '#34aba5',
  /** Slightly darker accent for text/icons */
  primaryDark: '#1F7E7A',
  /** Wash behind cards or chips */
  softGreen: '#DDE8D8',

  border: 'rgba(79, 111, 82, 0.14)',
  borderStrong: 'rgba(79, 111, 82, 0.22)',

  errorBg: '#FDF0F1',
  errorText: '#8C3A42',
  successBg: '#E8F2E4',
  link: '#34aba5',

  tabBarBg: 'rgba(255, 255, 255, 0.94)',
  tabBarBorder: 'rgba(52, 171, 165, 0.16)',
} as const;

// ---------------------------------------------------------------------------
// Extended palette — Fase 2A
// ---------------------------------------------------------------------------

export const wellnessColors = {
  primary: '#34aba5',
  primaryDark: '#1F7E7A',
  primarySoft: 'rgba(52, 171, 165, 0.10)',
  primarySubtle: '#F0FAF9',

  /** Matches `wellness.screenBg` — prefer `appScreenBackground` for new screens. */
  background: '#F5F7F3',
  card: '#FFFFFF',
  border: '#E8ECE9',

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  success: '#2E7D32',
  successSoft: '#E8F2E4',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',

  info: '#2563EB',
  infoSoft: '#DBEAFE',
  neutral: '#6B7280',
  neutralSoft: '#F3F4F6',
} as const;

export const wellnessRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 9999,
} as const;

/**
 * Canonical typography scale (Fase 4A).
 * Legacy keys (`screenTitle`, `sectionTitle`, etc.) remain for backward compatibility.
 */
export const wellnessTypography = {
  // —— Canonical scale ——
  display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.3, lineHeight: 36 },
  titleLarge: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.3 },
  titleMedium: { fontSize: 18, fontWeight: '800' as const },
  titleSmall: { fontSize: 16, fontWeight: '700' as const },
  bodyLarge: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '600' as const, letterSpacing: 0.2 },
  button: { fontSize: 16, fontWeight: '700' as const },
  metric: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.2 },
  metricLarge: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.3 },
  metricMedium: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.2 },
  metricSmall: { fontSize: 18, fontWeight: '800' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.3 },
  chip: { fontSize: 13, fontWeight: '700' as const },
  chipSmall: { fontSize: 11, fontWeight: '700' as const },
  tabLabel: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.25 },
  input: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  link: { fontSize: 14, fontWeight: '700' as const },
  statusValue: { fontSize: 15, fontWeight: '700' as const, lineHeight: 20 },

  /** Specialized tokens for in-game HUD (LevelOneGameView, RunnerGameFeedbackBar). */
  gameHud: {
    titleMini: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.35 },
    pauseText: { fontSize: 11, fontWeight: '800' as const },
    cellLabel: { fontSize: 11, fontWeight: '600' as const },
    cellLabelCompact: { fontSize: 9, fontWeight: '600' as const, letterSpacing: 0.2 },
    cellValue: { fontSize: 15, fontWeight: '800' as const },
    cellValueCompact: { fontSize: 12, fontWeight: '800' as const },
    cellUnit: { fontSize: 10, fontWeight: '700' as const },
  },

  // —— Legacy aliases (do not remove — used across modules) ——
  /** @deprecated Use titleLarge */
  screenTitle: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.3 },
  /** @deprecated Use bodyLarge */
  screenSubtitle: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  /** @deprecated Use titleMedium */
  sectionTitle: { fontSize: 18, fontWeight: '800' as const },
  /** @deprecated Use titleSmall */
  cardTitle: { fontSize: 16, fontWeight: '700' as const },
  /** @deprecated Use bodyMedium */
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
} as const;

/** Canonical root background for tab screens and dashboards. */
export const appScreenBackground = wellness.screenBg;

/** Unified theme object for reusable components. */
export const wellnessTheme = {
  colors: wellnessColors,
  radius: wellnessRadius,
  typography: wellnessTypography,
} as const;

// ---------------------------------------------------------------------------
// Legacy exports (unchanged)
// ---------------------------------------------------------------------------

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
  soft: {
    shadowColor: '#4F6F52',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#1E1E1E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
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
