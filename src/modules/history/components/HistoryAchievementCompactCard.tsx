/**
 * Purpose: Compact achievement tile in the history achievements grid.
 * Module: history
 */

import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

export type HistoryProgressAchievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
};

type Props = {
  item: HistoryProgressAchievement;
};

export function HistoryAchievementCompactCard({ item }: Props) {
  const { title, description, unlocked, icon } = item;
  return (
    <View style={[styles.achievementCompact, unlocked && styles.achievementCompactUnlocked]}>
      <AppText style={[styles.achievementCompactIcon, !unlocked && styles.achievementCompactIconLocked]}>
        {icon}
      </AppText>
      <AppText
        variant="chip"
        style={[styles.achievementCompactTitle, !unlocked && styles.achievementCompactTitleLocked]}
        numberOfLines={2}>
        {title}
      </AppText>
      <AppText
        variant="chipSmall"
        style={[styles.achievementCompactDesc, !unlocked && styles.achievementCompactDescLocked]}
        numberOfLines={3}>
        {description}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  achievementCompact: {
    width: '48%',
    backgroundColor: '#F7F9F8',
    borderRadius: wellnessRadii.card,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#E0E6E3',
    alignItems: 'center',
  },
  achievementCompactUnlocked: {
    borderColor: 'rgba(52, 171, 165, 0.45)',
    backgroundColor: '#F4FBFA',
    ...wellnessShadows.soft,
  },
  achievementCompactIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  achievementCompactIconLocked: {
    opacity: 0.55,
  },
  achievementCompactTitle: {
    color: wellness.primaryDark,
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementCompactTitleLocked: {
    color: wellness.text,
    fontWeight: '700',
  },
  achievementCompactDesc: {
    lineHeight: 15,
    color: wellness.primaryDark,
    textAlign: 'center',
    fontWeight: '600',
  },
  achievementCompactDescLocked: {
    color: wellness.textSecondary,
    fontWeight: '500',
  },
});
