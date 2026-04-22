/**
 * Purpose: Calendar screen placeholder.
 * Module: plans
 * Dependencies: react-native
 * Notes: No scheduling logic yet.
 */
import { StyleSheet, Text, View } from 'react-native';

export function CalendarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendario</Text>
      <Text style={styles.text}>Pantalla base del calendario terapeutico.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  text: { fontSize: 16, textAlign: 'center' },
});

