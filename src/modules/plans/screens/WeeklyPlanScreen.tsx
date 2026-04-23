/**
 * Purpose: Weekly plan screen placeholder.
 * Module: plans
 * Dependencies: react-native
 * Notes: No plan orchestration logic yet.
 */
import { StyleSheet, Text, View } from 'react-native';

export function WeeklyPlanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan semanal</Text>
      <Text style={styles.text}>Pantalla base para el plan semanal.</Text>
      <Text style={styles.ferTag}>Fer was here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  text: { fontSize: 16, textAlign: 'center' },
  ferTag: { marginTop: 16, fontSize: 16, fontWeight: '600', color: '#ec4899', textAlign: 'center' },
});

