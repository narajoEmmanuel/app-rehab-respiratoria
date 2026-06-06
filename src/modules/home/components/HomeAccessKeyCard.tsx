/**
 * Purpose: Patient access key display in the home dashboard footer.
 * Module: home
 */

import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

type Props = {
  clave: string;
};

export function HomeAccessKeyCard({ clave }: Props) {
  return (
    <View style={styles.claveRow}>
      <AppText variant="label" style={styles.claveLabel}>
        Tu clave de acceso
      </AppText>
      <AppText variant="titleSmall" style={styles.claveValue}>
        {clave}
      </AppText>
      <AppText variant="caption" style={styles.claveHint}>
        Guárdala para volver a entrar.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  claveRow: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: wellnessColors.border,
  },
  claveLabel: {
    fontWeight: '600',
    color: wellnessColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  claveValue: {
    fontSize: 18,
    color: wellnessColors.textPrimary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  claveHint: {
    color: wellnessColors.textMuted,
    lineHeight: 16,
    fontWeight: '400',
  },
});
