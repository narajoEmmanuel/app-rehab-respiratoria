/**
 * Purpose: Isolated coach bubble for Level 1 runner (PNG mascot + short copy).
 * Module: session/games
 * Dependencies: RespiraBunnyImage, resolve-runner-coach-cue types, wellness tokens
 * Notes: Visual only — autoHide is internal; does not change parent `visible`.
 */

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { RunnerCoachPose, RunnerCoachTone } from '@/src/modules/session/games/components/resolve-runner-coach-cue';
import {
  wellness,
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
  wellnessTypography,
} from '@/src/shared/theme/wellness-theme';
import { RespiraBunnyImage } from '@/src/shared/ui/RespiraBunnyImage';

const BUNNY_SIZE = {
  compact: 45,
  regular: 56,
} as const;

const DEFAULT_AUTO_HIDE_MS = 5200;
const ENTER_MS = 180;
const EXIT_MS = 200;
const ENTER_TRANSLATE_Y = 4;

/** Local tone surfaces — kept minimal; maps to wellness tokens where possible. */
const COACH_TONE_SURFACES: Record<
  RunnerCoachTone,
  {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    accentBarColor: string | null;
  }
> = {
  info: {
    backgroundColor: wellness.card,
    borderColor: wellness.tabBarBorder,
    textColor: wellness.text,
    accentBarColor: null,
  },
  success: {
    backgroundColor: wellnessColors.primarySubtle,
    borderColor: 'rgba(52, 171, 165, 0.28)',
    textColor: wellness.primaryDark,
    accentBarColor: wellness.primary,
  },
  encourage: {
    backgroundColor: 'rgba(255, 252, 247, 0.98)',
    borderColor: 'rgba(201, 162, 39, 0.22)',
    textColor: wellness.text,
    accentBarColor: 'rgba(201, 162, 39, 0.55)',
  },
  rest: {
    backgroundColor: wellnessColors.infoSoft,
    borderColor: 'rgba(37, 99, 235, 0.14)',
    textColor: wellnessColors.info,
    accentBarColor: null,
  },
};

export type RunnerBunnyCoachBubbleProps = {
  visible?: boolean;
  message: string;
  pose?: RunnerCoachPose;
  tone?: RunnerCoachTone;
  size?: 'compact' | 'regular';
  accentColor?: string;
  autoHideMs?: number;
  disableAutoHide?: boolean;
  /** Keeps layout height even when the bubble is hidden or fading out. */
  reserveSpace?: boolean;
};

export function RunnerBunnyCoachBubble({
  visible = true,
  message,
  pose = 'wink',
  tone = 'info',
  size = 'compact',
  accentColor,
  autoHideMs = DEFAULT_AUTO_HIDE_MS,
  disableAutoHide = false,
  reserveSpace = true,
}: RunnerBunnyCoachBubbleProps) {
  const [revealed, setRevealed] = useState(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(ENTER_TRANSLATE_Y);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  };

  useEffect(() => {
    clearTimers();

    if (!visible) {
      setRevealed(false);
      opacity.value = 0;
      translateY.value = ENTER_TRANSLATE_Y;
      return;
    }

    setRevealed(true);
    opacity.value = withTiming(1, {
      duration: ENTER_MS,
      easing: Easing.out(Easing.quad),
    });
    translateY.value = withTiming(0, {
      duration: ENTER_MS,
      easing: Easing.out(Easing.quad),
    });

    if (disableAutoHide) {
      return clearTimers;
    }

    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      opacity.value = withTiming(0, {
        duration: EXIT_MS,
        easing: Easing.in(Easing.quad),
      });
      translateY.value = withTiming(ENTER_TRANSLATE_Y, {
        duration: EXIT_MS,
        easing: Easing.in(Easing.quad),
      });
      exitTimerRef.current = setTimeout(() => {
        exitTimerRef.current = null;
        setRevealed(false);
      }, EXIT_MS);
    }, autoHideMs);

    return clearTimers;
  }, [autoHideMs, disableAutoHide, message, opacity, pose, tone, translateY, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const bunnyPx = BUNNY_SIZE[size];
  const reservedHeight = size === 'compact' ? 48 : 56;
  const showBubble = visible && revealed;

  if (!reserveSpace && !showBubble) {
    return null;
  }

  const surface = COACH_TONE_SURFACES[tone];
  const borderColor = accentColor ?? surface.borderColor;
  const isCompact = size === 'compact';
  const hasAccentBar = surface.accentBarColor != null;

  return (
    <View
      style={[styles.root, reserveSpace && { minHeight: reservedHeight }]}
      pointerEvents="none"
      accessibilityElementsHidden={!showBubble}
      importantForAccessibility={showBubble ? 'yes' : 'no-hide-descendants'}>
      {showBubble ? (
        <Animated.View
          style={[styles.bubbleWrap, animatedStyle]}
          accessibilityRole="text"
          accessibilityLabel={message}>
          <View
            style={[
              styles.bubble,
              isCompact ? styles.bubbleCompact : styles.bubbleRegular,
              hasAccentBar && styles.bubbleWithAccent,
              {
                backgroundColor: surface.backgroundColor,
                borderColor,
              },
              wellnessShadows.soft,
            ]}>
            {surface.accentBarColor ? (
              <View
                style={[
                  styles.accentBar,
                  { backgroundColor: accentColor ?? surface.accentBarColor },
                ]}
              />
            ) : null}
            <RespiraBunnyImage pose={pose} size={bunnyPx} />
            <Text
              style={[
                isCompact ? styles.messageCompact : styles.messageRegular,
                { color: surface.textColor },
              ]}
              numberOfLines={3}>
              {message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  bubbleWrap: {
    width: '100%',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: wellnessRadii.pill,
    overflow: 'hidden',
    gap: 8,
  },
  bubbleCompact: {
    paddingVertical: 6,
    paddingRight: 12,
    paddingLeft: 4,
    minHeight: 52,
  },
  bubbleRegular: {
    paddingVertical: 8,
    paddingRight: 14,
    paddingLeft: 6,
    minHeight: 60,
  },
  bubbleWithAccent: {
    paddingLeft: 10,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: wellnessRadii.pill,
    borderBottomLeftRadius: wellnessRadii.pill,
  },
  messageCompact: {
    flex: 1,
    ...wellnessTypography.caption,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  messageRegular: {
    flex: 1,
    ...wellnessTypography.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
