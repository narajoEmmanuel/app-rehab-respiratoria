/**
 * Purpose: Stack-route guard for sensor (non-tab) when consent is inactive.
 * Module: legal
 */

import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAppMode } from '@/src/modules/app-mode';
import { isConsentActive } from '@/src/modules/legal/consent-service';
import { wellness } from '@/src/shared/theme/wellness-theme';

type Props = {
  children: ReactNode;
  /** Kept for route wrappers; consent bypass only applies in `offline_sensor_test` + enabled flag. */
  allowOfflineDevBypass?: boolean;
};

export function ConsentStackGuard({ children, allowOfflineDevBypass = false }: Props) {
  void allowOfflineDevBypass;
  const [gate, setGate] = useState<'loading' | 'ok' | 'blocked'>('loading');
  const { isOfflineSensorTestMode, offlineSensorTestEnabled } = useAppMode();

  useFocusEffect(
    useCallback(() => {
      if (isOfflineSensorTestMode && offlineSensorTestEnabled) {
        setGate('ok');
        return () => {};
      }

      let cancelled = false;
      void (async () => {
        const ok = await isConsentActive();
        if (!cancelled) setGate(ok ? 'ok' : 'blocked');
      })();
      return () => {
        cancelled = true;
      };
    }, [isOfflineSensorTestMode, offlineSensorTestEnabled]),
  );

  if (gate === 'loading') {
    return (
      <View style={styles.center} accessibilityLabel="Cargando permisos">
        <ActivityIndicator size="large" color={wellness.primary} />
      </View>
    );
  }

  if (gate === 'blocked') {
    return <Redirect href="/(tabs)" />;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: wellness.screenBg },
});
