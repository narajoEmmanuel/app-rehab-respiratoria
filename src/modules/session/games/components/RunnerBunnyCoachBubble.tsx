/**
 * Purpose: Isolated coach bubble for Level 1 runner (PNG mascot + short copy).
 * Module: session/games
 * Dependencies: RespiraBunnyImage, resolve-runner-coach-cue types, wellness tokens
 * Notes: Visual only — no timers, no gameplay. Integrate in LevelOneGameView in a later phase.
 */

import { StyleSheet, Text, View } from 'react-native';

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
};

export function RunnerBunnyCoachBubble({
  visible = true,
  message,
  pose = 'wink',
  tone = 'info',
  size = 'compact',
  accentColor,
}: RunnerBunnyCoachBubbleProps) {
  if (!visible) {
    return null;
  }

  const bunnyPx = BUNNY_SIZE[size];
  const surface = COACH_TONE_SURFACES[tone];
  const borderColor = accentColor ?? surface.borderColor;
  const isCompact = size === 'compact';
  const hasAccentBar = surface.accentBarColor != null;

  return (
    <View
      style={styles.root}
      pointerEvents="none"
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignItems: 'stretch',
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
