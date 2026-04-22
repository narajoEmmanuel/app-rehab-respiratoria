/**
 * Purpose: Session summary screen placeholder.
 * Module: summary
 * Dependencies: react-native
 * Notes: Will consume normalized session results later.
 */
import { StyleSheet, Text, View } from 'react-native';

export function SummaryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resumen</Text>
      <Text style={styles.text}>Pantalla base de resultados de sesion.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  text: { fontSize: 16, textAlign: 'center' },
});

