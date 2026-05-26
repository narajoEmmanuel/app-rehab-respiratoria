import { Pressable, StyleSheet, Text, View } from 'react-native';

import { wellnessColors, wellnessTypography } from '@/src/shared/theme/wellness-theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, subtitle, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={[styles.title, wellnessTypography.sectionTitle]}>{title}</Text>
        {actionLabel && onActionPress ? (
          <Pressable
            onPress={onActionPress}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => pressed && styles.actionPressed}>
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: wellnessColors.textPrimary,
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 21,
    color: wellnessColors.textSecondary,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: wellnessColors.primary,
  },
  actionPressed: {
    opacity: 0.7,
  },
});
