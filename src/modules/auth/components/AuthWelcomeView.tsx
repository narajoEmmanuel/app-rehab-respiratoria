/**
 * Pantalla 1 — bienvenida local-first (solo presentación visual).
 */
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import {
  WelcomeBenefitIcon,
  type WelcomeBenefitIconId,
} from '@/src/modules/auth/components/WelcomeBenefitIcons';
import { RespiraBrandMark } from '@/src/shared/ui/RespiraBrandMark';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { AppText } from '@/src/shared/ui/AppText';

const BENEFIT_ICON_SIZE = 30;
const BENEFIT_ICON_RING = 62;

const BENEFIT_ROWS: readonly { icon: WelcomeBenefitIconId; label: string }[] = [
  { icon: 'wellness', label: 'Monitorea tu bienestar de forma sencilla.' },
  { icon: 'insights', label: 'Indicadores que te ayudan a entenderte.' },
  { icon: 'privacy', label: 'Tus datos están protegidos.' },
];

const TEXT_SLATE = '#3F4F5C';

type AuthWelcomeViewProps = {
  onCreateProfile: () => void;
  onLoginWithKey: () => void;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  hasDeviceProfiles?: boolean;
  onShowDeviceProfiles?: () => void;
};

function WelcomeWellnessBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#E6F4F2', '#EFF9F8', '#F5F7F3']}
        locations={[0, 0.58, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={['rgba(52, 171, 165, 0.16)', 'rgba(52, 171, 165, 0.07)', 'transparent']}
        locations={[0, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.95 }}
        style={styles.upperColorWash}
      />

      <LinearGradient
        colors={['rgba(221, 232, 216, 0.45)', 'rgba(240, 250, 249, 0.2)', 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.15, y: 0.85 }}
        style={styles.upperMintGlow}
      />

      <View style={[styles.blurOrb, styles.blurOrbTopLeft]} />
      <View style={[styles.blurOrb, styles.blurOrbTopRight]} />
      <View style={[styles.blurOrb, styles.blurOrbMidLeft]} />
      <View style={[styles.blurOrb, styles.blurOrbHero]} />

      <Svg width="100%" height={130} viewBox="0 0 400 130" style={styles.waveTop} preserveAspectRatio="none">
        <Path
          d="M0,58 C60,22 140,72 220,42 C300,18 360,60 400,38 L400,130 L0,130 Z"
          fill="rgba(52, 171, 165, 0.09)"
        />
        <Path
          d="M0,72 C90,42 180,88 280,56 C340,36 380,64 400,52 L400,130 L0,130 Z"
          fill="rgba(52, 171, 165, 0.05)"
        />
      </Svg>

      <Svg
        width="100%"
        height={88}
        viewBox="0 0 400 88"
        style={styles.waveHero}
        preserveAspectRatio="none">
        <Path
          d="M0,44 C70,18 140,62 210,36 C280,12 340,52 400,30 L400,88 L0,88 Z"
          fill="rgba(52, 171, 165, 0.085)"
        />
      </Svg>

      <Svg
        width="100%"
        height={72}
        viewBox="0 0 400 72"
        style={styles.waveMid}
        preserveAspectRatio="none">
        <Path
          d="M0,40 C90,58 180,22 270,44 C330,58 370,34 400,48 L400,72 L0,72 Z"
          fill="rgba(52, 171, 165, 0.04)"
        />
      </Svg>

      <Svg
        width="100%"
        height={64}
        viewBox="0 0 400 64"
        style={styles.waveLow}
        preserveAspectRatio="none">
        <Path
          d="M0,28 C120,48 240,12 360,36 L400,40 L400,64 L0,64 Z"
          fill="rgba(221, 232, 216, 0.35)"
        />
      </Svg>
    </View>
  );
}

function BenefitRow({
  icon,
  label,
  showDivider,
}: {
  icon: WelcomeBenefitIconId;
  label: string;
  showDivider: boolean;
}) {
  return (
    <>
      <View style={styles.benefitRow}>
        <View style={styles.benefitIconRing}>
          <WelcomeBenefitIcon id={icon} size={BENEFIT_ICON_SIZE} color={wellness.primaryDark} />
        </View>
        <View style={styles.benefitTextWrap}>
          <AppText variant="bodyLarge" style={styles.benefitLabel}>{label}</AppText>
        </View>
      </View>
      {showDivider ? <View style={styles.benefitDivider} /> : null}
    </>
  );
}

export function AuthWelcomeView({
  onCreateProfile,
  onLoginWithKey,
  hasDeviceProfiles,
  onShowDeviceProfiles,
}: AuthWelcomeViewProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <WelcomeWellnessBackdrop />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.contentColumn}>
          <View style={styles.brandBlock}>
            <View style={styles.logoCircle}>
              <RespiraBrandMark variant="icon" size="lg" imageStyle={styles.logoMark} />
            </View>
            <AppText variant="display" style={styles.brandName} accessibilityRole="header">
              RESPIRA+
            </AppText>
            <AppText variant="titleMedium" style={styles.heroLine}>Tu salud respiratoria</AppText>
            <AppText variant="titleMedium" style={styles.heroLine}>en buenas manos</AppText>
          </View>

          <View style={styles.benefitsCard}>
            {BENEFIT_ROWS.map((row, index) => (
              <BenefitRow
                key={row.label}
                icon={row.icon}
                label={row.label}
                showDivider={index < BENEFIT_ROWS.length - 1}
              />
            ))}
          </View>

          <View style={styles.actionsFooter}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimaryWrap, pressed && styles.btnPressed]}
            onPress={onCreateProfile}
            accessibilityRole="button"
            accessibilityLabel="Crear perfil">
            <LinearGradient
              colors={['#45BDB7', '#34ABA5', '#1F7E7A']}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnPrimaryGradient}>
              <AppText variant="button" style={styles.btnPrimaryText}>Crear perfil</AppText>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && styles.btnPressed]}
            onPress={onLoginWithKey}
            accessibilityRole="button"
            accessibilityLabel="Ya tengo una clave">
            <AppText variant="button" style={styles.btnOutlineText}>Ya tengo una clave</AppText>
          </Pressable>

          {hasDeviceProfiles && onShowDeviceProfiles ? (
            <Pressable
              style={({ pressed }) => [styles.deviceProfilesLink, pressed && styles.btnPressed]}
              onPress={onShowDeviceProfiles}
              accessibilityRole="button"
              accessibilityLabel="Ver perfiles guardados en este dispositivo">
              <AppText variant="link" style={styles.deviceProfilesLinkText}>
                Perfiles guardados en este dispositivo
              </AppText>
            </Pressable>
          ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const LOGO_SIZE = 118;
/** Esquinas redondeadas tipo squircle (no círculo perfecto). */
const LOGO_CORNER_RADIUS = 36;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  page: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  contentColumn: {
    width: '100%',
  },
  actionsFooter: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  upperColorWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '64%',
  },
  upperMintGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  blurOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  blurOrbTopLeft: {
    width: 200,
    height: 200,
    top: -55,
    left: -70,
    backgroundColor: 'rgba(52, 171, 165, 0.1)',
  },
  blurOrbTopRight: {
    width: 320,
    height: 320,
    top: -80,
    right: -100,
    backgroundColor: 'rgba(52, 171, 165, 0.09)',
  },
  blurOrbMidLeft: {
    width: 240,
    height: 240,
    top: '28%',
    left: -100,
    backgroundColor: 'rgba(52, 171, 165, 0.05)',
  },
  blurOrbHero: {
    width: '92%',
    height: '42%',
    top: '2%',
    left: '4%',
    borderRadius: 120,
    backgroundColor: 'rgba(240, 250, 249, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.08)',
  },
  waveTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '28%',
  },
  waveHero: {
    position: 'absolute',
    top: '14%',
    left: 0,
    right: 0,
    height: '22%',
  },
  waveMid: {
    position: 'absolute',
    top: '26%',
    left: 0,
    right: 0,
    height: '20%',
    opacity: 0.9,
  },
  waveLow: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    height: '18%',
    opacity: 0.75,
  },
  brandBlock: {
    alignSelf: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  logoCircle: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_CORNER_RADIUS,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E6F2EF',
    overflow: 'hidden',
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  logoMark: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
  brandName: {
    fontSize: 36,
    fontWeight: '800',
    color: wellness.primary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  heroLine: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2A3439',
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  benefitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.12)',
    ...wellnessShadows.card,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    minHeight: BENEFIT_ICON_RING + spacing.sm,
  },
  benefitIconRing: {
    width: BENEFIT_ICON_RING,
    height: BENEFIT_ICON_RING,
    borderRadius: BENEFIT_ICON_RING / 2,
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.22)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...wellnessShadows.soft,
  },
  benefitTextWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.xs,
  },
  benefitLabel: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
    color: TEXT_SLATE,
  },
  benefitDivider: {
    height: 1,
    backgroundColor: 'rgba(52, 171, 165, 0.1)',
    marginLeft: BENEFIT_ICON_RING + spacing.md,
    marginRight: spacing.xs,
  },
  btnPrimaryWrap: {
    borderRadius: wellnessRadii.pill,
    overflow: 'hidden',
    shadowColor: '#1F7E7A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
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
  btnOutline: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: wellnessRadii.pill,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: 'rgba(52, 171, 165, 0.55)',
  },
  btnOutlineText: {
    fontSize: 18,
    fontWeight: '600',
    color: authPalette.primary,
  },
  btnPressed: {
    opacity: 0.9,
  },
  deviceProfilesLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  deviceProfilesLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: authPalette.link,
    textDecorationLine: 'underline',
  },
});
