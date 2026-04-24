/**
 * Purpose: Difficulty level selection base screen.
 * Module: levels
 * Dependencies: react-native, wellness theme
 * Notes: Level and game type are intentionally separated.
 */
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export function LevelsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.inner}>
        <Text style={styles.title}>Niveles</Text>
        <Text style={styles.text}>Selección de nivel (base).</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellness.screenBg,
    paddingBottom: wellnessFloatingTabBarInset,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: wellness.text,
    marginBottom: spacing.md,
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    color: wellness.textSecondary,
    maxWidth: 320,
    backgroundColor: wellness.card,
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
  },
});
