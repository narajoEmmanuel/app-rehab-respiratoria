/**
 * Purpose: First-time welcome modal with RESPIRA+ bunny guide (controlled by parent).
 * Module: onboarding
 * Dependencies: RespiraBunnyImage, wellness tokens, AppButton
 */

import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppButton } from '@/src/shared/ui/AppButton';
import { RespiraBunnyImage } from '@/src/shared/ui/RespiraBunnyImage';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
  wellnessTypography,
} from '@/src/shared/theme/wellness-theme';

const BUNNY_SIZE = 132;
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
          <View style={styles.bunnyWrap}>
            <RespiraBunnyImage pose="wave" size={BUNNY_SIZE} />
          </View>

          <Text style={styles.title}>Bienvenido a RESPIRA+</Text>
          <Text style={styles.subtitle}>
            Te acompañaré paso a paso en tus sesiones respiratorias.
          </Text>
          <Text style={styles.message}>
            RESPIRA+ te ayuda a practicar, medir tu progreso y mantener constancia durante tu
            terapia.
          </Text>

          <AppButton title="Comenzar" onPress={onContinue} variant="primary" style={styles.cta} />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    maxWidth: '100%',
  },
  bunnyWrap: {
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  title: {
    ...wellnessTypography.screenTitle,
    fontSize: 24,
    color: wellnessColors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...wellnessTypography.body,
    color: wellnessColors.primaryDark,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  message: {
    ...wellnessTypography.body,
    color: wellnessColors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  cta: {
    alignSelf: 'stretch',
    width: '100%',
  },
});
