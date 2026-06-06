/**
 * Purpose: Entry gate — local-first or cloud session → tabs or auth.
 * Module: app routing
 * Dependencies: expo-router, patient session, app-mode, consent
 */

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { LOCAL_PROFILE_HREF } from '@/src/modules/auth/local-profile-hrefs';
import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { isCloudAuthEnabled } from '@/src/modules/app-mode/app-mode-config';
import { isConsentActive, needsConsent } from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';

export default function IndexGate() {
  const { patient, hydrated } = usePatientSession();
  const [consentLoading, setConsentLoading] = useState(false);
  const [mustAcceptLegal, setMustAcceptLegal] = useState(false);
  const [consentReady, setConsentReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;

    if (!patient) {
      setConsentLoading(false);
      setMustAcceptLegal(false);
      setConsentReady(true);
      return;
    }

    let cancelled = false;
    setConsentReady(false);
    setConsentLoading(true);

    const checkConsent = isCloudAuthEnabled()
      ? needsConsent
      : async () => !(await isConsentActive());

    void checkConsent()
      .then((need) => {
        if (!cancelled) {
          setMustAcceptLegal(need);
        }
      })
      .catch((error) => {
        console.warn('[IndexGate] consent check failed', error);
        if (!cancelled) {
          setMustAcceptLegal(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setConsentLoading(false);
          setConsentReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, patient]);

  const patientConsentPending = hydrated && patient != null && !consentReady;

  if (!hydrated || patientConsentPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={authPalette.primary} accessibilityLabel="Cargando" />
      </View>
    );
  }

  if (isCloudAuthEnabled()) {
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

  if (!patient) {
    return <Redirect href={LOCAL_PROFILE_HREF} />;
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
});
