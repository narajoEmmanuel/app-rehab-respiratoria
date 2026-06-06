/**
 * Purpose: Monthly activity calendar with day cells on the history screen.
 * Module: history
 */

import { Pressable, StyleSheet, View } from 'react-native';

import { HistoryCalendarLegend } from '@/src/modules/history/components/HistoryCalendarLegend';
import {
  classifyCalendarDay,
  type CalendarDayKind,
} from '@/src/modules/history/services/history-aggregates';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';

const CAL_BG: Record<CalendarDayKind, string> = {
  none: '#E8EDEA',
  perfect: '#43A047',
  good: '#B8E0C0',
  incomplete: '#FFE082',
  interrupted: '#F5B4B4',
};
const CAL_BG_PRACTICE = '#B3E5FC';

const WEEK_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const CALENDAR_DAY_HEIGHT = 34;

type Props = {
  monthChipLabel: string;
  compactMonthCells: (string | null)[];
  byDay: Map<string, SessionRecord[]>;
  practiceDayKeys: Set<string>;
  todayKey: string;
  selectedDateKey: string | null;
  legendExpanded: boolean;
  onShiftMonth: (delta: number) => void;
  onOpenDay: (dateKey: string) => void;
  onToggleLegend: () => void;
};

export function HistoryCalendarCard({
  monthChipLabel,
  compactMonthCells,
  byDay,
  practiceDayKeys,
  todayKey,
  selectedDateKey,
  legendExpanded,
  onShiftMonth,
  onOpenDay,
  onToggleLegend,
}: Props) {
  return (
    <>
      <AppText variant="titleMedium" style={styles.sectionTitle}>
        Calendario de actividad
      </AppText>
      <AppText variant="bodySmall" style={styles.sectionSubtitle}>
        Revisa tus sesiones registradas por día.
      </AppText>

      <AppCard style={styles.calendarCard}>
        <View style={styles.monthNav}>
          <Pressable
            onPress={() => onShiftMonth(-1)}
            style={styles.monthNavBtn}
            accessibilityRole="button"
            accessibilityLabel="Mes anterior">
            <AppText variant="metric" style={styles.monthNavBtnText}>
              ‹
            </AppText>
          </Pressable>
          <AppText variant="statusValue" style={styles.monthTitle}>
            {monthChipLabel}
          </AppText>
          <Pressable
            onPress={() => onShiftMonth(1)}
            style={styles.monthNavBtn}
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente">
            <AppText variant="metric" style={styles.monthNavBtnText}>
              ›
            </AppText>
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {WEEK_LABELS.map((w, i) => (
            <View key={`w-${i}`} style={styles.weekCell}>
              <AppText variant="label" style={styles.weekCellText}>
                {w}
              </AppText>
            </View>
          ))}
        </View>
        <View style={styles.grid}>
          {compactMonthCells.map((dateKey, idx) => {
            if (!dateKey) {
              return <View key={`e-${idx}`} style={styles.dayCellEmpty} />;
            }
            const list = byDay.get(dateKey) ?? [];
            const kind = list.length === 0 ? 'none' : classifyCalendarDay(list);
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDateKey;
            const hasPracticeOnly = kind === 'none' && practiceDayKeys.has(dateKey);
            const inactive = kind === 'none' && !hasPracticeOnly;
            return (
              <Pressable
                key={dateKey}
                onPress={() => onOpenDay(dateKey)}
                style={[
                  styles.dayCell,
                  { backgroundColor: hasPracticeOnly ? CAL_BG_PRACTICE : CAL_BG[kind] },
                  inactive && styles.dayCellInactive,
                  isToday && styles.dayCellToday,
                  isSelected && styles.dayCellSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Día ${dateKey}`}>
                <AppText
                  variant="chip"
                  style={[
                    styles.dayCellNum,
                    inactive && styles.dayCellNumMuted,
                    (kind === 'perfect' || kind === 'good') && styles.dayCellNumOnColor,
                  ]}>
                  {Number(dateKey.slice(8, 10))}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <HistoryCalendarLegend expanded={legendExpanded} onToggle={onToggleLegend} />
      </AppCard>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: wellness.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: wellness.textSecondary,
    marginBottom: spacing.sm,
  },
  calendarCard: {
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  monthNavBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F0F7F5',
  },
  monthNavBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: wellness.primaryDark,
    lineHeight: 28,
  },
  monthTitle: {
    color: wellness.text,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekCellText: {
    color: wellness.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: CALENDAR_DAY_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 2,
  },
  dayCellInactive: {
    backgroundColor: '#EEF2F0',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: CALENDAR_DAY_HEIGHT,
    marginBottom: 2,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: wellness.primary,
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: wellness.primaryDark,
  },
  dayCellNum: {
    color: '#37474F',
  },
  dayCellNumMuted: {
    color: '#B0BEC5',
    fontWeight: '600',
  },
  dayCellNumOnColor: {
    color: '#1B5E20',
  },
});
