/**
 * Purpose: Summary card for the patient's most recent session on the history screen.
 * Module: history
 */

import { StyleSheet, View } from 'react-native';

import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';

function formatSessionDateTime(sessionDate: string): string {
  const parsed = Date.parse(sessionDate);
  if (Number.isNaN(parsed)) return 'Fecha no disponible';
  return new Date(parsed).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  session: SessionRecord;
  bestHoldSeconds: number | null;
  onViewDetail: () => void;
};

export function HistoryLastSessionCard({ session, bestHoldSeconds, onViewDetail }: Props) {
  const volMl =
    session.max_sensor_estimated_volume_ml != null && session.max_sensor_estimated_volume_ml > 0
      ? `${Math.round(session.max_sensor_estimated_volume_ml)} mL`
      : session.max_volume > 0
        ? `${Math.round(session.max_volume)} mL`
        : '—';
  const holdText =
    bestHoldSeconds != null && bestHoldSeconds > 0
      ? `${bestHoldSeconds.toFixed(1)} s`
      : session.avg_hold_seconds > 0
        ? `${session.avg_hold_seconds.toFixed(1)} s`
        : '—';

  return (
    <AppCard style={styles.lastSessionCard}>
      <AppText variant="titleMedium" style={styles.lastSessionTitle}>
        Última sesión
      </AppText>
      <AppText variant="statusValue" style={styles.lastSessionDate}>
        {formatSessionDateTime(session.session_date)}
      </AppText>
      <View style={styles.lastSessionMetrics}>
        <View style={styles.lastSessionMetric}>
          <AppText variant="caption" style={styles.lastSessionMetricLabel}>
            Repeticiones válidas
          </AppText>
          <AppText variant="titleSmall" style={styles.lastSessionMetricValue}>
            {session.valid_attempts}
          </AppText>
        </View>
        <View style={styles.lastSessionMetric}>
          <AppText variant="caption" style={styles.lastSessionMetricLabel}>
            Mejor volumen estimado
          </AppText>
          <AppText variant="titleSmall" style={styles.lastSessionMetricValue}>
            {volMl}
          </AppText>
        </View>
        <View style={styles.lastSessionMetric}>
          <AppText variant="caption" style={styles.lastSessionMetricLabel}>
            Tiempo sostenido
          </AppText>
          <AppText variant="titleSmall" style={styles.lastSessionMetricValue}>
            {holdText}
          </AppText>
        </View>
      </View>
      <AppButton title="Ver detalle" onPress={onViewDetail} variant="secondary" />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  lastSessionCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  lastSessionTitle: {
    color: wellness.text,
  },
  lastSessionDate: {
    fontWeight: '600',
    color: wellness.primaryDark,
  },
  lastSessionMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  lastSessionMetric: {
    minWidth: '30%',
    flexGrow: 1,
  },
  lastSessionMetricLabel: {
    color: wellness.textSecondary,
    marginBottom: 2,
  },
  lastSessionMetricValue: {
    color: wellness.text,
  },
});
