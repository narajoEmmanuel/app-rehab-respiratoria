/**
 * Purpose: New patient registration with auto-generated PAC### clave.
 * Module: auth
 * Dependencies: expo-router, patient module
 */

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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { createPatientLocal } from '@/src/modules/patient/patient-service';
import type { PatientRecord } from '@/src/modules/patient/types';
import { getErrorMessage } from '@/src/shared/utils/get-error-message';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { AppText } from '@/src/shared/ui/AppText';

const TITLE = 26;
const BODY = 16;
const LABEL = 16;
const BTN = 17;

export function RegistroScreen() {
  const router = useRouter();
  const { setSessionPatient } = usePatientSession();
  const [nombre, setNombre] = useState('');
  const [edadText, setEdadText] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState<PatientRecord | null>(null);

  const edadNum = parseInt(edadText, 10);
  const edadValid = !Number.isNaN(edadNum) && edadNum >= 1 && edadNum <= 120;
  const canSubmit = nombre.trim().length >= 2 && edadValid && !loading;

  async function onCreate() {
    console.log('[REGISTER] pressed');
    if (!canSubmit) return;
    setLoading(true);
    try {
      console.log('[REGISTER] validating fields');
      console.log('[REGISTER] creating local patient');
      const patient = await createPatientLocal(nombre, edadNum);
      console.log('[REGISTER] saved patient', patient);
      setRegistered(patient);
    } catch (error) {
      console.error('[REGISTER] failed full object:', error);
      Alert.alert('No se pudo crear el registro', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function onContinue() {
    if (!registered) return;
    try {
      await setSessionPatient(registered);
      console.log('[REGISTER] navigation success');
      router.replace(LEGAL_ACCEPT_HREF);
    } catch (error) {
      console.error('[REGISTER] failed full object:', error);
      Alert.alert('No se pudo activar el registro', getErrorMessage(error));
    }
  }

  if (registered) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText variant="titleLarge" style={styles.title}>¡Listo, tu registro está guardado!</AppText>
          <AppText variant="bodyLarge" style={styles.subtitle}>
            Anota tu clave en un lugar seguro. La necesitarás cada vez que entres a la app.
          </AppText>

          <View style={styles.keyCard} accessibilityRole="summary">
            <AppText variant="label" style={styles.keyLabel}>Tu clave de acceso</AppText>
            <AppText variant="metricLarge" style={styles.keyValue}>{registered.clave}</AppText>
            <AppText variant="bodyLarge" style={styles.keyHint}>Ejemplo: la usarás como {registered.clave} en la pantalla de acceso.</AppText>
          </View>

          <View style={styles.summaryCard}>
            <AppText variant="bodyLarge" style={styles.summaryLine}>
              <AppText variant="bodyLarge" style={styles.summaryBold}>Nombre: </AppText>
              {registered.nombre_completo}
            </AppText>
            <AppText variant="bodyLarge" style={styles.summaryLine}>
              <AppText variant="bodyLarge" style={styles.summaryBold}>Edad: </AppText>
              {registered.edad} años
            </AppText>
          </View>

          <AppText variant="bodyMedium" style={styles.legalHint}>
            El siguiente paso es revisar y aceptar los documentos legales.
          </AppText>

          <Pressable
            style={styles.primaryBtn}
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Revisar documentos">
            <AppText variant="button" style={styles.primaryBtnText}>Revisar documentos</AppText>
          </Pressable>

          <Pressable
            style={styles.textLinkBtn}
            onPress={() => router.replace('/auth/login')}
            accessibilityRole="button">
            <AppText variant="link" style={styles.textLink}>Volver al acceso con clave</AppText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
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
          <AppText variant="titleLarge" style={styles.title}>Crear registro</AppText>
          <AppText variant="bodyLarge" style={styles.subtitle}>
            Solo necesitamos tu nombre y edad. Te daremos una clave automática.
          </AppText>

          <View style={styles.card}>
            <AppText variant="bodyLarge" style={styles.label}>Nombre completo</AppText>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. María González"
              placeholderTextColor={authPalette.textMuted}
              autoCapitalize="words"
              accessibilityLabel="Nombre completo"
            />

            <AppText variant="bodyLarge" style={styles.label}>Edad (años)</AppText>
            <TextInput
              style={styles.input}
              value={edadText}
              onChangeText={(t) => setEdadText(t.replace(/[^0-9]/g, ''))}
              placeholder="Ej. 68"
              placeholderTextColor={authPalette.textMuted}
              keyboardType="number-pad"
              maxLength={3}
              accessibilityLabel="Edad en años"
            />

            {edadText.length > 0 && !edadValid ? (
              <AppText variant="bodySmall" style={styles.helperError}>Indica una edad entre 1 y 120 años.</AppText>
            ) : null}

            <Pressable
              style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
              onPress={onCreate}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Crear mi registro">
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText variant="button" style={styles.primaryBtnText}>Crear mi registro</AppText>
              )}
            </Pressable>
          </View>

          <Pressable
            style={styles.textLinkBtn}
            onPress={() => router.replace('/auth/login')}
            accessibilityRole="button">
            <AppText variant="link" style={styles.textLink}>Ya tengo clave, volver al acceso</AppText>
          </Pressable>
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
  title: {
    fontSize: TITLE,
    fontWeight: '700',
    color: authPalette.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: BODY,
    lineHeight: 23,
    color: authPalette.textMuted,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: authPalette.cardGlass,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: authPalette.border,
    marginBottom: spacing.lg,
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
    fontSize: 20,
    color: authPalette.text,
    marginBottom: spacing.md,
  },
  helperError: {
    fontSize: BODY,
    color: authPalette.errorText,
    marginBottom: spacing.md,
  },
  keyCard: {
    backgroundColor: authPalette.successBg,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: authPalette.primaryDark,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  keyLabel: {
    fontSize: LABEL,
    fontWeight: '600',
    color: authPalette.text,
    marginBottom: spacing.sm,
  },
  keyValue: {
    fontSize: 36,
    fontWeight: '800',
    color: authPalette.primaryDark,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  keyHint: {
    fontSize: BODY,
    textAlign: 'center',
    lineHeight: 24,
    color: authPalette.textMuted,
  },
  legalHint: {
    fontSize: 15,
    lineHeight: 22,
    color: authPalette.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  summaryCard: {
    backgroundColor: authPalette.card,
    borderRadius: wellnessRadii.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: authPalette.border,
  },
  summaryLine: { fontSize: BODY, color: authPalette.text, marginBottom: spacing.xs },
  summaryBold: { fontWeight: '700' },
  primaryBtn: {
    backgroundColor: authPalette.primary,
    paddingVertical: spacing.md + 4,
    borderRadius: wellnessRadii.pill,
    alignItems: 'center',
    minHeight: 56,
    marginBottom: spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    color: authPalette.primaryOnBrand,
    fontSize: BTN,
    fontWeight: '700',
  },
  textLinkBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  textLink: {
    fontSize: BODY,
    fontWeight: '700',
    color: authPalette.link,
    textDecorationLine: 'underline',
  },
});
