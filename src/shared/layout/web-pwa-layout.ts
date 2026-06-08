/**
 * Layout tokens for web / iOS PWA (standalone home-screen shortcut).
 * Native local_sensor paths keep existing spacing unless Platform.OS === 'web'.
 */
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

type WebPreventableEvent = { preventDefault: () => void };

/** Extra air below the status bar / notch on web PWA. */
export const WEB_PWA_TOP_OFFSET = 6;

/** Minimum bottom breathing room when env(safe-area-inset-bottom) is 0. */
export const WEB_PWA_BOTTOM_OFFSET_MIN = 10;

/** Extra padding above the home indicator inside the tab bar. */
export const WEB_PWA_BOTTOM_EXTRA = 6;

export const TAB_ICON_SIZE_ACTIVE = 26;
export const TAB_ICON_SIZE_INACTIVE = 25;

export function isWebPwaLayout(): boolean {
  return Platform.OS === 'web';
}

/** KeyboardAvoidingView is useful on native iOS only; web/PWA scrolls internally. */
export function shouldUseNativeKeyboardAvoiding(): boolean {
  return Platform.OS === 'ios';
}

export function webPwaTopPadding(safeAreaTop: number): number {
  return safeAreaTop + WEB_PWA_TOP_OFFSET;
}

export function webPwaTabBarBottomPadding(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom, WEB_PWA_BOTTOM_OFFSET_MIN) + WEB_PWA_BOTTOM_EXTRA;
}

/** Inline RN-web styles for full-screen touch capture layers (game / evaluación). */
export const WEB_TOUCH_SURFACE_STYLE: ViewStyle = Platform.OS === 'web'
  ? ({
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      touchAction: 'none',
      cursor: 'pointer',
    } as ViewStyle)
  : {};

function preventWebDefault(event: WebPreventableEvent) {
  event.preventDefault();
}

/** Merge touch-surface styles with an optional base style array. */
export function webTouchSurfaceStyle(
  ...base: StyleProp<ViewStyle>[]
): StyleProp<ViewStyle> {
  if (!isWebPwaLayout()) {
    return base.length === 1 ? base[0] : base;
  }
  return [...base, WEB_TOUCH_SURFACE_STYLE];
}

/**
 * Extra Pressable props for web touch surfaces — blocks iOS callout / text selection gestures.
 * Do not apply to TextInput or auth form fields.
 */
export function webTouchSurfacePressableProps(): Record<string, unknown> {
  if (!isWebPwaLayout()) {
    return {};
  }
  return {
    dataSet: { touchSurface: 'true' },
    onContextMenu: preventWebDefault,
    onDragStart: preventWebDefault,
    onSelectStart: preventWebDefault,
  };
}
