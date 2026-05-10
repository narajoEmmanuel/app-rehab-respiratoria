/**
 * Purpose: Entry gate — optional local sensor bootstrap, else session → tabs or auth.
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

const OFFLINE_EXPERIMENTAL_NOTICE =
  'Este modo es experimental, no clínico y no sincroniza datos.';

/**
 * Pantalla inicial cuando la bandera de prueba local está activa: no exige login,
 * Supabase ni consentimiento para el camino de hardware local.
 */
function AppBootstrapWithOfflineOption() {
  const router = useRouter();
  const { patient } = usePatientSession();
  const { setMode, resetMode } = useAppMode();

  const goOfflineSensorTest = () => {
    setMode('offline_sensor_test');
    router.replace('/sensor-connection');
  };

  const goOnlineFlow = () => {
    resetMode();
    if (!patient) {
      router.replace('/auth/login');
      return;
    }
    void needsConsent().then((need) => {
      if (need) {
        router.replace(LEGAL_ACCEPT_HREF);
      } else {
        router.replace('/(tabs)');
      }
    });
  };

  return (
    <View style={styles.center}>
      <View style={styles.card}>
        <Text style={styles.headline}>RESPIRA+</Text>

        <View style={styles.localSection}>
          <Text style={styles.localTitle}>Modo local de prueba de sensor</Text>
          <Text style={styles.localLine}>No clínico</Text>
          <Text style={styles.localLine}>No sincronizado</Text>
          <Text style={styles.localLine}>Solo disponible en desarrollo</Text>
          <Text style={styles.experimentalBlock}>{OFFLINE_EXPERIMENTAL_NOTICE}</Text>
          <Pressable
            style={({ pressed }) => [styles.localCta, pressed && styles.localCtaPressed]}
            onPress={goOfflineSensorTest}
            accessibilityRole="button"
            accessibilityLabel="Abrir modo local de prueba de sensor"
          >
            <Text style={styles.localCtaLabel}>Abrir prueba de sensor</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Text style={styles.onlineHint}>Flujo online: cuenta real, consentimiento y sincronización.</Text>
        <Pressable
          style={({ pressed }) => [styles.onlineButton, pressed && styles.onlineButtonPressed]}
          onPress={goOnlineFlow}
          accessibilityRole="button"
          accessibilityLabel="Iniciar sesión o continuar con cuenta"
        >
          <Text style={styles.onlineButtonLabel}>Iniciar sesión o continuar con cuenta</Text>
        </Pressable>
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
    if (isOfflineSensorTestEnabled()) {
      setConsentLoading(false);
      setMustAcceptLegal(false);
      return;
    }
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

  if (isOfflineSensorTestEnabled()) {
    return <AppBootstrapWithOfflineOption />;
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
  localSection: {
    marginBottom: 8,
  },
  localTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: authPalette.text,
    marginBottom: 10,
  },
  localLine: {
    fontSize: 14,
    color: authPalette.textMuted,
    marginBottom: 4,
  },
  experimentalBlock: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: authPalette.primaryDark,
    fontWeight: '500',
  },
  localCta: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authPalette.borderStrong,
    alignItems: 'center',
    backgroundColor: authPalette.screenBg,
  },
  localCtaPressed: {
    opacity: 0.88,
  },
  localCtaLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: authPalette.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: authPalette.border,
    marginVertical: 20,
  },
  onlineHint: {
    fontSize: 13,
    color: authPalette.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  onlineButton: {
    backgroundColor: authPalette.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  onlineButtonPressed: {
    backgroundColor: authPalette.primaryPressed,
  },
  onlineButtonLabel: {
    color: authPalette.primaryOnBrand,
    fontSize: 16,
    fontWeight: '600',
  },
});
