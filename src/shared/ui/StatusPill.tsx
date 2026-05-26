import { StyleSheet, Text, View } from 'react-native';

import { wellnessColors } from '@/src/shared/theme/wellness-theme';

type StatusPillTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
type StatusPillSize = 'sm' | 'md';

type StatusPillProps = {
  label: string;
  tone?: StatusPillTone;
  size?: StatusPillSize;
};

const toneBg: Record<StatusPillTone, string> = {
  success: wellnessColors.successSoft,
  warning: wellnessColors.warningSoft,
  danger: wellnessColors.dangerSoft,
  neutral: wellnessColors.neutralSoft,
  info: wellnessColors.infoSoft,
};

const toneFg: Record<StatusPillTone, string> = {
  success: wellnessColors.success,
  warning: '#92400E',
  danger: wellnessColors.danger,
  neutral: wellnessColors.neutral,
  info: wellnessColors.info,
};

export function StatusPill({ label, tone = 'neutral', size = 'md' }: StatusPillProps) {
  const isSm = size === 'sm';
  return (
    <View style={[styles.pill, { backgroundColor: toneBg[tone] }, isSm && styles.pillSm]}>
      <Text style={[styles.label, { color: toneFg[tone] }, isSm && styles.labelSm]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillSm: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  labelSm: {
    fontSize: 11,
  },
});
