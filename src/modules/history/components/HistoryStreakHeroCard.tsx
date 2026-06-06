/**
 * Purpose: Streak hero card with mascot and motivational copy on the history screen.
 * Module: history
 */

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/shared/ui/AppText';
import { RespiraBunnyImage } from '@/src/shared/ui/RespiraBunnyImage';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const STREAK_ACTIVE_GRADIENT = ['#5CE0C8', '#34ABA5', '#1F7E7A'] as const;
const STREAK_WARM_GRADIENT = ['#FFF6EE', '#FFE8D4', '#FFD9B8'] as const;
const STREAK_HERO_VISUAL_HEIGHT = 108;
const STREAK_HERO_BUNNY_SIZE = STREAK_HERO_VISUAL_HEIGHT;

type Props = {
  streakDays: number;
  streakLost: boolean;
  dailyGoalMet: boolean;
};

function StreakFireEmoji({ active, hero }: { active: boolean; hero?: boolean }) {
  return (
    <AppText
      style={[
        styles.streakFire,
        hero && styles.streakFireHero,
        active ? styles.streakFireActive : styles.streakFireDim,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      🔥
    </AppText>
  );
}

export function HistoryStreakHeroCard({ streakDays, streakLost, dailyGoalMet }: Props) {
  const active = streakDays > 0;
  const dayLabel = streakDays === 1 ? 'día' : 'días';

  let title: string;
  let body: string;
  let gradientColors: readonly [string, string, string];
  let fireActive = false;

  if (active) {
    fireActive = true;
    gradientColors = STREAK_ACTIVE_GRADIENT;
    title = `${streakDays} ${dayLabel} de racha activa`;
    body = dailyGoalMet
      ? 'Meta del día completada. Sigue así.'
      : 'Completa tu sesión de hoy para mantener tu racha.';
  } else if (streakLost) {
    gradientColors = STREAK_WARM_GRADIENT;
    title = 'Tu racha puede comenzar de nuevo';
    body = 'Retoma tu práctica hoy para volver a activarla.';
  } else {
    gradientColors = STREAK_WARM_GRADIENT;
    title = 'Tu primera racha empieza hoy';
    body = 'Completa una sesión para encender tu progreso.';
  }

  const titleStyle = active ? styles.streakHeroTitleActive : styles.streakHeroTitleWarm;
  const bodyStyle = active ? styles.streakHeroBodyActive : styles.streakHeroBodyWarm;

  return (
    <View style={styles.streakHeroWrap}>
      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.85 }}
        style={styles.streakHeroGradient}>
        <View style={styles.streakHeroRow}>
          <View style={styles.streakHeroVisual}>
            <RespiraBunnyImage pose="presenting" size={STREAK_HERO_BUNNY_SIZE} />
            <View style={styles.streakHeroFireSlot}>
              <StreakFireEmoji active={fireActive} hero />
            </View>
          </View>
          <View style={styles.streakHeroCopy}>
            <AppText variant="metric" style={titleStyle}>
              {title}
            </AppText>
            <AppText variant="bodyMedium" style={bodyStyle}>
              {body}
            </AppText>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  streakHeroWrap: {
    marginBottom: spacing.lg,
    borderRadius: wellnessRadii.cardLarge,
    overflow: 'hidden',
    ...wellnessShadows.card,
  },
  streakHeroGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: STREAK_HERO_VISUAL_HEIGHT + spacing.md * 2,
    justifyContent: 'center',
  },
  streakHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  streakHeroVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: STREAK_HERO_VISUAL_HEIGHT,
    flexShrink: 0,
    marginRight: spacing.xs,
  },
  streakHeroCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  streakHeroFireSlot: {
    height: STREAK_HERO_VISUAL_HEIGHT,
    justifyContent: 'center',
    marginLeft: -8,
    paddingTop: 10,
  },
  streakFire: {
    fontSize: 36,
    lineHeight: 40,
  },
  streakFireHero: {
    fontSize: 58,
    lineHeight: 62,
  },
  streakFireDim: {
    opacity: 0.42,
  },
  streakFireActive: {
    opacity: 1,
    textShadowColor: 'rgba(255, 160, 60, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  streakHeroTitleWarm: {
    fontSize: 22,
    color: '#5D4037',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  streakHeroBodyWarm: {
    marginTop: 6,
    color: '#795548',
    fontWeight: '500',
  },
  streakHeroTitleActive: {
    fontSize: 24,
    color: '#FFFFFF',
    letterSpacing: -0.35,
    lineHeight: 30,
  },
  streakHeroBodyActive: {
    marginTop: 6,
    color: 'rgba(255, 255, 255, 0.94)',
    fontWeight: '600',
  },
});
