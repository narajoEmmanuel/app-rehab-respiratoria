/**
 * Purpose: Difficulty level selection base screen.
 * Module: levels
 * Dependencies: react-native
 * Notes: Level and game type are intentionally separated.
 */
import { StyleSheet, Text, View } from 'react-native';

export function LevelsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Niveles</Text>
      <Text style={styles.text}>Seleccion de nivel (base).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  text: { fontSize: 16, textAlign: 'center' },
});

