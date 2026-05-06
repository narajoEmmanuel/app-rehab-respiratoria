/**
 * Purpose: Level row card — nivel identity, accent stripe, estado chips (Terapia).
 * Module: shared/ui
 * Dependencies: typography, spacing, theme tokens, @expo/vector-icons
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import { fontBold, fontMedium, fontSemiBold } from '@/src/shared/theme/typography';
import { dashboardAccent, dashboardScreen } from '@/src/theme/dashboard-screen';

export type TherapyLevelStatusChip = 'completed' | 'in_progress' | 'available' | 'locked';

type TherapyLevelCardProps = {
  title: string;
  /** e.g. "Nivel 1 · Base" */
  levelIdentityLine: string;
  accentColor: string;
  identitySoftBg: string;
  statusChip: TherapyLevelStatusChip;
  motivationalCopy: string;
  targetVolumeText: string;
  sessionsText: string;
  helperText?: string;
  locked: boolean;
  onPress: () => void;
};

const ACCENT_STRIPE_WIDTH = 4;

const CHIP_THEME: Record<
  TherapyLevelStatusChip,
  { backgroundColor: string; color: string; borderColor: string }
> = {
  completed: {
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
    color: '#0F766E',
    borderColor: 'rgba(52, 171, 165, 0.28)',
  },
  in_progress: {
    backgroundColor: 'rgba(245, 184, 75, 0.14)',
    color: '#B45309',
    borderColor: 'rgba(245, 184, 75, 0.28)',
  },
  available: {
    backgroundColor: 'rgba(52, 171, 165, 0.1)',
    color: '#0F766E',
    borderColor: 'rgba(52, 171, 165, 0.22)',
  },
  locked: {
    backgroundColor: '#EFEFEF',
    color: '#6B7280',
    borderColor: '#E3E3E3',
  },
};

const CHIP_LABEL: Record<TherapyLevelStatusChip, string> = {
  completed: 'Completado',
  in_progress: 'En progreso',
  available: 'Disponible',
  locked: 'Bloqueado',
};

export function TherapyLevelCard({
  title,
  levelIdentityLine,
  accentColor,
  identitySoftBg,
  statusChip,
  motivationalCopy,
  targetVolumeText,
  sessionsText,
  helperText,
  locked,
  onPress,
}: TherapyLevelCardProps) {
  const chipStyle = CHIP_THEME[statusChip];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        locked && styles.cardLocked,
        pressed && !locked && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}>
      <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />
      <View style={styles.body}>
        <View style={styles.identityRow}>
          <View style={[styles.identityPill, { backgroundColor: identitySoftBg }]}>
            <Text style={[styles.identityPillText, { color: accentColor }]} numberOfLines={1}>
              {levelIdentityLine}
            </Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {statusChip === 'completed' ? (
            <MaterialIcons name="check-circle" size={22} color={accentColor} style={styles.titleIcon} />
          ) : null}
        </View>

        <View style={styles.chipRow}>
          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: chipStyle.backgroundColor,
                borderColor: chipStyle.borderColor,
              },
            ]}>
            <Text style={[styles.statusChipText, { color: chipStyle.color }]} numberOfLines={1}>
              {CHIP_LABEL[statusChip]}
            </Text>
          </View>
        </View>

        <Text style={styles.motivational}>{motivationalCopy}</Text>
        <Text style={styles.line}>{targetVolumeText}</Text>
        <Text style={styles.line}>{sessionsText}</Text>
        {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      </View>

      <View style={styles.ctaCol}>
        <View style={[styles.ctaBtn, locked ? styles.ctaBtnLocked : styles.ctaBtnPlay]}>
          <Text style={[styles.ctaBtnText, locked && styles.ctaBtnTextLocked]}>
            {locked ? 'Pendiente' : 'Jugar'}
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
    paddingVertical: spacing.lg,
    paddingRight: spacing.lg,
    paddingLeft: 0,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardLocked: {
    opacity: 0.92,
    backgroundColor: '#FAFAFA',
  },
  cardPressed: {
    opacity: 0.94,
  },
  accentStripe: {
    width: ACCENT_STRIPE_WIDTH,
    alignSelf: 'stretch',
    borderTopLeftRadius: dashboardScreen.cardRadius,
    borderBottomLeftRadius: dashboardScreen.cardRadius,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingLeft: spacing.sm,
  },
  identityRow: {
    marginBottom: spacing.xs,
  },
  identityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '100%',
  },
  identityPillText: {
    fontFamily: fontSemiBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  titleIcon: {
    marginTop: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusChipText: {
    fontFamily: fontSemiBold,
    fontSize: 11,
    lineHeight: 14,
  },
  motivational: {
    fontFamily: fontSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: dashboardScreen.textPrimary,
    marginBottom: spacing.xs,
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
    paddingRight: 0,
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
    backgroundColor: '#E8E8E8',
    borderWidth: 1,
    borderColor: '#DCDCDC',
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
