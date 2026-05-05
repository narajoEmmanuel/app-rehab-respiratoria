/**
 * Purpose: Tappable row for profile navigation actions.
 * Module: patient
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export type ProfileActionRowVariant = 'link' | 'primary' | 'neutral';

type ProfileActionRowProps = {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: ProfileActionRowVariant;
  showChevron?: boolean;
};

export function ProfileActionRow({
  label,
  onPress,
  accessibilityLabel,
  variant = 'link',
  showChevron = true,
}: ProfileActionRowProps) {
  const isLink = variant === 'link';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        isLink ? styles.pressLink : styles.pressBlock,
        variant === 'primary' && styles.primaryBlock,
        variant === 'neutral' && styles.neutralBlock,
        pressed && !isLink && styles.pressed,
      ]}>
      <View style={styles.row}>
        <Text
          style={[
            styles.label,
            isLink && styles.labelLink,
            variant === 'primary' && styles.labelPrimary,
            variant === 'neutral' && styles.labelNeutral,
          ]}>
          {label}
        </Text>
        {showChevron ? <Text style={[styles.chevron, isLink && styles.chevronLink]}>›</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressLink: {
    paddingVertical: spacing.sm,
  },
  pressBlock: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  primaryBlock: {
    backgroundColor: wellness.softGreen,
    borderColor: wellness.borderStrong,
  },
  neutralBlock: {
    backgroundColor: wellness.card,
  },
  pressed: {
    opacity: 0.88,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: wellness.text,
  },
  labelLink: {
    fontWeight: '700',
    color: wellness.primaryDark,
    textDecorationLine: 'underline',
  },
  labelPrimary: {
    color: wellness.primaryDark,
  },
  labelNeutral: {
    color: wellness.text,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    color: wellness.textSecondary,
    marginTop: -2,
  },
  chevronLink: {
    color: wellness.primaryDark,
  },
});
