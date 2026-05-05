/**
 * Purpose: Compact summary of the patient's most recent therapy session for the home dashboard.
 * Module: home
 */

import { StyleSheet, Text, View } from 'react-native';

import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { formatDisplayDateEs } from '@/src/modules/history/services/history-aggregates';
import { sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';

type Props = {
  session: SessionRecord;
};

export function HomeLastSessionCard({ session }: Props) {
  const dayKey = sessionRecordLocalDayKey(session.session_date);
  const dateLabel = dayKey ? formatDisplayDateEs(dayKey) : 'Fecha no disponible';
  const statusLabel = session.interrupted ? 'Interrumpida' : session.completed ? 'Completada' : 'Sin completar';
  const volMax = session.max_volume > 0 ? `${Math.round(session.max_volume)} ml` : '—';
  const volAvg = session.avg_volume > 0 ? `${Math.round(session.avg_volume)} ml` : '—';

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.kicker}>Última sesión</Text>
      <Text style={styles.title}>{dateLabel}</Text>
      <Text style={styles.status}>{statusLabel}</Text>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Cumplimiento</Text>
          <Text style={styles.metricValue}>{Math.round(session.compliance_percent)}%</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Repeticiones válidas</Text>
          <Text style={styles.metricValue}>{session.valid_attempts}</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Volumen máx.</Text>
          <Text style={styles.metricValue}>{volMax}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Volumen prom.</Text>
          <Text style={styles.metricValue}>{volAvg}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: wellness.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: wellness.text,
    marginBottom: 2,
  },
  status: {
    fontSize: 14,
    color: wellness.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metric: { flex: 1 },
  metricLabel: {
    fontSize: 12,
    color: wellness.textSecondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.text,
  },
});
