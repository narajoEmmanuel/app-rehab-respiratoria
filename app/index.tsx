/**
 * Purpose: Entry gate — session present goes to tabs, else auth login.
 * Module: app routing
 * Dependencies: expo-router, patient session
 */

import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';

export default function IndexGate() {
  const { patient, hydrated } = usePatientSession();

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={authPalette.primary} accessibilityLabel="Cargando" />
      </View>
    );
  }

  if (patient) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: authPalette.screenBg,
  },
});
