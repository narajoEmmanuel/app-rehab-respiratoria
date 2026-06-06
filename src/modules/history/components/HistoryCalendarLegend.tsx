/**
 * Purpose: Expandable calendar color legend on the history screen.
 * Module: history
 */

import { Pressable, StyleSheet, View } from 'react-native';

import type { CalendarDayKind } from '@/src/modules/history/services/history-aggregates';
import { AppText } from '@/src/shared/ui/AppText';
import { wellness } from '@/src/shared/theme/wellness-theme';

const CAL_BG: Record<CalendarDayKind, string> = {
  none: '#E8EDEA',
  perfect: '#43A047',
  good: '#B8E0C0',
  incomplete: '#FFE082',
  interrupted: '#F5B4B4',
};
const CAL_BG_PRACTICE = '#B3E5FC';

const CALENDAR_LEGEND_PRIMARY: { color: string; label: string }[] = [
  { color: CAL_BG.perfect, label: 'Completada' },
  { color: CAL_BG.good, label: 'Parcial' },
  { color: CAL_BG.none, label: 'Sin actividad' },
];

const CALENDAR_LEGEND_EXTRA: { color: string; label: string }[] = [
  { color: CAL_BG.incomplete, label: 'Sesión incompleta' },
  { color: CAL_BG.interrupted, label: 'Interrumpida' },
  { color: CAL_BG_PRACTICE, label: 'Práctica (sin sensor)' },
];

type Props = {
  expanded: boolean;
  onToggle: () => void;
};

function LegendDot({ color, label, compact }: { color: string; label: string; compact?: boolean }) {
  if (compact) {
    return (
      <View style={styles.legendItemCompact}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <AppText variant="label" style={styles.legendLabelCompact}>
          {label}
        </AppText>
      </View>
    );
  }
  return (
    <View style={styles.legendItem}>
      <View style={styles.legendDotSlot}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
      </View>
      <AppText variant="caption" style={styles.legendLabel}>
        {label}
      </AppText>
    </View>
  );
}

export function HistoryCalendarLegend({ expanded, onToggle }: Props) {
  return (
    <View style={styles.legendContainer}>
      <View style={styles.legendPrimaryRow}>
        {CALENDAR_LEGEND_PRIMARY.map((item) => (
          <LegendDot key={item.label} color={item.color} label={item.label} compact />
        ))}
      </View>
      {expanded ? (
        <View style={styles.legendExtraBlock}>
          {CALENDAR_LEGEND_EXTRA.map((item) => (
            <LegendDot key={item.label} color={item.color} label={item.label} compact />
          ))}
        </View>
      ) : null}
      <Pressable onPress={onToggle} accessibilityRole="button" hitSlop={8}>
        <AppText variant="link" style={styles.legendMoreLink}>
          {expanded ? 'Ver menos estados' : 'Ver más estados'}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  legendContainer: {
    marginTop: 6,
    paddingTop: 4,
    gap: 4,
    alignSelf: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: wellness.border,
  },
  legendPrimaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  legendItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLabelCompact: {
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  legendExtraBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendMoreLink: {
    fontSize: 11,
    color: wellness.primaryDark,
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  legendDotSlot: {
    width: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    flexShrink: 1,
    color: wellness.textSecondary,
  },
});
