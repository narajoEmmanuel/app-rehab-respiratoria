/**
 * Purpose: Compact horizontal card for the next scheduled reminder — or day completed.
 * Module: notifications
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  areAllRemindersCompletedToday,
  findNextReminderTime,
  formatMinutesUntilReminder,
} from '@/src/modules/notifications/components/reminder-schedule-display';
import { reminderUi } from '@/src/modules/notifications/components/reminder-ui-tokens';
import {
  DAY_COMPLETED_MESSAGE,
  DAY_COMPLETED_TITLE,
} from '@/src/modules/notifications/notification-copy';
import { AppText } from '@/src/shared/ui/AppText';
import { wellness, wellnessShadows } from '@/src/shared/theme/wellness-theme';

export type NextReminderCardProps = {
  times: readonly string[];
  dimmed?: boolean;
};

function DayCompletedCard({ dimmed }: { dimmed?: boolean }) {
  return (
    <View style={[styles.card, styles.completedCard, dimmed && styles.dimmed]}>
      <AppText variant="caption" style={styles.label}>
        Hoy completado
      </AppText>
      <AppText variant="titleLarge" style={styles.completedHeadline}>
        {DAY_COMPLETED_TITLE}
      </AppText>
      <AppText variant="bodyMedium" style={styles.completedMessage}>
        {DAY_COMPLETED_MESSAGE}
      </AppText>
    </View>
  );
}

export function NextReminderCard({ times, dimmed }: NextReminderCardProps) {
  const nextTime = useMemo(() => findNextReminderTime(times), [times]);
  const allCompleted = useMemo(() => areAllRemindersCompletedToday(times), [times]);
  const countdown = nextTime ? formatMinutesUntilReminder(nextTime) : null;

  if (times.length === 0) return null;

  if (allCompleted) {
    return <DayCompletedCard dimmed={dimmed} />;
  }

  if (!nextTime) return null;

  return (
    <View style={[styles.card, dimmed && styles.dimmed]}>
      <View style={styles.bellCircle}>
        <MaterialIcons name="notifications-none" size={28} color={reminderUi.teal} />
      </View>
      <View style={styles.textCol}>
        <AppText variant="caption" style={styles.label}>
          Siguiente aviso
        </AppText>
        <AppText variant="metricLarge" style={styles.time}>
          {nextTime}
        </AppText>
        {countdown ? (
          <AppText variant="bodyMedium" style={styles.countdown}>
            {countdown}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    borderRadius: reminderUi.cardRadius,
    borderWidth: 1,
    borderColor: reminderUi.mintBorder,
    backgroundColor: wellness.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 104,
    ...wellnessShadows.soft,
  },
  dimmed: {
    opacity: 0.55,
  },
  bellCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: reminderUi.bellCircle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  completedCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 18,
  },
  textCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    letterSpacing: 0.35,
    color: reminderUi.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  time: {
    fontSize: 36,
    color: reminderUi.teal,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    lineHeight: 40,
    textAlign: 'center',
  },
  completedHeadline: {
    fontSize: 24,
    color: reminderUi.teal,
    letterSpacing: -0.3,
    lineHeight: 30,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  countdown: {
    fontWeight: '500',
    color: reminderUi.textSecondary,
    marginTop: 0,
    lineHeight: 20,
    textAlign: 'center',
  },
  completedMessage: {
    fontWeight: '500',
    color: reminderUi.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 8,
  },
});
