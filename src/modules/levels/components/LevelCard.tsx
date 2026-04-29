import { Pressable, StyleSheet, Text, View } from 'react-native';

type LevelCardProps = {
  title: string;
  subtitle: string;
  locked: boolean;
  onPress: () => void;
};

export function LevelCard({ title, subtitle, locked, onPress }: LevelCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, locked ? styles.lockedCard : null, pressed ? styles.pressed : null]}
      onPress={onPress}
      disabled={locked}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.badge}>{locked ? 'Proximamente 🔒' : 'Jugar ▶'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#245501',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#97e05c',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lockedCard: {
    backgroundColor: '#344030',
    borderColor: '#899681',
    opacity: 0.9,
  },
  pressed: {
    opacity: 0.82,
  },
  title: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '700',
  },
  subtitle: {
    color: '#d8f7bf',
    marginTop: 4,
    fontSize: 14,
  },
  badge: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
