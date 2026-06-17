import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { RUNNER_FEEDBACK_COLORS } from '@/src/modules/session/games/components/runner-feedback-colors';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

/** Transparent fixed slot — avoids layout jumps without a full-width card. */
export const STABLE_INSTRUCTION_PANEL_HEIGHT = 56;
const HINT_SLOT_HEIGHT = 18;
const COUNTDOWN_BUBBLE_SIZE = 40;

export type StableInstructionMode = 'rest' | 'prep' | 'hold' | 'phase';

export type StableInstructionPanelProps = {
  mode: StableInstructionMode;
  accentColor: string;
  prepColor?: string;
  phaseColor?: string;
  topLabel?: string;
  centerText: string;
  hintText?: string;
  hintColor?: string;
  progressRatio?: number;
  progressColor?: string;
  pulseStyle?: AnimatedStyle<ViewStyle>;
  validFxStyle?: AnimatedStyle<ViewStyle>;
  inhaleSoftHintVisible?: boolean;
};

export function StableInstructionPanel({
  mode,
  accentColor,
  prepColor = RUNNER_FEEDBACK_COLORS.special,
  phaseColor = accentColor,
  topLabel,
  centerText,
  hintText = '',
  hintColor,
  progressRatio = 0,
  progressColor,
  pulseStyle,
  validFxStyle,
  inhaleSoftHintVisible = false,
}: StableInstructionPanelProps) {
  const accent = mode === 'prep' ? prepColor : accentColor;
  const ringColor = progressColor ?? accent;
  const centerColor = mode === 'prep' ? prepColor : mode === 'rest' ? accentColor : phaseColor;
  const resolvedHintColor = hintColor ?? centerColor;
  const showHint = Boolean(hintText && hintText.trim().length > 0);
  const isCountdownMode = mode === 'rest' || mode === 'prep' || mode === 'hold';

  const pillBody = (
    <View
      style={[
        styles.pill,
        mode === 'prep' && styles.pillPrep,
        { borderColor: `${accent}28` },
      ]}>
      {validFxStyle ? (
        <Animated.View style={[styles.validFxOverlay, validFxStyle]} pointerEvents="none">
          <Text style={styles.validFxStars}>✦ ✧ ✦</Text>
        </Animated.View>
      ) : null}

      {isCountdownMode ? (
        <View style={styles.heroRow}>
          {topLabel ? (
            <Text style={[styles.heroPhaseLabel, { color: centerColor }]} numberOfLines={1}>
              {topLabel}
            </Text>
          ) : null}
          <View style={[styles.countdownBubble, { borderColor: `${ringColor}40` }]}>
            <View
              style={[
                styles.countdownRing,
                {
                  borderColor: ringColor,
                  opacity: 0.12 + progressRatio * 0.35,
                },
              ]}
            />
            <Text style={[styles.countdownText, { color: centerColor }]} numberOfLines={1}>
              {centerText}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.phaseLabel, { color: centerColor }]} numberOfLines={1}>
          {centerText}
        </Text>
      )}
    </View>
  );

  const panelBody = (
    <View style={styles.slot}>
      {pulseStyle ? (
        <Animated.View style={pulseStyle}>{pillBody}</Animated.View>
      ) : (
        pillBody
      )}
      <View style={styles.hintSlot}>
        {showHint ? (
          <Text
            style={[
              styles.hintText,
              { color: resolvedHintColor },
              inhaleSoftHintVisible && styles.hintSoft,
            ]}
            numberOfLines={1}>
            {hintText}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return panelBody;
}

const styles = StyleSheet.create({
  slot: {
    minHeight: STABLE_INSTRUCTION_PANEL_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pill: {
    alignSelf: 'center',
    maxWidth: '92%',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: wellnessRadii.pill,
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pillPrep: {
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  validFxOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201, 162, 39, 0.12)',
    borderRadius: wellnessRadii.pill,
  },
  validFxStars: {
    fontSize: 14,
    fontWeight: '800',
    color: RUNNER_FEEDBACK_COLORS.achievement,
    letterSpacing: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  heroPhaseLabel: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 24,
  },
  phaseLabel: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 32,
  },
  countdownBubble: {
    width: COUNTDOWN_BUBBLE_SIZE,
    height: COUNTDOWN_BUBBLE_SIZE,
    borderRadius: COUNTDOWN_BUBBLE_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  countdownRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: COUNTDOWN_BUBBLE_SIZE / 2,
    borderWidth: 2,
  },
  countdownText: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  hintSlot: {
    height: HINT_SLOT_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginTop: 2,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  hintSoft: {
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '600',
    color: wellness.textSecondary,
  },
});
