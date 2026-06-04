/**
 * Purpose: First-time welcome modal with RESPIRA+ bunny guide (controlled by parent).
 * Module: onboarding
 * Dependencies: RespiraBunnyImage, IconSymbol, wellness tokens
 */

import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { RespiraBunnyImage } from '@/src/shared/ui/RespiraBunnyImage';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
  wellnessTypography,
} from '@/src/shared/theme/wellness-theme';

const BUNNY_SIZE = 152;
const CARD_MAX_WIDTH = 400;

/** Acento guía — contrasta con el teal principal de RESPIRA+. */
const LAVENDER_PRIMARY = '#8F7CF6';
const LAVENDER_SOFT = '#F1EEFF';
const LAVENDER_BORDER = '#DED6FF';
const COPY_MUTED = '#5B6B7A';

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
      onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View
          style={[styles.card, { width: cardWidth }, wellnessShadows.elevated]}
          accessibilityRole="summary"
          accessibilityLabel="Presentación de Respira Bunny, tu guía respiratoria">
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Cerrar bienvenida">
            <IconSymbol name="xmark" size={18} color={COPY_MUTED} />
          </Pressable>

          <View style={styles.heroStage}>
            <View style={styles.heroWash} pointerEvents="none" />
            <View style={[styles.lavenderHaloOuter, styles.haloCentered]} pointerEvents="none" />
            <View style={[styles.lavenderHaloInner, styles.haloCentered]} pointerEvents="none" />
            <View style={styles.bunnyForeground} pointerEvents="none">
              <RespiraBunnyImage pose="happy" size={BUNNY_SIZE} />
            </View>
          </View>

          <View style={styles.copyBlock}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Tu guía respiratoria</Text>
            </View>

            <Text style={styles.title}>Soy Respira Bunny</Text>
            <Text style={styles.subtitle}>y te acompañaré en cada sesión.</Text>
            <Text style={styles.hint}>
              Te daré indicaciones, ánimo y recordatorios para que avances con calma.
            </Text>
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
    borderColor: LAVENDER_BORDER,
    overflow: 'hidden',
    maxWidth: '100%',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: LAVENDER_BORDER,
  },
  closeBtnPressed: {
    opacity: 0.82,
  },
  heroStage: {
    width: '100%',
    minHeight: 212,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
    position: 'relative',
  },
  heroWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: LAVENDER_SOFT,
  },
  haloCentered: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: spacing.md + 8,
  },
  lavenderHaloOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(143, 124, 246, 0.14)',
  },
  lavenderHaloInner: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(143, 124, 246, 0.22)',
    bottom: spacing.lg + 20,
  },
  bunnyForeground: {
    zIndex: 2,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  copyBlock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + spacing.sm,
    paddingTop: spacing.sm,
    alignItems: 'center',
    width: '100%',
  },
  badge: {
    backgroundColor: LAVENDER_SOFT,
    borderWidth: 1,
    borderColor: LAVENDER_BORDER,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: LAVENDER_PRIMARY,
    letterSpacing: 0.35,
  },
  title: {
    ...wellnessTypography.screenTitle,
    fontSize: 26,
    color: wellnessColors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#2A3439',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  hint: {
    ...wellnessTypography.body,
    fontSize: 15,
    lineHeight: 22,
    color: COPY_MUTED,
    textAlign: 'center',
    marginBottom: 0,
    maxWidth: 300,
  },
});
