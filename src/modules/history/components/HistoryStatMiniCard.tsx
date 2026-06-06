/**
 * Purpose: Compact stat tile with decorative badge on the history screen.
 * Module: history
 */

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const BADGE_SLOT_SIZE = 40;

type BadgeVariant = 'yellow' | 'teal' | 'blue';

const BADGE_PALETTES: Record<
  BadgeVariant,
  {
    slotBg: string;
    ribbonLeft: readonly [string, string];
    ribbonRight: readonly [string, string];
    ring: readonly [string, string, string];
    core: readonly [string, string];
  }
> = {
  yellow: {
    slotBg: '#FFF8E8',
    ribbonLeft: ['#FFE082', '#FFC107'],
    ribbonRight: ['#FFD54F', '#FFB300'],
    ring: ['#FFE082', '#FFC107', '#F9A825'],
    core: ['#FFFDE7', '#FFD54F'],
  },
  teal: {
    slotBg: '#E8F6F5',
    ribbonLeft: ['#80CBC4', '#4DB6AC'],
    ribbonRight: ['#4DB6AC', '#26A69A'],
    ring: ['#B2DFDB', '#4DB6AC', '#00897B'],
    core: ['#E0F2F1', '#80CBC4'],
  },
  blue: {
    slotBg: '#E8F4FC',
    ribbonLeft: ['#90CAF9', '#64B5F6'],
    ribbonRight: ['#64B5F6', '#42A5F5'],
    ring: ['#BBDEFB', '#64B5F6', '#1E88E5'],
    core: ['#E3F2FD', '#90CAF9'],
  },
};

type Props = {
  badgeVariant: BadgeVariant;
  label: string;
  value: string;
};

function SummaryBadgeIcon({ variant }: { variant: BadgeVariant }) {
  const palette = BADGE_PALETTES[variant];

  return (
    <View
      style={[badgeStyles.slot, { backgroundColor: palette.slotBg }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={badgeStyles.canvas}>
        <LinearGradient
          colors={[...palette.ribbonLeft]}
          style={[badgeStyles.ribbon, badgeStyles.ribbonLeft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={[...palette.ribbonRight]}
          style={[badgeStyles.ribbon, badgeStyles.ribbonRight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={[...palette.ring]}
          style={badgeStyles.outerRing}
          start={{ x: 0.25, y: 0.1 }}
          end={{ x: 0.95, y: 1 }}
        />
        {variant === 'teal' ? <View style={badgeStyles.innerRing} /> : null}
        <LinearGradient
          colors={[...palette.core]}
          style={badgeStyles.core}
          start={{ x: 0.25, y: 0.2 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={badgeStyles.shine} />
        {variant === 'yellow' ? <View style={badgeStyles.yellowAccent} /> : null}
        {variant === 'blue' ? <View style={badgeStyles.blueLevelMark} /> : null}
      </View>
    </View>
  );
}

export function HistoryStatMiniCard({ badgeVariant, label, value }: Props) {
  return (
    <View style={styles.statMiniCard}>
      <View style={styles.statMiniIconSlot}>
        <SummaryBadgeIcon variant={badgeVariant} />
      </View>
      <AppText variant="statusValue" style={styles.statMiniValue}>
        {value}
      </AppText>
      <AppText variant="label" style={styles.statMiniLabel}>
        {label}
      </AppText>
    </View>
  );
}

type HistoryStatMiniCardsRowProps = {
  streakMiniValue: string;
  weeklySessions: number;
  totalValidReps: number;
};

export function HistoryStatMiniCardsRow({
  streakMiniValue,
  weeklySessions,
  totalValidReps,
}: HistoryStatMiniCardsRowProps) {
  return (
    <View style={styles.statMiniRow}>
      <HistoryStatMiniCard badgeVariant="yellow" label="Racha" value={streakMiniValue} />
      <HistoryStatMiniCard
        badgeVariant="teal"
        label="Sesiones"
        value={`${weeklySessions} esta semana`}
      />
      <HistoryStatMiniCard
        badgeVariant="blue"
        label="Repeticiones válidas"
        value={`${totalValidReps} completadas`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statMiniRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statMiniCard: {
    flex: 1,
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.border,
    ...wellnessShadows.card,
    minWidth: 0,
  },
  statMiniIconSlot: {
    height: BADGE_SLOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statMiniValue: {
    marginTop: 6,
    fontWeight: '800',
    color: wellness.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  statMiniLabel: {
    marginTop: 4,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
});

const badgeStyles = StyleSheet.create({
  slot: {
    width: BADGE_SLOT_SIZE,
    height: BADGE_SLOT_SIZE,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.1)',
  },
  canvas: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    width: 9,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  ribbonLeft: {
    left: 4,
    transform: [{ rotate: '-20deg' }],
  },
  ribbonRight: {
    right: 4,
    transform: [{ rotate: '20deg' }],
  },
  outerRing: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  innerRing: {
    position: 'absolute',
    bottom: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  core: {
    position: 'absolute',
    bottom: 5,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  shine: {
    position: 'absolute',
    bottom: 14,
    left: 5,
    width: 9,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  yellowAccent: {
    position: 'absolute',
    top: 1,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.75,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.35)',
  },
  blueLevelMark: {
    position: 'absolute',
    bottom: 9,
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
});
