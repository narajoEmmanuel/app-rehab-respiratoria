/**
 * Purpose: Entry gate — session present goes to tabs, else auth login.
 * Module: app routing
 * Dependencies: expo-router, patient session
 */

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { needsConsent } from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';

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

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: authPalette.screenBg,
  },
});
