/**
 * Purpose: Weekly plan screen placeholder.
 * Module: plans
 * Dependencies: react-native
 * Notes: No plan orchestration logic yet.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiagnosticLockedView } from '@/src/modules/diagnostics/components/DiagnosticLockedView';
import { hasDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export function WeeklyPlanScreen() {
  const router = useRouter();
  const { patient } = usePatientSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!patient) {
        if (active) setReady(false);
        return;
      }
      const exists = await hasDiagnostic(patient.paciente_id);
      if (active) setReady(exists);
    };
    void load();
    return () => {
      active = false;
    };
  }, [patient]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar title="Plan" onPressProfile={() => router.push('/profile')} />
      <View style={styles.container}>
        {!ready ? (
          <DiagnosticLockedView />
        ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan semanal</Text>
          <Text style={styles.text}>Pantalla base para el plan semanal.</Text>
        </View>
        )}
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
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: wellness.primaryDark, marginBottom: spacing.sm },
  text: { fontSize: 16, textAlign: 'center', color: wellness.textSecondary, lineHeight: 24 },
});

