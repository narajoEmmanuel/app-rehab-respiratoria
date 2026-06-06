/**
 * Purpose: Page title and current-month chip on the history screen.
 * Module: history
 */

import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

type Props = {
  monthChipLabel: string;
};

function MonthChip({ label }: { label: string }) {
  return (
    <View style={styles.monthChip}>
      <AppText variant="chip" style={styles.monthChipText}>
        {label}
      </AppText>
    </View>
  );
}

export function HistoryPageHeader({ monthChipLabel }: Props) {
  return (
    <View style={styles.pageHeader}>
      <AppText variant="titleLarge" style={styles.pageTitle}>
        Mi progreso
      </AppText>
      <MonthChip label={monthChipLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    color: wellness.text,
    letterSpacing: -0.4,
    flexShrink: 0,
  },
  monthChip: {
    backgroundColor: '#F0F7F5',
    borderRadius: wellnessRadii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  monthChipText: {
    fontWeight: '600',
    color: wellness.primaryDark,
  },
});
