/**
 * Barra superior del flujo de registro: botón atrás, marca RESPIRA+ y stepper opcional.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { RespiraBrandMark } from '@/src/shared/ui/RespiraBrandMark';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const HEADER_LOGO_CIRCLE = 60;
const HEADER_LOGO_IMAGE = 48;
const STEPPER_TRACK_WIDTH = '52%';
const STEPPER_DOT_INACTIVE = 12;
const STEPPER_DOT_ACTIVE = 17;

export const AUTH_REGISTRATION_HEADER_ESTIMATED_HEIGHT = 158;

/** Pasos del registro: crear perfil → clave → documentos (sin bienvenida ni saludo del conejo). */
export const AUTH_REGISTRATION_STEP_COUNT = 3;

export function AuthRegistrationStepper({
  current,
  total = AUTH_REGISTRATION_STEP_COUNT,
}: {
  current: number;
  total?: number;
}) {
  const progressFraction = total <= 1 ? 1 : (current - 1) / (total - 1);

  return (
    <View style={styles.stepperBlock} accessibilityRole="progressbar">
      <View style={styles.stepperTrack}>
        <View style={styles.stepperLineBase} />
        <View style={[styles.stepperLineFill, { width: `${progressFraction * 100}%` }]} />
        <View style={styles.stepperDots}>
          {Array.from({ length: total }, (_, i) => {
            const step = i + 1;
            const isDone = step < current;
            const isCurrent = step === current;
            return (
              <View
                key={step}
                style={[
                  styles.stepperDot,
                  isDone && styles.stepperDotDone,
                  isCurrent && styles.stepperDotCurrent,
                  !isDone && !isCurrent && styles.stepperDotUpcoming,
                ]}
              />
            );
          })}
        </View>
      </View>
      <Text style={styles.stepperCaption}>
        Paso {current} de {total}
      </Text>
    </View>
  );
}

type AuthRegistrationHeaderProps = {
  onBack?: () => void;
  backAccessibilityLabel?: string;
  step?: { current: number; total?: number };
  showBrand?: boolean;
};

export function AuthRegistrationHeader({
  onBack,
  backAccessibilityLabel = 'Volver',
  step,
  showBrand = true,
}: AuthRegistrationHeaderProps) {
  return (
    <View style={styles.headerBar}>
      <View style={styles.headerShell}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}>
            <IconSymbol name="chevron.left" size={20} color={wellness.primary} />
          </Pressable>
        ) : (
          <View style={styles.backBtnSpacer} />
        )}
        {showBrand ? (
          <View style={styles.headerBrandCenter}>
            <View style={styles.headerLogoCircle}>
              <RespiraBrandMark variant="icon" size="sm" imageStyle={styles.headerLogoImage} />
            </View>
            <Text style={styles.headerBrandText}>RESPIRA+</Text>
          </View>
        ) : null}
      </View>
      {step ? <AuthRegistrationStepper current={step.current} total={step.total} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
    paddingBottom: spacing.sm,
    zIndex: 5,
  },
  headerShell: {
    position: 'relative',
    minHeight: HEADER_LOGO_CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: (HEADER_LOGO_CIRCLE - 36) / 2,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: wellnessRadii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.18)',
  },
  backBtnSpacer: {
    position: 'absolute',
    left: 0,
    top: (HEADER_LOGO_CIRCLE - 36) / 2,
    width: 36,
    height: 36,
  },
  headerBrandCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    paddingHorizontal: 48,
  },
  headerLogoCircle: {
    width: HEADER_LOGO_CIRCLE,
    height: HEADER_LOGO_CIRCLE,
    borderRadius: HEADER_LOGO_CIRCLE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.16)',
    overflow: 'hidden',
    ...wellnessShadows.soft,
  },
  headerLogoImage: {
    width: HEADER_LOGO_IMAGE,
    height: HEADER_LOGO_IMAGE,
  },
  headerBrandText: {
    fontSize: 26,
    fontWeight: '600',
    color: wellness.primary,
    letterSpacing: 0.45,
  },
  stepperBlock: {
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    marginTop: spacing.sm + 2,
  },
  stepperTrack: {
    width: STEPPER_TRACK_WIDTH,
    height: STEPPER_DOT_ACTIVE + 10,
    justifyContent: 'center',
    marginBottom: spacing.xs + 2,
  },
  stepperLineBase: {
    position: 'absolute',
    left: STEPPER_DOT_ACTIVE / 2,
    right: STEPPER_DOT_ACTIVE / 2,
    top: '50%',
    marginTop: -1.5,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  stepperLineFill: {
    position: 'absolute',
    left: STEPPER_DOT_ACTIVE / 2,
    top: '50%',
    marginTop: -1.5,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(52, 171, 165, 0.42)',
    maxWidth: '100%',
  },
  stepperDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  stepperDot: {
    width: STEPPER_DOT_INACTIVE,
    height: STEPPER_DOT_INACTIVE,
    borderRadius: STEPPER_DOT_INACTIVE / 2,
  },
  stepperDotUpcoming: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(52, 171, 165, 0.3)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 2,
  },
  stepperDotDone: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 2,
    borderColor: 'rgba(52, 171, 165, 0.4)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 2,
  },
  stepperDotCurrent: {
    width: STEPPER_DOT_ACTIVE,
    height: STEPPER_DOT_ACTIVE,
    borderRadius: STEPPER_DOT_ACTIVE / 2,
    backgroundColor: wellness.primary,
    borderColor: '#FFFFFF',
    borderWidth: 3,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 8,
    elevation: 5,
  },
  stepperCaption: {
    fontSize: 15,
    fontWeight: '600',
    color: wellness.primaryDark,
    letterSpacing: 0.25,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
