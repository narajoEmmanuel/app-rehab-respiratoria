/**
 * Purpose: Placeholder when no active patient is associated.
 * Module: history
 */

import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export function HistoryNoPatientState() {
  return (
    <View style={styles.emptyCard}>
      <AppText variant="titleLarge" style={styles.screenTitle}>
        Tu historial
      </AppText>
      <AppText variant="bodyLarge" style={styles.tagline}>
        Asocia un perfil de paciente para ver tu historial, calendario y logros.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  screenTitle: {
    color: wellness.text,
    marginBottom: 2,
  },
  tagline: {
    color: wellness.textSecondary,
    marginBottom: spacing.sm,
  },
});
