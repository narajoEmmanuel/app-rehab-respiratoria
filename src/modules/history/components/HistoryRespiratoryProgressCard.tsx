/**
 * Purpose: Respiratory progress metrics card on the history screen.
 * Module: history
 */

import { StyleSheet } from 'react-native';

import { HistoryMetricProgressRow } from '@/src/modules/history/components/HistoryMetricProgressRow';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';

type Props = {
  vimValueText: string;
  vimProgress: number;
  sustainValueText: string;
  sustainProgress: number;
  adherenceValueText: string;
  adherenceProgress: number;
  hasRespiratoryMetrics: boolean;
};

export function HistoryRespiratoryProgressCard({
  vimValueText,
  vimProgress,
  sustainValueText,
  sustainProgress,
  adherenceValueText,
  adherenceProgress,
  hasRespiratoryMetrics,
}: Props) {
  return (
    <AppCard style={styles.metricsCard}>
      <AppText variant="titleMedium" style={styles.metricsTitle}>
        Progreso respiratorio
      </AppText>
      <HistoryMetricProgressRow
        label="Mejor volumen estimado"
        valueText={vimValueText}
        progress={vimProgress}
        showTrack={hasRespiratoryMetrics}
      />
      <HistoryMetricProgressRow
        label="Tiempo sostenido promedio"
        valueText={sustainValueText}
        progress={sustainProgress}
        showTrack={hasRespiratoryMetrics}
      />
      <HistoryMetricProgressRow
        label="Cumplimiento semanal"
        valueText={adherenceValueText}
        progress={adherenceProgress}
        showTrack
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  metricsCard: {
    marginBottom: spacing.md,
  },
  metricsTitle: {
    color: wellness.text,
    marginBottom: spacing.md,
  },
});
