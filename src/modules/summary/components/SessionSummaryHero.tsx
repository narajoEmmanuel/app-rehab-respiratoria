/**
 * Purpose: Celebratory hero for session summary (mascot, title, chips).
 * Module: summary
 */
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import {
  RespiraBunnyImage,
  type BunnyImagePose,
} from '@/src/shared/ui/RespiraBunnyImage';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

const HERO_BUNNY_PX = 80;

export type SessionSummaryHeroProps = {
  title: string;
  subtitle: string;
  levelLabel: string;
  classificationTitle: string;
  classificationNote: string | null;
  perfect: boolean;
  completed: boolean;
  interrupted?: boolean;
};

function resolveHeroPose(
  perfect: boolean,
  completed: boolean,
  interrupted?: boolean,
): BunnyImagePose {
  if (interrupted && !completed) return 'neutral';
  if (completed || (perfect && completed)) return 'celebrate';
  return 'wave';
}

function resolveHeroVariant(
  perfect: boolean,
  completed: boolean,
  interrupted?: boolean,
): 'celebrate' | 'neutral' | 'default' {
  if (interrupted && !completed) return 'neutral';
  if (completed || (perfect && completed)) return 'celebrate';
  return 'default';
}

function SummaryChip({ label, variant }: { label: string; variant: 'celebrate' | 'neutral' | 'default' }) {
  return (
    <View
      style={[
        styles.chip,
        variant === 'celebrate' && styles.chipCelebrate,
        variant === 'neutral' && styles.chipNeutral,
        variant === 'default' && styles.chipDefault,
      ]}>
      <AppText
        variant="label"
        style={[
          styles.chipText,
          variant === 'celebrate' && styles.chipTextCelebrate,
          variant === 'neutral' && styles.chipTextNeutral,
        ]}
        numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

export function SessionSummaryHero({
  title,
  subtitle,
  levelLabel,
  classificationTitle,
  classificationNote,
  perfect,
  completed,
  interrupted,
}: SessionSummaryHeroProps) {
  const pose = resolveHeroPose(perfect, completed, interrupted);
  const variant = resolveHeroVariant(perfect, completed, interrupted);
  const classificationChipLabel = classificationNote ?? classificationTitle;

  return (
    <View
      style={[
        styles.heroCard,
        variant === 'celebrate' && styles.heroCardCelebrate,
        variant === 'neutral' && styles.heroCardNeutral,
        variant === 'default' && styles.heroCardDefault,
      ]}>
      <View style={styles.heroRow}>
        <View style={styles.heroTextCol}>
          <AppText variant="titleLarge" style={styles.screenTitle} numberOfLines={3}>
            {title}
          </AppText>
          <AppText variant="bodySmall" style={styles.screenSubtitle} numberOfLines={3}>
            {subtitle}
          </AppText>
          <View style={styles.chipRow}>
            <SummaryChip label={`Nivel ${levelLabel}`} variant={variant} />
            <SummaryChip label={classificationChipLabel} variant={variant} />
          </View>
        </View>
        <View style={styles.bunnyCol} pointerEvents="none">
          <RespiraBunnyImage pose={pose} size={HERO_BUNNY_PX} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    overflow: 'hidden',
    ...wellnessShadows.soft,
  },
  heroCardCelebrate: {
    backgroundColor: wellnessColors.card,
    borderColor: wellnessColors.border,
  },
  heroCardNeutral: {
    backgroundColor: wellnessColors.neutralSoft,
    borderColor: wellnessColors.border,
  },
  heroCardDefault: {
    backgroundColor: wellnessColors.primarySubtle,
    borderColor: wellnessColors.border,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  heroTextCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  bunnyCol: {
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  screenTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: wellnessColors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  screenSubtitle: {
    color: wellnessColors.textSecondary,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipCelebrate: {
    backgroundColor: wellnessColors.successSoft,
    borderColor: 'rgba(52, 171, 165, 0.18)',
  },
  chipNeutral: {
    backgroundColor: wellnessColors.card,
    borderColor: wellnessColors.border,
  },
  chipDefault: {
    backgroundColor: wellnessColors.card,
    borderColor: wellnessColors.border,
  },
  chipText: {
    color: wellnessColors.primaryDark,
  },
  chipTextCelebrate: {
    color: wellnessColors.primaryDark,
  },
  chipTextNeutral: {
    color: wellnessColors.textSecondary,
  },
});
