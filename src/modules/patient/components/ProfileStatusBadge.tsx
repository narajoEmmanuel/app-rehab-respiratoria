/**
 * Purpose: Consent / status pill for profile header lines.
 * Module: patient
 */

import { StyleSheet, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';
import { AppText } from '@/src/shared/ui/AppText';

export type ProfileConsentBadgeVariant = 'active' | 'withdrawn' | 'unavailable';

type ProfileStatusBadgeProps = {
  label: string;
  variant: ProfileConsentBadgeVariant;
};

const variantStyles: Record<
  ProfileConsentBadgeVariant,
  { bg: string; text: string; border: string }
> = {
  active: {
    bg: wellness.successBg,
    text: wellness.primaryDark,
    border: 'rgba(52, 171, 165, 0.25)',
  },
  withdrawn: {
    bg: wellness.errorBg,
    text: wellness.errorText,
    border: 'rgba(140, 58, 66, 0.2)',
  },
  unavailable: {
    bg: wellness.screenBgAlt,
    text: wellness.textSecondary,
    border: wellness.border,
  },
};

export function ProfileStatusBadge({ label, variant }: ProfileStatusBadgeProps) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.pill, { backgroundColor: v.bg, borderColor: v.border }]}>
      <AppText variant="chip" style={[styles.pillText, { color: v.text }]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
