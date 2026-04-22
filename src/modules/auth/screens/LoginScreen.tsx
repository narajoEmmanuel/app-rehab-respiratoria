/**
 * Purpose: Login screen placeholder.
 * Module: auth
 * Dependencies: react-native
 * Notes: Lightweight scaffold, no auth logic yet.
 */
import { StyleSheet, Text, View } from 'react-native';

export function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.text}>Pantalla base de autenticacion.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  text: { fontSize: 16, textAlign: 'center' },
});

