import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { wellnessColors, wellnessRadius } from '@/src/shared/theme/wellness-theme';

type MetricTileTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

type MetricTileProps = {
  label: string;
  value: string;
  helper?: string;
  iconName?: string;
  tone?: MetricTileTone;
};

const toneAccent: Record<MetricTileTone, string> = {
  default: wellnessColors.primaryDark,
  success: wellnessColors.success,
  warning: '#92400E',
  danger: wellnessColors.danger,
  info: wellnessColors.info,
};

const toneBg: Record<MetricTileTone, string> = {
  default: wellnessColors.primarySubtle,
  success: wellnessColors.successSoft,
  warning: wellnessColors.warningSoft,
  danger: wellnessColors.dangerSoft,
  info: wellnessColors.infoSoft,
};

export function MetricTile({ label, value, helper, iconName, tone = 'default' }: MetricTileProps) {
  return (
    <View style={[styles.tile, { backgroundColor: toneBg[tone] }]}>
      {iconName ? (
        <View style={styles.iconWrap}>
          <IconSymbol name={iconName as any} size={18} color={toneAccent[tone]} />
        </View>
      ) : null}
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: toneAccent[tone] }]}>{value}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    borderRadius: wellnessRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  iconWrap: {
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
  },
  helper: {
    marginTop: 4,
    fontSize: 11,
    color: wellnessColors.textMuted,
    lineHeight: 15,
  },
});
