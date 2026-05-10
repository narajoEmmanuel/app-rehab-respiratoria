/**
 * Purpose: Entry gate — session present goes to tabs, else auth login.
 * Module: app routing
 * Dependencies: expo-router, patient session, app-mode
 */

import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { isOfflineSensorTestEnabled, useAppMode } from '@/src/modules/app-mode';
import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { needsConsent } from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';

function OfflineSensorTestEntryPanel() {
  const router = useRouter();
  const { setMode, resetMode } = useAppMode();

  const goNormalApp = () => {
    resetMode();
    router.replace('/(tabs)');
  };

  const goOfflineSensorTest = () => {
    setMode('offline_sensor_test');
    router.replace('/sensor-connection');
  };

  return (
    <View style={styles.center}>
      <View style={styles.card}>
        <Text style={styles.headline}>RESPIRA+</Text>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={goNormalApp}
          accessibilityRole="button"
          accessibilityLabel="Entrar a la app en modo normal"
        >
          <Text style={styles.primaryButtonLabel}>Entrar a la app</Text>
        </Pressable>

        <View style={styles.devSection}>
          <Text style={styles.devTitle}>Modo local de prueba de sensor</Text>
          <Text style={styles.devLine}>No clínico</Text>
          <Text style={styles.devLine}>No sincronizado</Text>
          <Text style={styles.devLine}>Solo disponible en desarrollo</Text>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
            onPress={goOfflineSensorTest}
            accessibilityRole="button"
            accessibilityLabel="Abrir modo local de prueba de sensor"
          >
            <Text style={styles.secondaryButtonLabel}>Abrir prueba de sensor</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function IndexGate() {
  const { patient, hydrated } = usePatientSession();
  const [consentLoading, setConsentLoading] = useState(false);
  const [mustAcceptLegal, setMustAcceptLegal] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!patient) {
      setConsentLoading(false);
      setMustAcceptLegal(false);
      return;
    }
    let cancelled = false;
    setConsentLoading(true);
    void needsConsent().then((need) => {
      if (!cancelled) {
        setMustAcceptLegal(need);
        setConsentLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, patient]);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={authPalette.primary} accessibilityLabel="Cargando" />
      </View>
    );
  }

  if (!patient) {
    return <Redirect href="/auth/login" />;
  }

  if (consentLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={authPalette.primary} accessibilityLabel="Cargando" />
      </View>
    );
  }

  if (mustAcceptLegal) {
    return <Redirect href={LEGAL_ACCEPT_HREF} />;
  }

  if (isOfflineSensorTestEnabled()) {
    return <OfflineSensorTestEntryPanel />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: authPalette.screenBg,
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: authPalette.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: authPalette.border,
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: authPalette.primaryDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: authPalette.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: authPalette.primaryPressed,
  },
  primaryButtonLabel: {
    color: authPalette.primaryOnBrand,
    fontSize: 16,
    fontWeight: '600',
  },
  devSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: authPalette.border,
  },
  devTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: authPalette.text,
    marginBottom: 10,
  },
  devLine: {
    fontSize: 14,
    color: authPalette.textMuted,
    marginBottom: 4,
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authPalette.borderStrong,
    alignItems: 'center',
    backgroundColor: authPalette.screenBg,
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: authPalette.primaryDark,
  },
});
