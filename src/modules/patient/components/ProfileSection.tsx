/**
 * Purpose: Section wrapper for profile hub (title + optional lead + content).
 * Module: patient
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';

type ProfileSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ProfileSection({ title, subtitle, children }: ProfileSectionProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.textSecondary,
    marginTop: -spacing.xs,
  },
  children: {
    gap: spacing.sm,
  },
});
