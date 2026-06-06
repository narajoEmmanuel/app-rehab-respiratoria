/**
 * Purpose: Compact summary of the patient's most recent therapy session for the home dashboard.
 * Module: home
 */

import { StyleSheet, View } from 'react-native';

import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { formatDisplayDateEs } from '@/src/modules/history/services/history-aggregates';
import { TARGET_ATTEMPTS } from '@/src/modules/session/session-progress-service';
import { describeSessionProgress } from '@/src/modules/session/patient-ui/session-progress-copy';
import { sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';
import { AppText } from '@/src/shared/ui/AppText';

type Props = {
  session: SessionRecord;
};

export function HomeLastSessionCard({ session }: Props) {
  const dayKey = sessionRecordLocalDayKey(session.session_date);
  const dateLabel = dayKey ? formatDisplayDateEs(dayKey) : 'Fecha no disponible';
  const statusLabel = session.interrupted ? 'Interrumpida' : session.completed ? 'Completada' : 'Sin completar';
  const volMax = session.max_volume > 0 ? `${Math.round(session.max_volume)} mL` : '—';
  const volAvg = session.avg_volume > 0 ? `${Math.round(session.avg_volume)} mL` : '—';
  const progress = describeSessionProgress({
    validAttempts: session.valid_attempts,
    targetAttempts: TARGET_ATTEMPTS,
    perfect: session.perfect,
    completed: session.completed,
    interrupted: session.interrupted,
  });

  return (
    <View style={styles.card} accessibilityRole="summary">
      <AppText variant="caption" style={styles.kicker}>
        Última sesión
      </AppText>
      <AppText variant="titleMedium" style={styles.title}>
        {dateLabel}
      </AppText>
      <AppText variant="bodySmall" style={styles.status}>
        {statusLabel}
      </AppText>
      <View style={styles.progressBlock}>
        <AppText variant="bodyLarge" style={styles.progressHeadline}>
          {progress.headline}
        </AppText>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress.progressRatio * 100)}%` }]} />
        </View>
        <AppText variant="caption" style={styles.progressMeta}>
          {session.valid_attempts} repeticiones válidas de {TARGET_ATTEMPTS}
        </AppText>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <AppText variant="label" style={styles.metricLabel}>
            Repeticiones válidas
          </AppText>
          <AppText variant="titleSmall" style={styles.metricValue}>
            {session.valid_attempts}
          </AppText>
        </View>
        <View style={styles.metric}>
          <AppText variant="label" style={styles.metricLabel}>
            Volumen máx. estimado
          </AppText>
          <AppText variant="titleSmall" style={styles.metricValue}>
            {volMax}
          </AppText>
        </View>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <AppText variant="label" style={styles.metricLabel}>
            Volumen prom. estimado
          </AppText>
          <AppText variant="titleSmall" style={styles.metricValue}>
            {volAvg}
          </AppText>
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
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  title: {
    fontWeight: '700',
    color: wellness.text,
    marginBottom: 2,
  },
  status: {
    color: wellness.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  progressBlock: {
    marginBottom: spacing.md,
  },
  progressHeadline: {
    fontWeight: '800',
    color: wellness.text,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8EDEA',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: wellness.primary,
  },
  progressMeta: {
    marginTop: spacing.sm,
    color: wellness.textSecondary,
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
    color: wellness.text,
  },
});
