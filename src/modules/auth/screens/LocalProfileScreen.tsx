/**
 * Acceso local-first: bienvenida, registro guiado, clave generada y perfiles del dispositivo.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AuthWelcomeView } from '@/src/modules/auth/components/AuthWelcomeView';
import {
  AuthCard,
  AuthFlowChrome,
  AuthOutlineButton,
  AuthPrimaryButton,
  AuthSecondaryButton,
  AuthTitleBlock,
} from '@/src/modules/auth/components/AuthFlowChrome';
import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { isConsentActive } from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { normalizePatientDisplayName } from '@/src/modules/patient/patient-display';
import {
  createPatientLocal,
  listLocalPatientProfiles,
} from '@/src/modules/patient/patient-service';
import type { PatientRecord } from '@/src/modules/patient/types';
import { getErrorMessage } from '@/src/shared/utils/get-error-message';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

type LocalPhase = 'welcome' | 'create' | 'profiles';

export function LocalProfileScreen() {
  const router = useRouter();
  const { intent } = useLocalSearchParams<{ intent?: string }>();
  const { setSessionPatient } = usePatientSession();
  const [profiles, setProfiles] = useState<PatientRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [busyId, setBusyId] = useState<number | 'create' | null>(null);

  const [phase, setPhase] = useState<LocalPhase>('welcome');
  const [nombre, setNombre] = useState('');
  const [edadText, setEdadText] = useState('');
  const [createdPatient, setCreatedPatient] = useState<PatientRecord | null>(null);
  const [copyAck, setCopyAck] = useState(false);

  const edadNum = parseInt(edadText, 10);
  const edadValid = !Number.isNaN(edadNum) && edadNum >= 1 && edadNum <= 120;
  const canSubmit = nombre.trim().length >= 2 && edadValid && busyId !== 'create';

  const hasProfiles = profiles.length > 0;

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

  useEffect(() => {
    if (intent === 'create') {
      setPhase('create');
    }
  }, [intent]);

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
        setCopyAck(false);
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

  const onCopyKey = useCallback(() => {
    if (!createdPatient) return;
    void (async () => {
      try {
        await Share.share({
          message: `Clave de acceso RESPIRA+: ${createdPatient.clave}`,
        });
        setCopyAck(true);
      } catch {
        Alert.alert(
          'Tu clave de acceso',
          `${createdPatient.clave}\n\nGuárdala en un lugar seguro.`,
        );
        setCopyAck(true);
      }
    })();
  }, [createdPatient]);

  if (createdPatient) {
    return (
      <AuthFlowChrome step={{ current: 2, total: 4 }} showHeaderLogo>
        <AuthTitleBlock
          title="¡Todo listo!"
          subtitle="Guarda tu clave de acceso. La necesitarás cada vez que entres a la app."
        />

        <View style={styles.keyCard} accessibilityRole="summary">
          <Text style={styles.keyLabel}>Tu clave de acceso</Text>
          <Text style={styles.keyValue} accessibilityLabel={`Clave ${createdPatient.clave}`}>
            {createdPatient.clave}
          </Text>
        </View>

        <AuthOutlineButton
          label={copyAck ? 'Clave lista para compartir' : 'Copiar clave'}
          onPress={onCopyKey}
        />

        <AuthPrimaryButton
          label="Continuar a documentos"
          onPress={onContinueAfterCreate}
          loading={busyId === 'create'}
          disabled={busyId != null}
        />

        <AuthSecondaryButton
          label="Volver al acceso con clave"
          onPress={() => router.replace('/auth/login')}
          disabled={busyId != null}
        />
      </AuthFlowChrome>
    );
  }

  if (phase === 'profiles' && hasProfiles) {
    return (
      <AuthFlowChrome>
        <AuthTitleBlock
          title="Perfiles en este dispositivo"
          subtitle="Selecciona un perfil guardado o crea uno nuevo."
        />

        <View style={styles.listSection}>
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

        <AuthPrimaryButton label="Crear perfil" onPress={() => setPhase('create')} disabled={busyId != null} />
        <AuthSecondaryButton
          label="Volver a bienvenida"
          onPress={() => setPhase('welcome')}
          disabled={busyId != null}
        />
      </AuthFlowChrome>
    );
  }

  if (phase === 'create') {
    return (
      <AuthFlowChrome step={{ current: 1, total: 4 }} showHeaderLogo>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <AuthTitleBlock
            title="Creamos tu perfil"
            subtitle="Necesitamos algunos datos básicos para personalizar tu experiencia."
          />

          <AuthCard>
            <Text style={styles.fieldLabel}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. María González"
              placeholderTextColor={authPalette.textMuted}
              autoCapitalize="words"
              accessibilityLabel="Nombre completo"
            />

            <Text style={styles.fieldLabel}>Edad (años)</Text>
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
          </AuthCard>

          <Text style={styles.securityNote}>
            Tu información está segura y solo será usada en la app.
          </Text>

          <AuthPrimaryButton
            label="Continuar"
            onPress={onSubmitCreate}
            disabled={!canSubmit}
            loading={busyId === 'create'}
          />

          <AuthSecondaryButton
            label="Volver"
            onPress={() => {
              setPhase('welcome');
              setNombre('');
              setEdadText('');
            }}
          />
        </KeyboardAvoidingView>
      </AuthFlowChrome>
    );
  }

  return (
    <AuthWelcomeView
      onCreateProfile={() => setPhase('create')}
      onLoginWithKey={() => router.push('/auth/login')}
      hasDeviceProfiles={hasProfiles}
      onShowDeviceProfiles={hasProfiles ? () => setPhase('profiles') : undefined}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fieldLabel: {
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
    backgroundColor: '#fff',
  },
  helperError: {
    fontSize: 15,
    color: authPalette.errorText,
    marginBottom: spacing.sm,
  },
  securityNote: {
    fontSize: 15,
    lineHeight: 22,
    color: authPalette.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  keyCard: {
    backgroundColor: authPalette.successBg,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: authPalette.primary,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...wellnessShadows.soft,
  },
  keyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: authPalette.textMuted,
    marginBottom: spacing.sm,
  },
  keyValue: {
    fontSize: 40,
    fontWeight: '800',
    color: authPalette.primaryDark,
    letterSpacing: 3,
  },
  listSection: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
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
    borderWidth: 1,
    borderColor: authPalette.border,
    ...wellnessShadows.soft,
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
});
