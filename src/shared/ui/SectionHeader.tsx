import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

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
        <AppText variant="titleMedium" style={styles.title}>
          {title}
        </AppText>
        {actionLabel && onActionPress ? (
          <Pressable
            onPress={onActionPress}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => pressed && styles.actionPressed}>
            <AppText variant="link" style={styles.actionLabel}>
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {subtitle ? (
        <AppText variant="bodyMedium" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
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
    color: wellnessColors.textSecondary,
  },
  actionLabel: {
    color: wellnessColors.primary,
  },
  actionPressed: {
    opacity: 0.7,
  },
});
