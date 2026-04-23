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
      <Text style={styles.greeting}>HOLA KIARA, FELICIDADES</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  greeting: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: -72 },
});

