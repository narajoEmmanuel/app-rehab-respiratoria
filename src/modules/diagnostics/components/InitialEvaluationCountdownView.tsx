import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors } from '@/src/shared/theme/wellness-theme';

type InitialEvaluationCountdownViewProps = {
  count: number;
};

export function InitialEvaluationCountdownView({ count }: InitialEvaluationCountdownViewProps) {
  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Comienza en</Text>
      <Animated.Text
        key={count}
        entering={ZoomIn.duration(280).springify()}
        exiting={FadeOut.duration(180)}
        style={styles.digit}
        accessibilityRole="text"
        accessibilityLabel={`${count}`}>
        {count}
      </Animated.Text>
      <Animated.Text entering={FadeIn.duration(400).delay(200)} style={styles.hint}>
        Prepárate
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: wellnessColors.primarySubtle,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: wellness.textSecondary,
    marginBottom: spacing.md,
    letterSpacing: 0.2,
  },
  digit: {
    fontSize: 96,
    lineHeight: 104,
    fontWeight: '800',
    color: wellness.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    color: wellness.primary,
  },
});
