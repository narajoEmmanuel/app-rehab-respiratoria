/**
 * Pantalla 2 — Crear perfil (solo presentación visual; lógica en LocalProfileScreen).
 */
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { RespiraBrandMark } from '@/src/shared/ui/RespiraBrandMark';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const TEXT_SLATE = '#354656';
const TEXT_MUTED = '#6B7B86';
const TEXT_PLACEHOLDER = '#B5BFC8';

const BTN_GRADIENT_ACTIVE = ['#45BDB7', '#34ABA5', '#1F7E7A'] as const;
const BTN_GRADIENT_DISABLED = ['#9DD9D2', '#8BCEC6', '#7ABFB8'] as const;

type AuthCreateProfileViewProps = {
  nombre: string;
  onNombreChange: (value: string) => void;
  edadText: string;
  onEdadChange: (value: string) => void;
  edadValid: boolean;
  canSubmit: boolean;
  busy: boolean;
  onSubmit: () => void;
  onBack: () => void;
};

/** Fondo propio de registro: capas teal/mint con contraste y profundidad. */
function CreateProfileBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#FAFFFE', '#E8F8F6', '#D8F2EE', '#C8EBE6']}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={['rgba(52, 171, 165, 0.18)', 'rgba(69, 189, 183, 0.07)', 'transparent']}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0.15 }}
        end={{ x: 0.95, y: 0.75 }}
        style={styles.leftRailWash}
      />

      <LinearGradient
        colors={['rgba(31, 126, 122, 0.1)', 'rgba(52, 171, 165, 0.04)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.25, y: 0.6 }}
        style={styles.topRightWash}
      />

      <LinearGradient
        colors={['transparent', 'rgba(210, 245, 240, 0.35)', 'rgba(52, 171, 165, 0.14)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0.1 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomDepthWash}
      />

      <LinearGradient
        colors={['rgba(69, 189, 183, 0.08)', 'transparent', 'rgba(31, 126, 122, 0.05)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.midContrastBand}
      />

      <LinearGradient
        colors={['transparent', 'rgba(255, 255, 255, 0.42)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0.28 }}
        end={{ x: 0.5, y: 0.75 }}
        style={styles.centerSoftWash}
      />

      <LinearGradient
        colors={['rgba(255, 255, 255, 0.28)', 'rgba(255, 255, 255, 0.08)', 'transparent']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.85 }}
        style={styles.softMistOverlay}
      />

      <View style={[styles.blurOrb, styles.orbBottomLeft]} />
      <View style={[styles.blurOrb, styles.orbTopRightAccent]} />

      <Svg
        width="100%"
        height={72}
        viewBox="0 0 400 72"
        style={styles.waveMid}
        preserveAspectRatio="none">
        <Path
          d="M0,38 C100,14 200,52 300,28 C350,16 380,34 400,26 L400,72 L0,72 Z"
          fill="rgba(52, 171, 165, 0.06)"
        />
      </Svg>

      <Svg
        width="100%"
        height={240}
        viewBox="0 0 400 240"
        style={styles.arcBottom}
        preserveAspectRatio="none">
        <Path
          d="M0,155 C90,95 200,125 300,88 C350,68 380,92 400,78 L400,240 L0,240 Z"
          fill="rgba(52, 171, 165, 0.12)"
        />
        <Path
          d="M0,178 C110,128 220,158 320,118 C360,100 385,118 400,108 L400,240 L0,240 Z"
          fill="rgba(198, 245, 238, 0.38)"
        />
        <Path
          d="M0,198 C130,168 250,188 400,162 L400,240 L0,240 Z"
          fill="rgba(31, 126, 122, 0.06)"
        />
      </Svg>
    </View>
  );
}

/** Header fijo arriba (fuera del scroll) — flecha, marca y stepper de registro. */
function CreateProfileHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.headerBar}>
      <View style={styles.headerShell}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver a bienvenida">
          <IconSymbol name="chevron.left" size={20} color={wellness.primary} />
        </Pressable>
        <View style={styles.headerBrandCenter}>
          <View style={styles.headerLogoCircle}>
            <RespiraBrandMark variant="icon" size="sm" imageStyle={styles.headerLogoImage} />
          </View>
          <Text style={styles.headerBrandText}>RESPIRA+</Text>
        </View>
      </View>
      <AuthRegistrationStepper current={1} total={4} />
    </View>
  );
}

function AuthRegistrationStepper({ current, total = 4 }: { current: number; total?: number }) {
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

export function AuthCreateProfileView({
  nombre,
  onNombreChange,
  edadText,
  onEdadChange,
  edadValid,
  canSubmit,
  busy,
  onSubmit,
  onBack,
}: AuthCreateProfileViewProps) {
  const submitEnabled = canSubmit && !busy;
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollMinHeight =
    windowHeight - insets.top - insets.bottom - HEADER_BAR_ESTIMATED_HEIGHT;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <CreateProfileBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <CreateProfileHeader onBack={onBack} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scroll,
            { minHeight: Math.max(scrollMinHeight, 0) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.page}>
            <View style={styles.contentMain}>
              <View style={styles.titleBlock}>
                <Text style={styles.title}>Creamos tu perfil</Text>
                <Text style={styles.subtitle}>
                  Necesitamos algunos datos básicos para personalizar tu experiencia.
                </Text>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.fieldLabel}>Nombre completo</Text>
                <TextInput
                  style={styles.input}
                  value={nombre}
                  onChangeText={onNombreChange}
                  placeholder="Ej. María González"
                  placeholderTextColor={TEXT_PLACEHOLDER}
                  autoCapitalize="words"
                  accessibilityLabel="Nombre completo"
                />

                <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Edad (años)</Text>
                <TextInput
                  style={styles.input}
                  value={edadText}
                  onChangeText={onEdadChange}
                  placeholder="Ej. 68"
                  placeholderTextColor={TEXT_PLACEHOLDER}
                  keyboardType="number-pad"
                  maxLength={3}
                  accessibilityLabel="Edad en años"
                />

                {edadText.length > 0 && !edadValid ? (
                  <Text style={styles.helperError}>Indica una edad entre 1 y 120 años.</Text>
                ) : null}
              </View>

              <View style={styles.securityCard}>
                <View style={styles.securityIconWrap}>
                  <IconSymbol name="lock.fill" size={14} color={wellness.primaryDark} />
                </View>
                <Text style={styles.securityText}>
                  Tu información está segura y solo será usada en la app.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimaryWrap,
                  !submitEnabled && styles.btnPrimaryWrapDisabled,
                  pressed && submitEnabled && styles.pressed,
                ]}
                onPress={onSubmit}
                disabled={!canSubmit || busy}
                accessibilityRole="button"
                accessibilityLabel="Continuar">
                <LinearGradient
                  colors={submitEnabled ? BTN_GRADIENT_ACTIVE : BTN_GRADIENT_DISABLED}
                  locations={[0, 0.45, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnPrimaryGradient}>
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.btnPrimaryText,
                        !submitEnabled && styles.btnPrimaryTextDisabled,
                      ]}>
                      Continuar
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            <View style={styles.pageTailSpacer} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const HEADER_LOGO_CIRCLE = 60;
const HEADER_LOGO_IMAGE = 48;
const STEPPER_TRACK_WIDTH = '52%';
const STEPPER_DOT_INACTIVE = 12;
const STEPPER_DOT_ACTIVE = 17;
const CONTENT_TITLE_TOP = 38;
const CONTENT_FORM_TOP = 30;
const CONTENT_FORM_TO_SECURITY = 20;
const CONTENT_SECURITY_TO_BUTTON = 24;
const HEADER_BAR_ESTIMATED_HEIGHT = 158;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#D8F2EE',
  },
  flex: { flex: 1 },
  scrollView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  headerBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
    paddingBottom: spacing.sm,
    zIndex: 5,
  },
  page: {
    flexGrow: 1,
    width: '100%',
  },
  contentMain: {
    width: '100%',
  },
  pageTailSpacer: {
    flexGrow: 1,
    minHeight: 0,
  },
  leftRailWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '78%',
    height: '75%',
  },
  topRightWash: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '55%',
    height: '42%',
  },
  bottomDepthWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '78%',
  },
  midContrastBand: {
    position: 'absolute',
    top: '34%',
    left: 0,
    right: 0,
    height: '28%',
    opacity: 0.45,
  },
  centerSoftWash: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    height: '48%',
  },
  softMistOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbBottomLeft: {
    width: 260,
    height: 260,
    bottom: -70,
    left: -100,
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
    shadowColor: '#E8F8F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 1,
  },
  orbTopRightAccent: {
    width: 160,
    height: 160,
    top: -40,
    right: -48,
    backgroundColor: 'rgba(69, 189, 183, 0.1)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 1,
  },
  waveMid: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 0,
    height: '16%',
    opacity: 0.28,
  },
  arcBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '36%',
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
  titleBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: CONTENT_TITLE_TOP,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#2A3439',
    textAlign: 'center',
    marginBottom: spacing.xs + 2,
    letterSpacing: -0.35,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: TEXT_MUTED,
    textAlign: 'center',
    maxWidth: 320,
  },
  formCard: {
    marginTop: CONTENT_FORM_TOP,
    backgroundColor: '#FFFFFF',
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.18)',
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SLATE,
    marginBottom: spacing.xs + 2,
  },
  fieldLabelSpaced: {
    marginTop: spacing.sm + 2,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.22)',
    borderRadius: 14,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    color: authPalette.text,
    backgroundColor: 'rgba(250, 252, 251, 0.95)',
    minHeight: 48,
  },
  helperError: {
    fontSize: 14,
    color: authPalette.errorText,
    marginTop: spacing.sm,
  },
  securityCard: {
    marginTop: CONTENT_FORM_TO_SECURITY,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.2)',
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  securityIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(230, 244, 242, 1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  securityText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  btnPrimaryWrap: {
    marginTop: CONTENT_SECURITY_TO_BUTTON,
    borderRadius: wellnessRadii.pill,
    overflow: 'hidden',
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  btnPrimaryWrapDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPrimaryGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  btnPrimaryText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPrimaryTextDisabled: {
    color: 'rgba(255, 255, 255, 0.92)',
  },
  pressed: {
    opacity: 0.88,
  },
});
