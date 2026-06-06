/**
 * Purpose: Full-screen overlay shown while an interrupted session is being saved.
 * Module: session
 */

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { wellness } from '@/src/shared/theme/wellness-theme';

export function SessionSavingOverlay() {
  return (
    <View style={styles.savingOverlay} pointerEvents="auto">
      <ActivityIndicator size="large" color={wellness.primary} />
      <Text style={styles.savingOverlayText}>Guardando tu sesión…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  savingOverlayText: {
    marginTop: 12,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
