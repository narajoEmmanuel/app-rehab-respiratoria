import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { wellnessColors, wellnessRadius } from '@/src/shared/theme/wellness-theme';

type InfoTileTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type InfoTileProps = {
  label: string;
  value: string;
  helper?: string;
  tone?: InfoTileTone;
  iconName?: string;
  compact?: boolean;
};

const toneBg: Record<InfoTileTone, string> = {
  neutral: wellnessColors.neutralSoft,
  info: wellnessColors.infoSoft,
  success: wellnessColors.successSoft,
  warning: wellnessColors.warningSoft,
  danger: wellnessColors.dangerSoft,
};

const toneFg: Record<InfoTileTone, string> = {
  neutral: wellnessColors.textPrimary,
  info: wellnessColors.info,
  success: wellnessColors.success,
  warning: '#92400E',
  danger: wellnessColors.danger,
};

const toneIconFg: Record<InfoTileTone, string> = {
  neutral: wellnessColors.textSecondary,
  info: wellnessColors.info,
  success: wellnessColors.success,
  warning: '#92400E',
  danger: wellnessColors.danger,
};

export function InfoTile({ label, value, helper, tone = 'neutral', iconName, compact }: InfoTileProps) {
  return (
    <View style={[styles.tile, { backgroundColor: toneBg[tone] }, compact && styles.tileCompact]}>
      {iconName ? (
        <View style={styles.iconWrap}>
          <IconSymbol name={iconName as any} size={compact ? 14 : 15} color={toneIconFg[tone]} />
        </View>
      ) : null}
      <Text
        style={[styles.value, { color: toneFg[tone] }, compact && styles.valueCompact]}
        numberOfLines={2}>
        {value}
      </Text>
      <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={2}>
        {label}
      </Text>
      {helper ? <Text style={styles.helper} numberOfLines={2}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    borderRadius: wellnessRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  tileCompact: {
    paddingVertical: 8,
    paddingHorizontal: 9,
  },
  iconWrap: {
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
    lineHeight: 20,
  },
  valueCompact: {
    fontSize: 14,
    lineHeight: 19,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    letterSpacing: 0.1,
  },
  labelCompact: {
    fontSize: 10.5,
  },
  helper: {
    marginTop: 3,
    fontSize: 11,
    color: wellnessColors.textMuted,
    lineHeight: 15,
  },
});
