/**
 * Purpose: New patient registration with auto-generated PAC### clave.
 * Module: auth
 * Dependencies: expo-router, patient module
 */

import { useRouter } from 'expo-router';
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
import { createPatient } from '@/src/modules/patient/patient-service';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import type { PatientRecord } from '@/src/modules/patient/types';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

const TITLE = 26;
const BODY = 18;
const LABEL = 17;
const BTN = 19;

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
    if (!canSubmit) return;
    setLoading(true);
    try {
      const patient = await createPatient(nombre, edadNum);
      setRegistered(patient);
    } finally {
      setLoading(false);
    }
  }

  async function onContinue() {
    if (!registered) return;
    await setSessionPatient(registered);
    router.replace('/(tabs)');
  }

  if (registered) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>¡Listo, tu registro está guardado!</Text>
          <Text style={styles.subtitle}>
            Anota tu clave en un lugar seguro. La necesitarás cada vez que entres a la app.
          </Text>

          <View style={styles.keyCard} accessibilityRole="summary">
            <Text style={styles.keyLabel}>Tu clave de acceso</Text>
            <Text style={styles.keyValue}>{registered.clave}</Text>
            <Text style={styles.keyHint}>Ejemplo: la usarás como {registered.clave} en la pantalla de acceso.</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLine}>
              <Text style={styles.summaryBold}>Nombre: </Text>
              {registered.nombre_completo}
            </Text>
            <Text style={styles.summaryLine}>
              <Text style={styles.summaryBold}>Edad: </Text>
              {registered.edad} años
            </Text>
          </View>

          <Pressable
            style={styles.primaryBtn}
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Continuar al inicio">
            <Text style={styles.primaryBtnText}>Continuar al inicio</Text>
          </Pressable>

          <Pressable
            style={styles.textLinkBtn}
            onPress={() => router.replace('/auth/login')}
            accessibilityRole="button">
            <Text style={styles.textLink}>Volver al acceso con clave</Text>
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
          <Text style={styles.title}>Crear registro</Text>
          <Text style={styles.subtitle}>
            Solo necesitamos tu nombre y edad. Te daremos una clave automática.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. María González"
              placeholderTextColor={authPalette.textMuted}
              autoCapitalize="words"
              accessibilityLabel="Nombre completo"
            />

            <Text style={styles.label}>Edad (años)</Text>
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
              <Text style={styles.helperError}>Indica una edad entre 1 y 120 años.</Text>
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
                <Text style={styles.primaryBtnText}>Crear mi registro</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            style={styles.textLinkBtn}
            onPress={() => router.replace('/auth/login')}
            accessibilityRole="button">
            <Text style={styles.textLink}>Ya tengo clave, volver al acceso</Text>
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
    lineHeight: 26,
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
