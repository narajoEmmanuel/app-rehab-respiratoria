/**
 * Purpose: Loading placeholder while session entry gates resolve.
 * Module: session
 */

import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { wellness } from '@/src/shared/theme/wellness-theme';

type Props = {
  showSensorHint?: boolean;
};

export function SessionLoadingState({ showSensorHint = false }: Props) {
  return (
    <SafeAreaView style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={wellness.primary} />
      {showSensorHint ? (
        <Text style={styles.loadingHint}>Verificando sensor y calibración…</Text>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: wellness.screenBg,
  },
  loadingHint: {
    marginTop: 12,
    color: wellness.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
