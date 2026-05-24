/**
 * Purpose: Level row card — nivel identity, accent stripe, estado chips (Terapia).
 * Module: shared/ui
 * Dependencies: typography, spacing, theme tokens, @expo/vector-icons
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

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
  /** Meta VIM aproximada (mL) — solo presentación. */
  targetVolumeMl: number;
  /** Conteo mostrado en card (p. ej. 5/6); el padre arma el valor. */
  completedSessionsDisplay: string;
  perfectSessionsDisplay: string;
  helperText?: string;
  locked: boolean;
  starting?: boolean;
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
  targetVolumeMl,
  completedSessionsDisplay,
  perfectSessionsDisplay,
  helperText,
  locked,
  starting = false,
  onPress,
}: TherapyLevelCardProps) {
  const chipStyle = CHIP_THEME[statusChip];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        locked && styles.cardLocked,
        pressed && !locked && !starting && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={locked || starting}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked || starting }}>
      <View style={[styles.accentStripe, { backgroundColor: accentColor }]} />
      <View style={styles.body}>
        <View style={styles.identityRow}>
          <View style={[styles.identityPill, { backgroundColor: identitySoftBg }]}>
            <Text style={[styles.identityPillText, { color: accentColor }]} numberOfLines={1}>
              {levelIdentityLine}
            </Text>
          </View>
        </View>

        <View style={styles.titleChipRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.titleStatusGroup}>
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
            {statusChip === 'completed' ? (
              <MaterialIcons name="check-circle" size={18} color={accentColor} />
            ) : null}
          </View>
        </View>

        <Text style={styles.motivational} numberOfLines={2}>
          {motivationalCopy}
        </Text>
        <View style={styles.metricsBlock}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Meta aprox:</Text>
            <Text style={styles.metricValue}>{targetVolumeMl} mL</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Completadas hoy:</Text>
            <Text style={styles.metricValue}>{completedSessionsDisplay}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Perfectas:</Text>
            <Text style={styles.metricValue}>{perfectSessionsDisplay}</Text>
          </View>
        </View>
        {helperText ? (
          <Text style={styles.helper} numberOfLines={2}>
            {helperText}
          </Text>
        ) : null}
      </View>

      <View style={styles.ctaCol}>
        <View style={[styles.ctaBtn, locked ? styles.ctaBtnLocked : styles.ctaBtnPlay]}>
          {starting ? (
            <ActivityIndicator color={locked ? '#6B7280' : '#FFFFFF'} size="small" />
          ) : (
            <Text style={[styles.ctaBtnText, locked && styles.ctaBtnTextLocked]}>
              {locked ? 'Pendiente' : 'Jugar nivel'}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: dashboardScreen.cardBg,
    borderRadius: dashboardScreen.cardRadius,
    borderWidth: 1,
    borderColor: dashboardScreen.cardBorderColor,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    paddingLeft: 0,
    marginBottom: spacing.sm,
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
    flexShrink: 1,
    minWidth: 0,
    paddingLeft: spacing.sm,
    paddingVertical: 2,
    paddingRight: spacing.xs,
  },
  identityRow: {
    marginBottom: 4,
  },
  identityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: '100%',
  },
  identityPillText: {
    fontFamily: fontSemiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  titleChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 4,
  },
  title: {
    flexShrink: 0,
    fontFamily: fontBold,
    fontSize: 16,
    color: dashboardScreen.textPrimary,
    lineHeight: 20,
  },
  titleStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusChipText: {
    fontFamily: fontSemiBold,
    fontSize: 10,
    lineHeight: 13,
  },
  motivational: {
    fontFamily: fontSemiBold,
    fontSize: 13,
    lineHeight: 17,
    color: dashboardScreen.textPrimary,
    marginBottom: 4,
  },
  metricsBlock: {
    gap: 3,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metricLabel: {
    flex: 1,
    fontFamily: fontMedium,
    fontSize: 13,
    lineHeight: 17,
    color: dashboardScreen.textSecondary,
  },
  metricValue: {
    fontFamily: fontSemiBold,
    fontSize: 13,
    lineHeight: 17,
    color: dashboardScreen.textPrimary,
    textAlign: 'right',
    flexShrink: 0,
  },
  helper: {
    marginTop: 4,
    fontFamily: fontMedium,
    fontSize: 12,
    lineHeight: 16,
    color: dashboardScreen.textMuted,
  },
  ctaCol: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    flexShrink: 0,
    paddingTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  ctaBtn: {
    minWidth: 88,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
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
    fontSize: 15,
    color: '#FFFFFF',
  },
  ctaBtnTextLocked: {
    color: '#6B7280',
  },
});
