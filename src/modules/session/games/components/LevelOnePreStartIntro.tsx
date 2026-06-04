/**
 * Purpose: Pre-start intro overlay for Level 1 (PNG mascot, therapy cycle education).
 * Module: session/games
 * Dependencies: RespiraBunnyImage, wellness tokens, @expo/vector-icons/Feather
 * Notes: Rendered from SessionScreen over the runner scene. Gameplay uses RespiraBunny, not this.
 */

import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RespiraBunnyImage } from '@/src/shared/ui/RespiraBunnyImage';
import {
  wellness,
  wellnessColors,
  wellnessRadius,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

const BUNNY_SIZE = 140;

type TherapyStepSpec = {
  key: string;
  title: string;
  body: string;
  icon: ComponentProps<typeof Feather>['name'];
  accent: string;
  iconBg: string;
  cardBg: string;
  cardBorder: string;
};

const THERAPY_STEPS: TherapyStepSpec[] = [
  {
    key: 'inspira',
    title: 'INSPIRA',
    body: 'Alcanza la meta de volumen.',
    icon: 'arrow-up',
    accent: wellness.primaryDark,
    iconBg: wellnessColors.primarySoft,
    cardBg: wellnessColors.primarySubtle,
    cardBorder: 'rgba(52, 171, 165, 0.18)',
  },
  {
    key: 'sosten',
    title: 'SOSTÉN',
    body: 'Mantente arriba de la meta 2 s.',
    icon: 'clock',
    accent: '#B45309',
    iconBg: wellnessColors.warningSoft,
    cardBg: 'rgba(254, 243, 199, 0.55)',
    cardBorder: 'rgba(245, 158, 11, 0.22)',
  },
  {
    key: 'descansa',
    title: 'DESCANSA',
    body: 'Exhala y prepárate para la siguiente.',
    icon: 'wind',
    accent: wellnessColors.info,
    iconBg: wellnessColors.infoSoft,
    cardBg: 'rgba(219, 234, 254, 0.45)',
    cardBorder: 'rgba(37, 99, 235, 0.16)',
  },
];

export type LevelOnePreStartIntroProps = {
  onStart: () => void;
  onBack: () => void;
};

function TherapyStepCard({ step }: { step: TherapyStepSpec }) {
  return (
    <View
      style={[
        styles.stepCard,
        { backgroundColor: step.cardBg, borderColor: step.cardBorder },
      ]}>
      <View style={[styles.stepIconCircle, { backgroundColor: step.iconBg }]}>
        <Feather name={step.icon} size={18} color={step.accent} />
      </View>
      <View style={styles.stepTextCol}>
        <Text style={[styles.stepTitle, { color: step.accent }]}>{step.title}</Text>
        <Text style={styles.stepBody}>{step.body}</Text>
      </View>
    </View>
  );
}

export function LevelOnePreStartIntro({ onStart, onBack }: LevelOnePreStartIntroProps) {
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={styles.card}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.headerBlock}>
            <Text style={styles.levelName}>Inicio suave</Text>
            <Text style={styles.cycleHint}>Sigue este ciclo en cada repetición.</Text>
          </View>

          <View style={styles.stepsStack}>
            {THERAPY_STEPS.map((step) => (
              <TherapyStepCard key={step.key} step={step} />
            ))}
          </View>

          <View style={styles.mascotBlock}>
            <RespiraBunnyImage pose="wave" size={BUNNY_SIZE} />
            <Text style={styles.motivation}>Respira con calma. Tú puedes.</Text>
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel="Entendido, comenzar">
            <Text style={styles.primaryButtonText}>¡Entendido, comenzar!</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Regresar">
            <Text style={styles.secondaryButtonText}>Regresar</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(221, 232, 216, 0.50)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '88%',
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellness.border,
    ...wellnessShadows.card,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    alignItems: 'center',
  },
  headerBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelName: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: wellness.primaryDark,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  cycleHint: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    color: wellness.textSecondary,
    textAlign: 'center',
  },
  stepsStack: {
    width: '100%',
    gap: 8,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: wellnessRadius.lg,
    borderWidth: 1,
  },
  stepIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextCol: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stepBody: {
    fontSize: 13,
    lineHeight: 18,
    color: wellness.textSecondary,
    fontWeight: '500',
  },
  mascotBlock: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  motivation: {
    fontSize: 14,
    lineHeight: 19,
    color: wellness.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 12,
    width: '100%',
    backgroundColor: wellness.primary,
    paddingVertical: 14,
    borderRadius: wellnessRadii.pill,
    alignItems: 'center',
    ...wellnessShadows.soft,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.15,
  },
  secondaryButton: {
    marginTop: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.primary,
  },
});
