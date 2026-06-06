/**
 * Purpose: Today's reminder timeline — progress row with alarm states.
 * Module: notifications
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  findNextReminderTime,
  getReminderTimelineSlotState,
} from '@/src/modules/notifications/components/reminder-schedule-display';
import { reminderUi } from '@/src/modules/notifications/components/reminder-ui-tokens';
import { AppText } from '@/src/shared/ui/AppText';
import { wellness, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const SLOT_SIZE = 44;
const SLOT_SIZE_NEXT = 48;
const SLOT_ITEM_WIDTH = 56;
const CIRCLE_ROW_HEIGHT = SLOT_SIZE_NEXT;
const TIMELINE_PAD_H = 14;
const SLOT_GAP = 12;

export type TodayReminderTimelineProps = {
  times: readonly string[];
  dimmed?: boolean;
};

function slotCircleCenterY(): number {
  return CIRCLE_ROW_HEIGHT / 2 - 1;
}

function SlotIcon({ state }: { state: 'passed' | 'next' | 'upcoming' }) {
  if (state === 'next') {
    return <MaterialIcons name="notifications-none" size={19} color="#FFFFFF" />;
  }
  if (state === 'passed') {
    return <MaterialIcons name="notifications-none" size={15} color="#FFFFFF" />;
  }
  return <MaterialIcons name="notifications-none" size={14} color={reminderUi.alarmMuted} />;
}

function computeProgressRatio(times: readonly string[], nextTime: string | null): number {
  if (times.length === 0) return 0;
  if (!nextTime) return 1;
  const nextIndex = times.indexOf(nextTime);
  if (nextIndex < 0) return 1;
  return (nextIndex + 0.5) / times.length;
}

export function TodayReminderTimeline({ times, dimmed }: TodayReminderTimelineProps) {
  const nextTime = useMemo(() => findNextReminderTime(times), [times]);
  const progressRatio = useMemo(
    () => computeProgressRatio(times, nextTime),
    [times, nextTime],
  );
  const progressLineTop = slotCircleCenterY();

  return (
    <View style={[styles.section, dimmed && styles.dimmed]}>
      <AppText variant="titleSmall" style={styles.title}>
        Avisos de hoy
      </AppText>
      <AppText variant="bodySmall" style={styles.subtitle}>
        Horarios programados para hoy.
      </AppText>

      <View style={styles.card}>
        {times.length > 0 ? (
          <View style={styles.timelineWrap}>
            <View
              style={[
                styles.progressTrack,
                { top: progressLineTop, left: TIMELINE_PAD_H + SLOT_ITEM_WIDTH / 2 },
              ]}
              pointerEvents="none">
              <View style={styles.progressLinePending} />
              <View style={[styles.progressLineDone, { width: `${progressRatio * 100}%` }]} />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineRow}>
              {times.map((time) => {
                const state = getReminderTimelineSlotState(time, nextTime);
                const isNext = state === 'next';
                const isPassed = state === 'passed';
                const isUpcoming = state === 'upcoming';

                return (
                  <View key={time} style={[styles.slot, isPassed && styles.slotPassed]}>
                    <View style={styles.circleRow}>
                      {isNext ? <View style={styles.slotHalo} pointerEvents="none" /> : null}
                      <View
                        style={[
                          styles.slotCircle,
                          isNext && styles.slotCircleNext,
                          isPassed && styles.slotCirclePassed,
                          isUpcoming && styles.slotCircleUpcoming,
                        ]}>
                        <SlotIcon state={state} />
                      </View>
                    </View>
                    <AppText
                      variant="caption"
                      style={[
                        styles.slotTime,
                        isNext && styles.slotTimeNext,
                        isPassed && styles.slotTimePassed,
                        isUpcoming && styles.slotTimeUpcoming,
                      ]}>
                      {time}
                    </AppText>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <AppText variant="bodySmall" style={styles.empty}>
            Configura tu horario despierto para ver los avisos de hoy.
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  dimmed: {
    opacity: 0.55,
  },
  title: {
    fontSize: 17,
    color: reminderUi.textPrimary,
  },
  subtitle: {
    color: reminderUi.textSecondary,
  },
  card: {
    borderRadius: reminderUi.cardRadius,
    borderWidth: 1,
    borderColor: reminderUi.mintBorder,
    backgroundColor: wellness.card,
    paddingVertical: 18,
    paddingHorizontal: 16,
    overflow: 'hidden',
    ...wellnessShadows.soft,
  },
  timelineWrap: {
    position: 'relative',
    minHeight: CIRCLE_ROW_HEIGHT + 32,
  },
  progressTrack: {
    position: 'absolute',
    right: TIMELINE_PAD_H + SLOT_ITEM_WIDTH / 2,
    height: 2,
    zIndex: 0,
  },
  progressLinePending: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: reminderUi.timelineProgressPending,
    borderRadius: 1,
  },
  progressLineDone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: reminderUi.timelineProgressDone,
    borderRadius: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SLOT_GAP,
    paddingHorizontal: TIMELINE_PAD_H,
    paddingVertical: 4,
    zIndex: 1,
  },
  slot: {
    width: SLOT_ITEM_WIDTH,
    alignItems: 'center',
    gap: 8,
  },
  slotPassed: {
    opacity: 0.92,
  },
  circleRow: {
    width: SLOT_ITEM_WIDTH,
    height: CIRCLE_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotHalo: {
    position: 'absolute',
    width: SLOT_SIZE_NEXT + 6,
    height: SLOT_SIZE_NEXT + 6,
    borderRadius: (SLOT_SIZE_NEXT + 6) / 2,
    backgroundColor: reminderUi.timelineNextHalo,
  },
  slotCircle: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: reminderUi.timelineUpcomingBg,
  },
  slotCircleNext: {
    width: SLOT_SIZE_NEXT,
    height: SLOT_SIZE_NEXT,
    borderRadius: SLOT_SIZE_NEXT / 2,
    backgroundColor: reminderUi.teal,
    borderWidth: 0,
    shadowColor: reminderUi.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    elevation: 3,
  },
  slotCirclePassed: {
    backgroundColor: reminderUi.timelinePassedBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  slotCircleUpcoming: {
    backgroundColor: reminderUi.timelineUpcomingBg,
    borderWidth: 1.5,
    borderColor: reminderUi.timelineUpcomingBorder,
  },
  slotTime: {
    color: reminderUi.timelineUpcomingTime,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    width: '100%',
  },
  slotTimeNext: {
    color: reminderUi.teal,
    fontWeight: '800',
    fontSize: 14,
  },
  slotTimePassed: {
    color: reminderUi.timelinePassedTime,
    fontWeight: '700',
    fontSize: 12,
  },
  slotTimeUpcoming: {
    color: reminderUi.timelineUpcomingTime,
    fontWeight: '500',
  },
  empty: {
    fontSize: 13,
    lineHeight: 18,
    color: reminderUi.textSecondary,
    textAlign: 'center',
  },
});
