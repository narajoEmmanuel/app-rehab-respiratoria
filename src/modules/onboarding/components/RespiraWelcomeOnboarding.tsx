/**
 * Purpose: First-time welcome modal with RESPIRA+ bunny guide (controlled by parent).
 * Module: onboarding
 * Dependencies: RespiraBunnyImage, WelcomeBunnyBackdrop, wellness tokens, AppButton
 */

import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { WelcomeBunnyBackdrop } from '@/src/modules/onboarding/components/WelcomeBunnyBackdrop';
import { AppButton } from '@/src/shared/ui/AppButton';
import { RespiraBunnyImage } from '@/src/shared/ui/RespiraBunnyImage';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
  wellnessTypography,
} from '@/src/shared/theme/wellness-theme';

const BUNNY_SIZE = 152;
const CARD_MAX_WIDTH = 400;

export type RespiraWelcomeOnboardingProps = {
  visible: boolean;
  onContinue: () => void;
};

export function RespiraWelcomeOnboarding({ visible, onContinue }: RespiraWelcomeOnboardingProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(windowWidth - spacing.lg * 2, CARD_MAX_WIDTH);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      accessibilityViewIsModal
      onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="Cerrar bienvenida y continuar"
        />
        <View
          style={[styles.card, { width: cardWidth }, wellnessShadows.elevated]}
          accessibilityRole="summary"
          accessibilityLabel="Bienvenida a RESPIRA+">
          <View style={styles.heroStage}>
            <View style={styles.heroBackdrop} pointerEvents="none">
              <WelcomeBunnyBackdrop width={cardWidth} />
            </View>
            <View style={styles.bunnyForeground} pointerEvents="none">
              <RespiraBunnyImage pose="happy" size={BUNNY_SIZE} />
            </View>
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.title}>Bienvenido a RESPIRA+</Text>
            <Text style={styles.message}>Te acompañaré en tus sesiones respiratorias.</Text>
            <AppButton title="Comenzar" onPress={onContinue} variant="primary" style={styles.cta} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.38)',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: wellnessColors.card,
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellnessColors.border,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  heroStage: {
    width: '100%',
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
    bottom: undefined,
    height: '100%',
  },
  bunnyForeground: {
    zIndex: 1,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  copyBlock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    ...wellnessTypography.screenTitle,
    fontSize: 24,
    color: wellnessColors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...wellnessTypography.body,
    color: wellnessColors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  cta: {
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 54,
  },
});
