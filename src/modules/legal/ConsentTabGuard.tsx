/**
 * Purpose: Redirect to Inicio when consent is not active (deep-link / tab defence).
 * Module: legal
 */

import type { ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { isConsentActive } from '@/src/modules/legal/consent-service';
import { wellness } from '@/src/shared/theme/wellness-theme';

type Props = {
  children: ReactNode;
};

export function ConsentTabGuard({ children }: Props) {
  const [gate, setGate] = useState<'loading' | 'ok' | 'blocked'>('loading');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const ok = await isConsentActive();
        if (!cancelled) setGate(ok ? 'ok' : 'blocked');
      })();
      return () => {
        cancelled = true;
      };
    }, []),
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
