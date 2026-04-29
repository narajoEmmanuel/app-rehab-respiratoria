import { StyleSheet, Text, View } from 'react-native';

type ProgressHudProps = {
  session: number;
  repetition: number;
  valid: number;
  failed: number;
};

export function ProgressHud({ session, repetition, valid, failed }: ProgressHudProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.item}>Sesion {session} de 6</Text>
      <Text style={styles.item}>Repeticion {repetition} de 10</Text>
      <Text style={styles.item}>Validas: {valid}</Text>
      <Text style={styles.item}>Fallidas: {failed}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  item: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(14,43,8,0.68)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
});
