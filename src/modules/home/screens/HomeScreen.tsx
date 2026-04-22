/**
 * Purpose: Patient home screen placeholder.
 * Module: home
 * Dependencies: react-native
 * Notes: Temporary base screen during routing migration.
 */
import { StyleSheet, Text, View } from 'react-native';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inicio</Text>
      <Text style={styles.text}>Pantalla base de Home para rehabilitacion pulmonar.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  text: {
    textAlign: 'center',
    fontSize: 16,
  },
});

