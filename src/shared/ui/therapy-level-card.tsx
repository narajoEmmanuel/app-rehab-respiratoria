/**
 * Purpose: Level row card aligned with Home dashboard (flat border, light surface).
 * Module: shared/ui
 * Dependencies: typography, spacing, theme tokens
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import { fontBold, fontMedium, fontSemiBold } from '@/src/shared/theme/typography';
import { dashboardAccent, dashboardScreen } from '@/src/theme/dashboard-screen';

type TherapyLevelCardProps = {
  title: string;
  statusLabel: string;
  statusTone: 'active' | 'locked' | 'completed';
  targetVolumeText: string;
  sessionsText: string;
  helperText: string;
  locked: boolean;
  onPress: () => void;
};

export function TherapyLevelCard({
  title,
  statusLabel,
  statusTone,
  targetVolumeText,
  sessionsText,
  helperText,
  locked,
  onPress,
}: TherapyLevelCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        locked && styles.cardLocked,
        pressed && !locked && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button">
      <View style={styles.mainCol}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text
            style={[
              styles.statusPill,
              statusTone === 'completed'
                ? styles.pillCompleted
                : statusTone === 'locked'
                  ? styles.pillLocked
                  : styles.pillActive,
            ]}
            numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
        <Text style={styles.line}>{targetVolumeText}</Text>
        <Text style={styles.line}>{sessionsText}</Text>
        <Text style={styles.helper}>{helperText}</Text>
      </View>
      <View style={styles.ctaCol}>
        <View style={[styles.ctaBtn, locked ? styles.ctaBtnLocked : styles.ctaBtnPlay]}>
          <Text style={[styles.ctaBtnText, locked && styles.ctaBtnTextLocked]}>
            {locked ? 'Bloqueado' : 'Jugar'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    backgroundColor: dashboardScreen.cardBg,
    borderRadius: dashboardScreen.cardRadius,
    borderWidth: 1,
    borderColor: dashboardScreen.cardBorderColor,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardLocked: {
    opacity: 0.88,
    backgroundColor: '#FAFAFA',
  },
  cardPressed: {
    opacity: 0.94,
  },
  mainCol: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontFamily: fontBold,
    fontSize: 18,
    color: dashboardScreen.textPrimary,
    lineHeight: 24,
  },
  statusPill: {
    fontFamily: fontSemiBold,
    fontSize: 11,
    lineHeight: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    maxWidth: '42%',
    textAlign: 'center',
  },
  pillActive: {
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
    color: '#1F7E7A',
  },
  pillCompleted: {
    backgroundColor: 'rgba(44, 123, 229, 0.1)',
    color: '#1D4ED8',
  },
  pillLocked: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  line: {
    marginTop: 4,
    fontFamily: fontMedium,
    fontSize: 15,
    lineHeight: 21,
    color: dashboardScreen.textSecondary,
  },
  helper: {
    marginTop: spacing.xs,
    fontFamily: fontMedium,
    fontSize: 13,
    lineHeight: 18,
    color: dashboardScreen.textMuted,
  },
  ctaCol: {
    justifyContent: 'center',
    alignSelf: 'center',
  },
  ctaBtn: {
    minWidth: 102,
    minHeight: dashboardScreen.primaryButtonMinHeight,
    paddingHorizontal: spacing.md,
    borderRadius: dashboardScreen.primaryButtonRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnPlay: {
    backgroundColor: dashboardAccent,
  },
  ctaBtnLocked: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  ctaBtnText: {
    fontFamily: fontBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  ctaBtnTextLocked: {
    color: '#6B7280',
  },
});
