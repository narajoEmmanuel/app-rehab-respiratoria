/**
 * Purpose: Clinical report export section on the history screen.
 * Module: history
 */

import { StyleSheet } from 'react-native';

import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors } from '@/src/shared/theme/wellness-theme';

type Props = {
  hasAnyHistory: boolean;
  onExport: () => void;
};

export function HistoryExportCard({ hasAnyHistory, onExport }: Props) {
  return (
    <>
      <AppText variant="titleMedium" style={styles.sectionTitle}>
        Reporte para profesional
      </AppText>
      <AppCard style={styles.exportSection}>
        <AppText variant="bodySmall" style={styles.exportSectionBody}>
          Exporta tus sesiones, cumplimiento y progreso.
        </AppText>
        {!hasAnyHistory ? (
          <AppText variant="bodySmall" style={styles.exportHint}>
            Disponible después de tu primera sesión.
          </AppText>
        ) : null}
        <AppButton
          title="Exportar reporte"
          onPress={onExport}
          variant="secondary"
          iconName="doc.text.fill"
        />
      </AppCard>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: wellness.text,
    marginBottom: 4,
  },
  exportSection: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  exportHint: {
    color: wellness.textSecondary,
    fontStyle: 'italic',
  },
  exportSectionBody: {
    color: wellnessColors.textSecondary,
  },
});
