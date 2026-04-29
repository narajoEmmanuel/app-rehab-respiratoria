import { Pressable, StyleSheet, Text, View } from 'react-native';

type LevelCardProps = {
  title: string;
  statusLabel: string;
  statusTone: 'active' | 'locked' | 'completed';
  targetVolumeText: string;
  sessionsText: string;
  helperText: string;
  locked: boolean;
  onPress: () => void;
};

export function LevelCard({
  title,
  statusLabel,
  statusTone,
  targetVolumeText,
  sessionsText,
  helperText,
  locked,
  onPress,
}: LevelCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, locked ? styles.lockedCard : null, pressed ? styles.pressed : null]}
      onPress={onPress}
      disabled={locked}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.statusPill, statusTone === 'completed' ? styles.completedPill : statusTone === 'locked' ? styles.lockedPill : styles.activePill]}>
          {statusLabel}
        </Text>
        <Text style={styles.subtitle}>{targetVolumeText}</Text>
        <Text style={styles.subtitle}>{sessionsText}</Text>
        <Text style={styles.helper}>{helperText}</Text>
      </View>
      <View style={styles.badgeWrap}>
        <Text style={styles.badge}>{locked ? 'Bloqueado 🔒' : 'Jugar ▶'}</Text>
      </View>
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
    alignItems: 'flex-start',
    gap: 10,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
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
  helper: {
    color: '#c8efaf',
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '800',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
    color: '#ffffff',
  },
  activePill: { backgroundColor: '#1f8d53' },
  lockedPill: { backgroundColor: '#6b7280' },
  completedPill: { backgroundColor: '#2c7be5' },
  badgeWrap: {
    alignSelf: 'center',
    maxWidth: 110,
    alignItems: 'flex-end',
  },
  badge: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'right',
  },
});
