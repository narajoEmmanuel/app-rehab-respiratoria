import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { wellnessColors, wellnessRadius } from '@/src/shared/theme/wellness-theme';

type MetricTileTone = 'default' | 'success' | 'warning' | 'danger' | 'info';
type MetricTileSize = 'compact' | 'default' | 'large';
type MetricTileEmphasis = 'metric' | 'status';

type MetricTileProps = {
  label: string;
  value: string;
  helper?: string;
  iconName?: string;
  tone?: MetricTileTone;
  size?: MetricTileSize;
  emphasis?: MetricTileEmphasis;
  valueNumberOfLines?: number;
  labelNumberOfLines?: number;
  /** Override accent/value color (e.g. level-specific accent). */
  overrideAccent?: string;
  /** Override tile background (e.g. level-specific soft tint). */
  overrideBg?: string;
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

function getValueFontSize(size: MetricTileSize, emphasis: MetricTileEmphasis): number {
  if (emphasis === 'status') {
    return size === 'large' ? 18 : size === 'compact' ? 15 : 16;
  }
  if (size === 'large') return 30;
  if (size === 'compact') return 18;
  return 22;
}

export function MetricTile({
  label,
  value,
  helper,
  iconName,
  tone = 'default',
  size = 'default',
  emphasis = 'metric',
  valueNumberOfLines = 1,
  labelNumberOfLines = 2,
  overrideAccent,
  overrideBg,
}: MetricTileProps) {
  const isCompact = size === 'compact';
  const isLarge = size === 'large';
  const isStatus = emphasis === 'status';
  const valueFontSize = getValueFontSize(size, emphasis);
  const resolvedAccent = overrideAccent ?? toneAccent[tone];
  const resolvedBg = overrideBg ?? toneBg[tone];

  return (
    <View style={[styles.tile, { backgroundColor: resolvedBg }, isCompact && styles.tileCompact, isLarge && styles.tileLarge]}>
      {iconName ? (
        <View style={styles.iconWrap}>
          <IconSymbol name={iconName as any} size={isCompact ? 15 : 17} color={resolvedAccent} />
        </View>
      ) : null}
      <AppText
        variant={isStatus ? 'statusValue' : 'metricMedium'}
        style={[
          styles.value,
          { color: resolvedAccent, fontSize: valueFontSize },
          isStatus && styles.valueStatus,
          isLarge && styles.valueLarge,
        ]}
        numberOfLines={valueNumberOfLines}
        adjustsFontSizeToFit={isCompact}>
        {value}
      </AppText>
      <AppText
        variant="label"
        style={[
          styles.label,
          isCompact && styles.labelCompact,
          isLarge && styles.labelLarge,
        ]}
        numberOfLines={labelNumberOfLines}>
        {label}
      </AppText>
      {helper ? (
        <AppText variant="label" style={styles.helper} numberOfLines={2}>
          {helper}
        </AppText>
      ) : null}
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
  tileCompact: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tileLarge: {
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  iconWrap: {
    marginBottom: 5,
  },
  value: {
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  valueStatus: {
    fontWeight: '700',
    letterSpacing: 0,
  },
  valueLarge: {
    letterSpacing: -0.3,
  },
  label: {
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    letterSpacing: 0.1,
  },
  labelCompact: {
    fontSize: 10.5,
  },
  labelLarge: {
    fontSize: 12,
    letterSpacing: 0.15,
  },
  helper: {
    marginTop: 3,
    fontWeight: '400',
    color: wellnessColors.textMuted,
    lineHeight: 15,
  },
});
