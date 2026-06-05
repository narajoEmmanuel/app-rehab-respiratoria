/**
 * Purpose: Section wrapper for profile hub (title + optional lead + content).
 * Module: patient
 */

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';
import { AppText } from '@/src/shared/ui/AppText';

type ProfileSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ProfileSection({ title, subtitle, children }: ProfileSectionProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label" style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="bodySmall" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
      <View style={styles.children}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#111827',
  },
  subtitle: {
    color: wellness.textSecondary,
    marginTop: -spacing.xs,
  },
  children: {
    gap: spacing.sm,
  },
});
