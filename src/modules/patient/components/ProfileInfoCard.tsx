/**
 * Purpose: Bordered card for grouped profile information.
 * Module: patient
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

type ProfileInfoCardProps = {
  title?: string;
  children: ReactNode;
};

export function ProfileInfoCard({ title, children }: ProfileInfoCardProps) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    ...wellnessShadows.card,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.text,
  },
  body: {
    gap: spacing.xs,
  },
});
