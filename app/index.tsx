/**
 * Purpose: Entry gate — local-first prototype or cloud session → tabs or auth.
 * Module: app routing
 * Dependencies: expo-router, patient session, app-mode, consent
 */

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { isCloudAuthEnabled } from '@/src/modules/app-mode/app-mode-config';
import { authPalette } from '@/src/modules/auth/theme/auth-palette';
import { needsConsent, seedLocalPrototypeConsentForPatient } from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { ensureLocalPrototypePatientRecord } from '@/src/modules/patient/patient-service';

export default function IndexGate() {
  const { patient, hydrated, refreshSession } = usePatientSession();
  const [localBootstrapDone, setLocalBootstrapDone] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [mustAcceptLegal, setMustAcceptLegal] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (isCloudAuthEnabled()) {
      setLocalBootstrapDone(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const p = await ensureLocalPrototypePatientRecord();
        await seedLocalPrototypeConsentForPatient(p.paciente_id);
        await refreshSession();
      } catch (e) {
        console.warn('Local prototype bootstrap failed', e);
      }
      if (!cancelled) setLocalBootstrapDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, refreshSession]);

  useEffect(() => {
    if (!hydrated || !localBootstrapDone) return;
    if (!isCloudAuthEnabled()) {
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
  }, [hydrated, localBootstrapDone, patient]);

  if (!hydrated || !localBootstrapDone) {
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
