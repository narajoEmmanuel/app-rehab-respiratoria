/**
 * Purpose: Patient login by unique clave (PAC###).
 * Module: auth
 * Dependencies: expo-router, patient session, patient-service
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LOCAL_PROFILE_HREF } from '@/src/modules/auth/local-profile-hrefs';
import { isWebPwaLayout, shouldUseNativeKeyboardAvoiding } from '@/src/shared/layout/web-pwa-layout';
import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { getPatientByClave, normalizeClave } from '@/src/modules/patient/patient-service';
import { getErrorMessage } from '@/src/shared/utils/get-error-message';
import { showInfoAlert } from '@/src/shared/utils/cross-platform-dialogs';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { AppText } from '@/src/shared/ui/AppText';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const LOGO_SOURCE = require('../../../../assets/images/respira-logo.png');

const TEXT_MUTED = '#6B7B86';
const TEXT_SLATE = '#3F4F5C';
const TEXT_TITLE = '#2A3439';
const TEXT_PLACEHOLDER = '#B5BFC8';
const BTN_GRADIENT_ACTIVE = ['#45BDB7', '#34ABA5', '#1F7E7A'] as const;
const BTN_GRADIENT_DISABLED = ['#9DD9D2', '#8BCEC6', '#7ABFB8'] as const;

const NOTICE_BG = 'rgba(248, 244, 252, 0.96)';
const NOTICE_BORDER = 'rgba(124, 92, 140, 0.14)';
const NOTICE_TITLE = '#5C4A6B';

const HEADER_LOGO_CIRCLE = 60;
const HEADER_LOGO_IMAGE = 48;

const CONTENT_TITLE_TOP = 42;
const CONTENT_FORM_TOP = 32;
const CONTENT_FORM_TO_NOTICE = 18;
const CONTENT_NOTICE_TO_SECURITY = 18;
const CONTENT_FORM_TO_SECURITY = 20;
const CONTENT_SECURITY_TO_BUTTON = 26;
const CONTENT_BUTTON_TO_FOOTER = 24;

function LoginWellnessBackdrop() {
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
        style={backdropStyles.leftRailWash}
      />
      <LinearGradient
        colors={['transparent', 'rgba(210, 245, 240, 0.35)', 'rgba(52, 171, 165, 0.14)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0.1 }}
        end={{ x: 0.5, y: 1 }}
        style={backdropStyles.bottomDepthWash}
      />
      <View style={[backdropStyles.blurOrb, backdropStyles.orbTopRight]} />
      <View style={[backdropStyles.blurOrb, backdropStyles.orbBottomLeft]} />
      <Svg
        width="100%"
        height={200}
        viewBox="0 0 400 200"
        style={backdropStyles.arcBottom}
        preserveAspectRatio="none">
        <Path
          d="M0,140 C100,90 220,120 320,85 C360,70 385,88 400,78 L400,200 L0,200 Z"
          fill="rgba(52, 171, 165, 0.1)"
        />
      </Svg>
    </View>
  );
}

function LoginHeader({ onBack }: { onBack: () => void }) {
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
            <Image source={LOGO_SOURCE} style={styles.headerLogoImage} resizeMode="contain" />
          </View>
          <AppText variant="titleLarge" style={styles.headerBrandText}>RESPIRA+</AppText>
        </View>
      </View>
    </View>
  );
}

export function LoginScreen() {
  const router = useRouter();
  const { setSessionPatient } = usePatientSession();
  const [clave, setClave] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const normalized = normalizeClave(clave);
  const canSubmit = Boolean(normalized) && !loading;
  const webPwaLayout = isWebPwaLayout();

  function goToCreateProfile() {
    router.push({ pathname: LOCAL_PROFILE_HREF, params: { intent: 'create' } });
  }

  function onBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(LOCAL_PROFILE_HREF);
    }
  }

  async function onLogin() {
    setNotFound(false);
    if (!normalized) return;
    setLoading(true);
    try {
      const patient = await getPatientByClave(normalized);
      if (patient) {
        await setSessionPatient(patient);
        router.replace('/');
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('[LOGIN] failed full object:', error);
      showInfoAlert('No se pudo iniciar sesión', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const scrollBody = (
    <>
      <LoginHeader onBack={onBack} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        automaticallyAdjustKeyboardInsets={!isWebPwaLayout()}>
          <View style={[styles.page, webPwaLayout && styles.pageWebPwa]}>
            <View style={styles.contentMain}>
              <View style={[styles.titleBlock, webPwaLayout && styles.titleBlockWebPwa]}>
                <AppText variant="titleLarge" style={styles.title} accessibilityRole="header">
                  Acceso con tu clave
                </AppText>
                <AppText variant="bodyLarge" style={styles.subtitle}>
                  Escribe la clave que recibiste al registrarte.
                </AppText>
              </View>

              <View style={styles.formCard}>
                <AppText variant="bodySmall" style={styles.fieldLabel}>Tu clave</AppText>
                <TextInput
                  style={[styles.input, notFound && styles.inputError]}
                  value={clave}
                  onChangeText={(t) => {
                    setClave(t.toUpperCase());
                    setNotFound(false);
                  }}
                  placeholder="PACO01"
                  placeholderTextColor={TEXT_PLACEHOLDER}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={12}
                  accessibilityLabel="Campo de clave del paciente"
                />
              </View>

              {notFound ? (
                <View style={styles.notice} accessibilityRole="alert">
                  <AppText variant="titleSmall" style={styles.noticeTitle}>Clave no encontrada</AppText>
                  <AppText variant="bodyMedium" style={styles.noticeBody}>
                    Revisa que esté escrita correctamente o crea un nuevo perfil.
                  </AppText>
                  <Pressable
                    style={({ pressed }) => [styles.noticeLink, pressed && styles.pressed]}
                    onPress={goToCreateProfile}
                    accessibilityRole="button"
                    accessibilityLabel="Ir a crear perfil">
                    <AppText variant="link" style={styles.noticeLinkText}>Ir a crear perfil</AppText>
                  </Pressable>
                </View>
              ) : null}

              <View
                style={[
                  styles.securityCard,
                  notFound ? styles.securityCardAfterNotice : styles.securityCardAfterForm,
                ]}>
                <View style={styles.securityIconWrap}>
                  <IconSymbol name="lock.fill" size={14} color={wellness.primaryDark} />
                </View>
                <AppText variant="caption" style={styles.securityText}>
                  Tu clave mantiene tu perfil seguro en este dispositivo.
                </AppText>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.btnPrimaryWrap,
                  !canSubmit && styles.btnPrimaryWrapDisabled,
                  pressed && canSubmit && styles.pressed,
                ]}
                onPress={onLogin}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Iniciar sesión">
                <LinearGradient
                  colors={canSubmit ? BTN_GRADIENT_ACTIVE : BTN_GRADIENT_DISABLED}
                  locations={[0, 0.45, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnPrimaryGradient}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <AppText variant="button" style={[styles.btnPrimaryText, !canSubmit && styles.btnPrimaryTextDisabled]}>
                      Iniciar sesión
                    </AppText>
                  )}
                </LinearGradient>
              </Pressable>

              <View style={styles.footerCreate}>
                <AppText variant="bodyMedium" style={styles.footerHint}>¿Primera vez en RESPIRA+?</AppText>
                <Pressable
                  style={({ pressed }) => [styles.footerLink, pressed && styles.pressed]}
                  onPress={goToCreateProfile}
                  accessibilityRole="button"
                  accessibilityLabel="Crear perfil">
                  <AppText variant="bodyLarge" style={styles.footerLinkText}>Crear perfil</AppText>
                </Pressable>
              </View>
            </View>

            <View style={[styles.pageTailSpacer, webPwaLayout && styles.pageTailSpacerWebPwa]} />
          </View>
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={webPwaLayout ? ['top'] : ['top', 'bottom']}>
      <LoginWellnessBackdrop />
      {shouldUseNativeKeyboardAvoiding() ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {scrollBody}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.flex}>{scrollBody}</View>
      )}
    </SafeAreaView>
  );
}

const backdropStyles = StyleSheet.create({
  leftRailWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '78%',
    height: '75%',
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
  orbTopRight: {
    width: 160,
    height: 160,
    top: -40,
    right: -48,
    backgroundColor: 'rgba(69, 189, 183, 0.1)',
  },
  orbBottomLeft: {
    width: 260,
    height: 260,
    bottom: -70,
    left: -100,
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
  },
  arcBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '36%',
  },
});

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
    paddingBottom: spacing.xl,
  },
  page: {
    flexGrow: 1,
    width: '100%',
  },
  pageWebPwa: {
    flexGrow: 0,
  },
  contentMain: {
    width: '100%',
  },
  pageTailSpacer: {
    flexGrow: 1,
    minHeight: spacing.xl,
  },
  pageTailSpacerWebPwa: {
    flexGrow: 0,
    minHeight: 0,
  },
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
  titleBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: CONTENT_TITLE_TOP,
  },
  titleBlockWebPwa: {
    marginTop: 24,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: TEXT_TITLE,
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
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md + 4,
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
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(52, 171, 165, 0.28)',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 24,
    fontWeight: '700',
    color: authPalette.text,
    backgroundColor: 'rgba(240, 250, 249, 0.55)',
    minHeight: 56,
    letterSpacing: 2.5,
  },
  inputError: {
    borderColor: 'rgba(124, 92, 140, 0.28)',
    backgroundColor: 'rgba(248, 244, 252, 0.65)',
  },
  notice: {
    marginTop: CONTENT_FORM_TO_NOTICE,
    backgroundColor: NOTICE_BG,
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    borderWidth: 1,
    borderColor: NOTICE_BORDER,
    ...wellnessShadows.soft,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NOTICE_TITLE,
    marginBottom: spacing.xs,
  },
  noticeBody: {
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_SLATE,
    marginBottom: spacing.sm,
  },
  noticeLink: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  noticeLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: wellness.primary,
    textDecorationLine: 'underline',
  },
  securityCard: {
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
  securityCardAfterForm: {
    marginTop: CONTENT_FORM_TO_SECURITY,
  },
  securityCardAfterNotice: {
    marginTop: CONTENT_NOTICE_TO_SECURITY,
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
  footerCreate: {
    alignItems: 'center',
    marginTop: CONTENT_BUTTON_TO_FOOTER,
    gap: spacing.xs,
  },
  footerHint: {
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  footerLink: {
    paddingVertical: spacing.xs,
  },
  footerLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: wellness.primary,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.88,
  },
});
