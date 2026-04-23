/**
 * Purpose: History screen placeholder.
 * Module: history
 * Dependencies: react-native
 * Notes: Intended to show historical sessions and trends.
 */
import { StyleSheet, Text, View } from 'react-native';

export function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historial</Text>
      <Text style={styles.text}>Pantalla base de historial clinico del paciente.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  text: { fontSize: 16, textAlign: 'center' },
});

