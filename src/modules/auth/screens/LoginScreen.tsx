/**
 * Purpose: Patient login by unique clave (PAC###).
 * Module: auth
 * Dependencies: expo-router, patient session, patient-service
 */

import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { getPatientByClave, normalizeClave } from '@/src/modules/patient/patient-service';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const TITLE = 26;
const BODY = 18;
const LABEL = 17;
const BTN = 19;

export function LoginScreen() {
  const router = useRouter();
  const { setSessionPatient } = usePatientSession();
  const [clave, setClave] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function onLogin() {
    setNotFound(false);
    const normalized = normalizeClave(clave);
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.brand}>Rehab respiratoria</Text>
            <Text style={styles.title}>Acceso con tu clave</Text>
            <Text style={styles.subtitle}>
              Escribe la clave que te dieron al registrarte (por ejemplo, PAC001).
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Tu clave</Text>
            <TextInput
              style={styles.input}
              value={clave}
              onChangeText={(t) => {
                setClave(t.toUpperCase());
                setNotFound(false);
              }}
              placeholder="PAC001"
              placeholderTextColor={authPalette.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              accessibilityLabel="Campo de clave del paciente"
            />

            {notFound ? (
              <View style={styles.notice} accessibilityRole="alert">
                <Text style={styles.noticeTitle}>Clave no encontrada</Text>
                <Text style={styles.noticeBody}>
                  ¿Deseas registrarte para obtener una clave nueva?
                </Text>
                <Link href="/auth/registro" asChild>
                  <Pressable style={styles.secondaryBtn} accessibilityRole="button">
                    <Text style={styles.secondaryBtnText}>Ir a crear registro</Text>
                  </Pressable>
                </Link>
              </View>
            ) : null}

            <Pressable
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={onLogin}
              disabled={loading || !normalizeClave(clave)}
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión">
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Iniciar sesión</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerHint}>¿Primera vez en la app?</Text>
            <Link href="/auth/registro" asChild>
              <Pressable style={styles.linkWrap} accessibilityRole="button">
                <Text style={styles.link}>Crear registro</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: authPalette.screenBg },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: { marginBottom: spacing.xl },
  brand: {
    fontSize: 16,
    color: authPalette.textMuted,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  title: {
    fontSize: TITLE,
    fontWeight: '700',
    color: authPalette.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: BODY,
    lineHeight: 26,
    color: authPalette.textMuted,
  },
  card: {
    backgroundColor: authPalette.cardGlass,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: authPalette.border,
    ...wellnessShadows.card,
  },
  label: {
    fontSize: LABEL,
    fontWeight: '600',
    color: authPalette.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 2,
    borderColor: authPalette.border,
    borderRadius: wellnessRadii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 22,
    fontWeight: '600',
    color: authPalette.text,
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  notice: {
    backgroundColor: authPalette.errorBg,
    borderRadius: wellnessRadii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeTitle: {
    fontSize: BODY,
    fontWeight: '700',
    color: authPalette.errorText,
    marginBottom: spacing.sm,
  },
  noticeBody: {
    fontSize: BODY,
    lineHeight: 24,
    color: authPalette.text,
    marginBottom: spacing.md,
  },
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.pill,
    borderWidth: 2,
    borderColor: authPalette.primaryDark,
  },
  secondaryBtnText: {
    fontSize: BODY,
    fontWeight: '700',
    color: authPalette.primaryDark,
  },
  primaryBtn: {
    backgroundColor: authPalette.primary,
    paddingVertical: spacing.md + 4,
    borderRadius: wellnessRadii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryBtnText: {
    color: authPalette.primaryOnBrand,
    fontSize: BTN,
    fontWeight: '700',
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerHint: { fontSize: BODY, color: authPalette.textMuted },
  linkWrap: { padding: spacing.sm },
  link: {
    fontSize: BODY,
    fontWeight: '700',
    color: authPalette.link,
    textDecorationLine: 'underline',
  },
});
