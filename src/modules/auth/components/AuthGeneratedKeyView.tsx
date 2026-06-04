/**
 * Pantalla 3 — Clave generada (solo presentación visual; lógica en LocalProfileScreen).
 */
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AUTH_REGISTRATION_HEADER_ESTIMATED_HEIGHT,
  AUTH_REGISTRATION_STEP_COUNT,
  AuthRegistrationHeader,
} from '@/src/modules/auth/components/AuthRegistrationHeader';
import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellness,
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

const TEXT_MUTED = '#6B7B86';
const BTN_GRADIENT_ACTIVE = ['#45BDB7', '#34ABA5', '#1F7E7A'] as const;

type AuthGeneratedKeyViewProps = {
  clave: string;
  copyAck: boolean;
  busy: boolean;
  onCopyKey: () => void;
  onContinue: () => void;
  onBackToLogin: () => void;
};

function RegistrationWellnessBackdrop() {
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
      <View style={[styles.blurOrb, styles.orbBottomLeft]} />
      <View style={[styles.blurOrb, styles.orbTopRightAccent]} />
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
      </Svg>
    </View>
  );
}

export function AuthGeneratedKeyView({
  clave,
  copyAck,
  busy,
  onCopyKey,
  onContinue,
  onBackToLogin,
}: AuthGeneratedKeyViewProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollMinHeight =
    windowHeight - insets.top - insets.bottom - AUTH_REGISTRATION_HEADER_ESTIMATED_HEIGHT;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <RegistrationWellnessBackdrop />
      <AuthRegistrationHeader
        onBack={onBackToLogin}
        backAccessibilityLabel="Volver al acceso con clave"
        step={{ current: 2, total: AUTH_REGISTRATION_STEP_COUNT }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scroll, { minHeight: Math.max(scrollMinHeight, 0) }]}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View style={styles.page}>
          <View style={styles.contentMain}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>¡Todo listo!</Text>
              <Text style={styles.subtitle}>
                Guarda tu clave de acceso. La necesitarás cada vez que entres a la app.
              </Text>
            </View>

            <View style={styles.keyCard} accessibilityRole="summary">
              <Text style={styles.keyLabel}>Tu clave de acceso</Text>
              <Text style={styles.keyValue} accessibilityLabel={`Clave ${clave}`}>
                {clave}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.btnOutline,
                busy && styles.btnDisabled,
                pressed && !busy && styles.pressed,
              ]}
              onPress={onCopyKey}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={copyAck ? 'Clave lista para compartir' : 'Copiar clave'}>
              <IconSymbol name="square.and.arrow.up" size={20} color={wellness.primary} />
              <Text style={styles.btnOutlineText}>
                {copyAck ? 'Clave lista para compartir' : 'Copiar clave'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnPrimaryWrap,
                busy && styles.btnPrimaryWrapDisabled,
                pressed && !busy && styles.pressed,
              ]}
              onPress={onContinue}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Revisar documentos legales">
              <LinearGradient
                colors={BTN_GRADIENT_ACTIVE}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnPrimaryGradient}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Revisar documentos legales</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnSecondary,
                busy && styles.btnDisabled,
                pressed && !busy && styles.pressed,
              ]}
              onPress={onBackToLogin}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Volver al acceso con clave">
              <Text style={styles.btnSecondaryText}>Volver al acceso con clave</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#D8F2EE',
  },
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
  },
  orbTopRightAccent: {
    width: 160,
    height: 160,
    top: -40,
    right: -48,
    backgroundColor: 'rgba(69, 189, 183, 0.1)',
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
    marginTop: spacing.md,
    marginBottom: spacing.lg,
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
  keyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: wellnessColors.primarySubtle,
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: spacing.xl + 4,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 171, 165, 0.28)',
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
  keyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: wellness.primaryDark,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  keyValue: {
    fontSize: 48,
    fontWeight: '800',
    color: authPalette.primaryDark,
    letterSpacing: 5,
    textAlign: 'center',
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    borderRadius: wellnessRadii.pill,
    paddingVertical: 15,
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: wellness.primary,
    marginBottom: spacing.sm,
    ...wellnessShadows.soft,
  },
  btnOutlineText: {
    fontSize: 17,
    fontWeight: '600',
    color: wellness.primary,
  },
  btnPrimaryWrap: {
    width: '100%',
    borderRadius: wellnessRadii.pill,
    overflow: 'hidden',
    marginTop: spacing.xs,
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  btnPrimaryWrapDisabled: {
    shadowOpacity: 0.12,
    elevation: 2,
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
  btnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    minHeight: 44,
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: wellness.primary,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.88,
  },
});
