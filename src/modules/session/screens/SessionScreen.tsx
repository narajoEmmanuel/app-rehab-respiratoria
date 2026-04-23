/**
 * Purpose: Session entry screen placeholder.
 * Module: session
 * Dependencies: react-native, session/core, session/registry
 * Notes: Reads default level from registry; visual game not mounted yet.
 */
import { StyleSheet, Text, View } from 'react-native';

import { createIdleSessionSnapshot } from '@/src/modules/session/core/session-state';
import {
  DEFAULT_SESSION_LEVEL_ID,
  getLevelById,
} from '@/src/modules/session/registry/level-registry';

export function SessionScreen() {
  const level = getLevelById(DEFAULT_SESSION_LEVEL_ID);
  const snapshot = createIdleSessionSnapshot(DEFAULT_SESSION_LEVEL_ID);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sesion</Text>
      <Text style={styles.text}>Pantalla base para iniciar sesion terapeutica.</Text>
      {level ? (
        <>
          <Text style={styles.detail}>Nivel: {level.title}</Text>
          <Text style={styles.detail}>Dificultad: {level.difficulty}</Text>
          <Text style={styles.detail}>Juego visual: {level.gameVisualId}</Text>
          <Text style={styles.detail}>Estado: {snapshot.phase}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  text: { fontSize: 16, textAlign: 'center' },
  detail: { fontSize: 14, marginTop: 6, textAlign: 'center' },
});

