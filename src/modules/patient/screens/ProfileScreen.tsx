/**
 * Purpose: Basic profile hub placeholder for patient settings/navigation.
 * Module: patient
 * Dependencies: expo-router, patient session, wellness theme
 * Notes: No deep settings, social auth, or legal flow implemented yet.
 */
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export function ProfileScreen() {
  const router = useRouter();
  const { patient, clearSession } = usePatientSession();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Perfil</Text>
        <Text style={styles.subtitle}>Espacio básico de cuenta del paciente.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos del paciente</Text>
          <Text style={styles.line}>Nombre: {patient?.nombre_completo ?? 'No disponible'}</Text>
          <Text style={styles.line}>Edad: {patient?.edad ?? '-'} años</Text>
          <Text style={styles.line}>Clave: {patient?.clave ?? 'No disponible'}</Text>
        </View>

        <View style={styles.list}>
          <View style={styles.item}>
            <Text style={styles.itemTitle}>Configuración</Text>
            <Text style={styles.itemText}>Opciones de cuenta y app (placeholder).</Text>
          </View>
          <View style={styles.item}>
            <Text style={styles.itemTitle}>Términos y condiciones</Text>
            <Text style={styles.itemText}>Se habilitará en una fase posterior.</Text>
          </View>
        </View>

        <Pressable
          style={styles.logoutBtn}
          onPress={async () => {
            await clearSession();
            router.replace('/auth/login');
          }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión">
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellness.screenBg,
    paddingBottom: wellnessFloatingTabBarInset,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: wellness.text,
  },
  subtitle: {
    fontSize: 16,
    color: wellness.textSecondary,
  },
  card: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.primaryDark,
    marginBottom: spacing.xs,
  },
  line: {
    fontSize: 15,
    color: wellness.text,
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.text,
    marginBottom: spacing.xs,
  },
  itemText: {
    fontSize: 14,
    color: wellness.textSecondary,
  },
  logoutBtn: {
    marginTop: 'auto',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: wellnessRadii.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    backgroundColor: wellness.softGreen,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
});
