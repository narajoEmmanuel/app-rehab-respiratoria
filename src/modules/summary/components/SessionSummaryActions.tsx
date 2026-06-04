/**
 * Purpose: Presentational CTAs for session summary screen.
 * Module: summary
 */
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/src/shared/ui/AppButton';
import { spacing } from '@/src/shared/theme/spacing';

export type SessionSummaryActionsProps = {
  onBackToTherapy: () => void;
  onViewHistory: () => void;
};

export function SessionSummaryActions({ onBackToTherapy, onViewHistory }: SessionSummaryActionsProps) {
  return (
    <View style={styles.wrap}>
      <AppButton title="Volver a Terapia" onPress={onBackToTherapy} variant="primary" />
      <AppButton title="Ver Historial" onPress={onViewHistory} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
});
