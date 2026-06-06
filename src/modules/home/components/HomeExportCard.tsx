/**
 * Purpose: Clinical data export CTA card on the home dashboard footer.
 * Module: home
 */

import { StyleSheet, View } from 'react-native';

import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

const ACCENT = wellnessColors.primary;

type Props = {
  onPress: () => void;
};

export function HomeExportCard({ onPress }: Props) {
  return (
    <AppCard pressable onPress={onPress} style={styles.exportCardProminent}>
      <View style={styles.exportCardTopRow}>
        <View style={styles.exportCardIconWrap}>
          <IconSymbol name="doc.text.fill" size={22} color={ACCENT} />
        </View>
        <View style={styles.exportCardTextCol}>
          <AppText variant="label" style={styles.exportCardKicker}>
            Seguimiento clínico
          </AppText>
          <AppText variant="titleSmall" style={styles.exportCardTitle}>
            Resumen para tu profesional
          </AppText>
          <AppText variant="bodySmall" style={styles.exportCardBody}>
            Exporta tus sesiones y progreso para compartirlos.
          </AppText>
        </View>
      </View>
      <View style={styles.exportCardCtaRow}>
        <AppText variant="statusValue" style={styles.exportCardCtaText}>
          Exportar resumen
        </AppText>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  exportCardProminent: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  exportCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  exportCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: wellnessColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportCardTextCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
  },
  exportCardKicker: {
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  exportCardTitle: {
    fontSize: 17,
    color: wellnessColors.textPrimary,
    marginBottom: 4,
  },
  exportCardBody: {
    color: wellnessColors.textSecondary,
  },
  exportCardCtaRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: wellnessColors.border,
  },
  exportCardCtaText: {
    color: ACCENT,
    textAlign: 'center',
  },
});
