import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export function DiagnosticLockedView() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Realiza tu diagnóstico</Text>
      <Text style={styles.description}>
        Primero realiza tu diagnóstico para desbloquear tu terapia
      </Text>
      <Pressable style={styles.button} onPress={() => router.push('/diagnostico')}>
        <Text style={styles.buttonText}>Hacer diagnóstico</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: wellnessRadii.cardLarge,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    backgroundColor: wellness.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: wellness.textSecondary,
  },
  button: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
