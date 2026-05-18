/**
 * Acceso local-first: seleccionar perfil existente o crear uno nuevo (acción explícita).
 */
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { seedLocalPrototypeConsentForPatient } from '@/src/modules/legal/consent-service';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { normalizePatientDisplayName } from '@/src/modules/patient/patient-display';
import {
  createLocalPatientProfile,
  listLocalPatientProfiles,
} from '@/src/modules/patient/patient-service';
import type { PatientRecord } from '@/src/modules/patient/types';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';

export function LocalProfileScreen() {
  const router = useRouter();
  const { setSessionPatient } = usePatientSession();
  const [profiles, setProfiles] = useState<PatientRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [busyId, setBusyId] = useState<number | 'create' | null>(null);

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
        await seedLocalPrototypeConsentForPatient(patient.paciente_id);
        router.replace('/(tabs)');
      } catch {
        Alert.alert('Error', 'No se pudo activar el perfil. Inténtalo nuevamente.');
      } finally {
        setBusyId(null);
      }
    },
    [router, setSessionPatient],
  );

  const onCreateProfile = useCallback(() => {
    void (async () => {
      setBusyId('create');
      try {
        const patient = await createLocalPatientProfile();
        await seedLocalPrototypeConsentForPatient(patient.paciente_id);
        await setSessionPatient(patient);
        router.replace('/(tabs)');
      } catch {
        Alert.alert('Error', 'No se pudo crear el perfil. Inténtalo nuevamente.');
      } finally {
        setBusyId(null);
      }
    })();
  }, [router, setSessionPatient]);

  const hasProfiles = profiles.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.brand}>RESPIRA+</Text>
          <Text style={styles.title}>No hay perfil activo</Text>
          <Text style={styles.subtitle}>
            {hasProfiles
              ? 'Selecciona un perfil de este dispositivo o crea uno nuevo para comenzar.'
              : 'No hay perfiles locales registrados en este dispositivo.'}
          </Text>
          <Text style={styles.hint}>Crea un perfil para comenzar.</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            busyId === 'create' && styles.btnDisabled,
            pressed && busyId !== 'create' && styles.primaryBtnPressed,
          ]}
          onPress={onCreateProfile}
          disabled={busyId != null}
          accessibilityRole="button"
          accessibilityLabel="Crear perfil">
          {busyId === 'create' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Crear perfil</Text>
          )}
        </Pressable>

        {hasProfiles ? (
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
        ) : null}

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
  hint: {
    fontSize: 15,
    color: authPalette.textMuted,
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
});
