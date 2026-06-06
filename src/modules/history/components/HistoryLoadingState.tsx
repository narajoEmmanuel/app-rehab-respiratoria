/**
 * Purpose: Loading placeholder for the history screen.
 * Module: history
 */

import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';

export function HistoryLoadingState() {
  return (
    <View style={styles.loadingBox}>
      <AppText variant="titleLarge" style={styles.screenTitle}>
        Tu historial
      </AppText>
      <AppText variant="bodyLarge" style={styles.tagline}>
        Cargando tu historial…
      </AppText>
      <ActivityIndicator size="large" color={wellness.primary} style={styles.loadingSpinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: 'flex-start',
    width: '100%',
  },
  screenTitle: {
    color: wellness.text,
    marginBottom: 2,
  },
  tagline: {
    color: wellness.textSecondary,
    marginBottom: spacing.sm,
  },
  loadingSpinner: {
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
});
