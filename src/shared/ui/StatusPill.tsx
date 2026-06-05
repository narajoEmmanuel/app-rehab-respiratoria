import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
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
      <AppText
        variant={isSm ? 'chipSmall' : 'chip'}
        style={{ color: toneFg[tone] }}>
        {label}
      </AppText>
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
});
