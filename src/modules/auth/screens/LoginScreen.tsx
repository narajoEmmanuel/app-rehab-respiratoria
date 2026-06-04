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
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LOCAL_PROFILE_HREF } from '@/src/modules/auth/local-profile-hrefs';
import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { getPatientByClave, normalizeClave } from '@/src/modules/patient/patient-service';
import { getErrorMessage } from '@/src/shared/utils/get-error-message';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

const TEXT_MUTED = '#6B7B86';
const TEXT_SLATE = '#354656';
const TEXT_PLACEHOLDER = '#B5BFC8';
const BTN_GRADIENT_ACTIVE = ['#45BDB7', '#34ABA5', '#1F7E7A'] as const;
const BTN_GRADIENT_DISABLED = ['#9DD9D2', '#8BCEC6', '#7ABFB8'] as const;

function LoginBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#F5F7F3', '#F0FAF9', '#F5F7F3']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={loginBackdropStyles.blobTop} />
      <View style={loginBackdropStyles.blobBottom} />
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

  function goToCreateProfile() {
    router.push({ pathname: LOCAL_PROFILE_HREF, params: { intent: 'create' } });
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
      Alert.alert('No se pudo iniciar sesión', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LoginBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Acceso con tu clave</Text>
            <Text style={styles.subtitle}>
              Escribe la clave que recibiste al registrarte.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Tu clave</Text>
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

            {notFound ? (
              <View style={styles.notice} accessibilityRole="alert">
                <Text style={styles.noticeTitle}>Clave no encontrada</Text>
                <Text style={styles.noticeBody}>
                  Revisa que esté escrita correctamente o crea un nuevo perfil.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.noticeLink, pressed && styles.pressed]}
                  onPress={goToCreateProfile}
                  accessibilityRole="button"
                  accessibilityLabel="Ir a crear perfil">
                  <Text style={styles.noticeLinkText}>Ir a crear perfil</Text>
                </Pressable>
              </View>
            ) : null}
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
                <Text style={[styles.btnPrimaryText, !canSubmit && styles.btnPrimaryTextDisabled]}>
                  Iniciar sesión
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.footerLink, pressed && styles.pressed]}
            onPress={goToCreateProfile}
            accessibilityRole="button"
            accessibilityLabel="Crear perfil">
            <Text style={styles.footerLinkText}>Crear perfil</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: authPalette.screenBg,
  },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  titleBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
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
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    marginBottom: spacing.lg,
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
  input: {
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.22)',
    borderRadius: 14,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    fontSize: 22,
    fontWeight: '700',
    color: authPalette.text,
    backgroundColor: 'rgba(250, 252, 251, 0.95)',
    minHeight: 52,
    letterSpacing: 2,
  },
  inputError: {
    borderColor: 'rgba(140, 58, 66, 0.35)',
    backgroundColor: authPalette.errorBg,
  },
  notice: {
    marginTop: spacing.md,
    backgroundColor: authPalette.errorBg,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(140, 58, 66, 0.14)',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: authPalette.errorText,
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
  btnPrimaryWrap: {
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
  footerLink: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
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

const loginBackdropStyles = StyleSheet.create({
  blobTop: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    top: -120,
    right: -80,
    backgroundColor: 'rgba(52, 171, 165, 0.08)',
  },
  blobBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    bottom: -60,
    left: -70,
    backgroundColor: 'rgba(221, 232, 216, 0.65)',
  },
});
