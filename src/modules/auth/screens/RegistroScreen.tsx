/**
 * Purpose: Registration screen placeholder.
 * Module: auth
 * Dependencies: react-native
 * Notes: Lightweight scaffold, no signup logic yet.
 */
import { StyleSheet, Text, View } from 'react-native';

export function RegistroScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro</Text>
      <Text style={styles.text}>Pantalla base para alta de paciente.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  text: { fontSize: 16, textAlign: 'center' },
});

