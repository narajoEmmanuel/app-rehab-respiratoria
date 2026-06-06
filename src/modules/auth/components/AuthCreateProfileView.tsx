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
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AUTH_REGISTRATION_STEP_COUNT,
  AuthRegistrationHeader,
} from '@/src/modules/auth/components/AuthRegistrationHeader';
import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

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
        <AuthRegistrationHeader
          onBack={onBack}
          backAccessibilityLabel="Volver a bienvenida"
          step={{ current: 1, total: AUTH_REGISTRATION_STEP_COUNT }}
        />
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
                <AppText variant="titleLarge" style={styles.title}>Creamos tu perfil</AppText>
                <AppText variant="bodyLarge" style={styles.subtitle}>
                  Necesitamos algunos datos básicos para personalizar tu experiencia.
                </AppText>
              </View>

              <View style={styles.formCard}>
                <AppText variant="bodySmall" style={styles.fieldLabel}>Nombre completo</AppText>
                <TextInput
                  style={styles.input}
                  value={nombre}
                  onChangeText={onNombreChange}
                  placeholder="Ej. María González"
                  placeholderTextColor={TEXT_PLACEHOLDER}
                  autoCapitalize="words"
                  accessibilityLabel="Nombre completo"
                />

                <AppText variant="bodySmall" style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Edad (años)</AppText>
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
                  <AppText variant="bodySmall" style={styles.helperError}>Indica una edad entre 1 y 120 años.</AppText>
                ) : null}
              </View>

              <View style={styles.securityCard}>
                <View style={styles.securityIconWrap}>
                  <IconSymbol name="lock.fill" size={14} color={wellness.primaryDark} />
                </View>
                <AppText variant="caption" style={styles.securityText}>
                  Tu información está segura y solo será usada en la app.
                </AppText>
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
                    <AppText variant="button"
                      style={[
                        styles.btnPrimaryText,
                        !submitEnabled && styles.btnPrimaryTextDisabled,
                      ]}>
                      Continuar
                    </AppText>
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
