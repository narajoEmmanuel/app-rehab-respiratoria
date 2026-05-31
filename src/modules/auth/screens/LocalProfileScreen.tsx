/**
 * Acceso local-first: seleccionar perfil existente o registrar uno nuevo (con datos reales).
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { isConsentActive } from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { normalizePatientDisplayName } from '@/src/modules/patient/patient-display';
import {
  createPatientLocal,
  listLocalPatientProfiles,
} from '@/src/modules/patient/patient-service';
import { getErrorMessage } from '@/src/shared/utils/get-error-message';
import type { PatientRecord } from '@/src/modules/patient/types';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

export function LocalProfileScreen() {
  const router = useRouter();
  const { setSessionPatient } = usePatientSession();
  const [profiles, setProfiles] = useState<PatientRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [busyId, setBusyId] = useState<number | 'create' | null>(null);

  const [nombre, setNombre] = useState('');
  const [edadText, setEdadText] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [createdPatient, setCreatedPatient] = useState<PatientRecord | null>(null);

  const edadNum = parseInt(edadText, 10);
  const edadValid = !Number.isNaN(edadNum) && edadNum >= 1 && edadNum <= 120;
  const canSubmit = nombre.trim().length >= 2 && edadValid && busyId !== 'create';

  const refreshProfiles = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await listLocalPatientProfiles();
      setProfiles(list);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  const enterWithPatient = useCallback(
    async (patient: PatientRecord) => {
      setBusyId(patient.paciente_id);
      try {
        await setSessionPatient(patient);
        const consentOk = await isConsentActive();
        if (consentOk) {
          router.replace('/(tabs)');
        } else {
          router.replace(LEGAL_ACCEPT_HREF);
        }
      } catch (error) {
        console.error('[REGISTER] failed full object:', error);
        Alert.alert('No se pudo activar el perfil', getErrorMessage(error));
      } finally {
        setBusyId(null);
      }
    },
    [router, setSessionPatient],
  );

  const onSubmitCreate = useCallback(() => {
    if (!canSubmit) return;
    void (async () => {
      setBusyId('create');
      try {
        console.log('[REGISTER] creating local patient');
        const patient = await createPatientLocal(nombre.trim(), edadNum);
        console.log('[REGISTER] saved patient', patient);
        setCreatedPatient(patient);
      } catch (error) {
        console.error('[REGISTER] failed full object:', error);
        Alert.alert('No se pudo crear el registro', getErrorMessage(error));
      } finally {
        setBusyId(null);
      }
    })();
  }, [canSubmit, nombre, edadNum]);

  const onContinueAfterCreate = useCallback(() => {
    if (!createdPatient) return;
    void (async () => {
      setBusyId('create');
      try {
        await setSessionPatient(createdPatient);
        router.replace(LEGAL_ACCEPT_HREF);
      } catch (error) {
        console.error('[REGISTER] failed full object:', error);
        Alert.alert('No se pudo activar el perfil', getErrorMessage(error));
      } finally {
        setBusyId(null);
      }
    })();
  }, [createdPatient, router, setSessionPatient]);

  const hasProfiles = profiles.length > 0;

  if (createdPatient) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Perfil creado</Text>
          <Text style={styles.subtitle}>
            Anota tu clave de acceso en un lugar seguro. La necesitarás para volver a entrar.
          </Text>

          <View style={styles.keyCard} accessibilityRole="summary">
            <Text style={styles.keyLabel}>Tu clave de acceso</Text>
            <Text style={styles.keyValue}>{createdPatient.clave}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLine}>
              <Text style={styles.summaryBold}>Nombre: </Text>
              {createdPatient.nombre_completo}
            </Text>
            <Text style={styles.summaryLine}>
              <Text style={styles.summaryBold}>Edad: </Text>
              {createdPatient.edad} años
            </Text>
          </View>

          <Text style={styles.legalHint}>
            El siguiente paso es revisar y aceptar los documentos legales antes de usar la app.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              busyId === 'create' && styles.btnDisabled,
              pressed && !busyId && styles.primaryBtnPressed,
            ]}
            onPress={onContinueAfterCreate}
            disabled={busyId != null}
            accessibilityRole="button"
            accessibilityLabel="Revisar documentos">
            {busyId === 'create' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Revisar documentos</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (showForm || !hasProfiles) {
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
              <Text style={styles.brand}>RESPIRA+</Text>
              <Text style={styles.title}>Registrar paciente</Text>
              <Text style={styles.subtitle}>
                Ingresa tu nombre y edad para crear tu perfil. Se generará una clave automática.
              </Text>
            </View>

            <View style={styles.formCard}>
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
                style={({ pressed }) => [
                  styles.primaryBtn,
                  !canSubmit && styles.btnDisabled,
                  pressed && canSubmit && styles.primaryBtnPressed,
                ]}
                onPress={onSubmitCreate}
                disabled={!canSubmit}
                accessibilityRole="button"
                accessibilityLabel="Crear perfil">
                {busyId === 'create' ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Crear perfil</Text>
                )}
              </Pressable>
            </View>

            {hasProfiles ? (
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
                onPress={() => {
                  setShowForm(false);
                  setNombre('');
                  setEdadText('');
                }}
                accessibilityRole="button">
                <Text style={styles.secondaryBtnText}>Volver a perfiles</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.textLinkBtn, pressed && styles.textLinkPressed]}
              onPress={() => router.push('/auth/login')}
              accessibilityRole="button">
              <Text style={styles.textLink}>Acceder con clave</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.brand}>RESPIRA+</Text>
          <Text style={styles.title}>Selecciona tu perfil</Text>
          <Text style={styles.subtitle}>
            Selecciona un perfil de este dispositivo o crea uno nuevo para comenzar.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
          onPress={() => setShowForm(true)}
          disabled={busyId != null}
          accessibilityRole="button"
          accessibilityLabel="Registrar paciente">
          <Text style={styles.primaryBtnText}>Registrar paciente</Text>
        </Pressable>

        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Perfiles en este dispositivo</Text>
          {loadingList ? (
            <ActivityIndicator color={authPalette.primary} style={styles.listLoader} />
          ) : (
            profiles.map((p) => {
              const busy = busyId === p.paciente_id;
              return (
                <Pressable
                  key={`${p.paciente_id}-${p.clave}`}
                  style={({ pressed }) => [
                    styles.profileRow,
                    pressed && !busy && styles.profileRowPressed,
                  ]}
                  onPress={() => void enterWithPatient(p)}
                  disabled={busyId != null}
                  accessibilityRole="button"
                  accessibilityLabel={`Usar perfil ${normalizePatientDisplayName(p.nombre_completo)}`}>
                  <View style={styles.profileRowText}>
                    <Text style={styles.profileName}>
                      {normalizePatientDisplayName(p.nombre_completo)}
                    </Text>
                    <Text style={styles.profileMeta}>Clave · {p.clave}</Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator color={authPalette.primary} />
                  ) : (
                    <Text style={styles.profileAction}>Usar</Text>
                  )}
                </Pressable>
              );
            })
          )}
        </View>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
          onPress={() => router.push('/auth/login')}
          disabled={busyId != null}
          accessibilityRole="button"
          accessibilityLabel="Acceder con clave">
          <Text style={styles.secondaryBtnText}>Acceder con clave</Text>
        </Pressable>
      </ScrollView>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  brand: {
    fontSize: 28,
    fontWeight: '700',
    color: authPalette.primary,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: authPalette.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    color: authPalette.textMuted,
    marginBottom: spacing.sm,
  },
  formCard: {
    backgroundColor: authPalette.cardGlass,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: authPalette.border,
    marginBottom: spacing.lg,
    ...wellnessShadows.card,
  },
  label: {
    fontSize: 17,
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
    fontSize: 15,
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
    fontSize: 17,
    fontWeight: '600',
    color: authPalette.text,
    marginBottom: spacing.sm,
  },
  keyValue: {
    fontSize: 36,
    fontWeight: '800',
    color: authPalette.primaryDark,
    letterSpacing: 2,
  },
  summaryCard: {
    backgroundColor: authPalette.card,
    borderRadius: wellnessRadii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: authPalette.border,
  },
  summaryLine: { fontSize: 17, color: authPalette.text, marginBottom: spacing.xs },
  summaryBold: { fontWeight: '700' },
  legalHint: {
    fontSize: 15,
    lineHeight: 22,
    color: authPalette.textMuted,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: authPalette.primary,
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...wellnessShadows.card,
  },
  primaryBtnPressed: {
    opacity: 0.92,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  listSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: authPalette.textMuted,
    marginBottom: spacing.sm,
  },
  listLoader: {
    marginVertical: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: wellnessRadii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  profileRowPressed: {
    backgroundColor: '#F8FAFA',
  },
  profileRowText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: authPalette.text,
  },
  profileMeta: {
    fontSize: 14,
    color: authPalette.textMuted,
    marginTop: 2,
  },
  profileAction: {
    fontSize: 16,
    fontWeight: '600',
    color: authPalette.primary,
  },
  secondaryBtn: {
    marginTop: spacing.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: authPalette.primary,
  },
  secondaryBtnPressed: {
    opacity: 0.9,
  },
  secondaryBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: authPalette.primary,
  },
  textLinkBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  textLinkPressed: {
    opacity: 0.8,
  },
  textLink: {
    fontSize: 17,
    fontWeight: '600',
    color: authPalette.link,
    textDecorationLine: 'underline',
  },
});
