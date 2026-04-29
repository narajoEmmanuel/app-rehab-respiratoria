/**
 * Purpose: Level selection screen with lock states and persistence.
 * Module: levels
 * Dependencies: react-native, expo-router, levels/session
 * Notes: Level 1 playable now, levels 2-5 shown as locked/coming soon.
 */
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LevelCard } from '@/src/modules/levels/components/LevelCard';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { listLevels } from '@/src/modules/session/registry/level-registry';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export function LevelsScreen() {
  const router = useRouter();
  const { progress, isLoading, selectLevel } = useLevelsProgress();
  const levels = listLevels();

  const onLevelPress = (levelId: LevelId) => {
    selectLevel(levelId);
    router.push({ pathname: '/(tabs)/sesion', params: { levelId } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Niveles</Text>
        <Text style={styles.subtitle}>Elige tu aventura respiratoria</Text>

        {levels.map((level) => {
          const locked = !progress.unlockedLevels.includes(level.id as LevelId) || !!level.comingSoon;
          return (
            <LevelCard
              key={level.id}
              title={level.title}
              subtitle={locked ? 'Bloqueado por ahora' : 'Disponible para jugar'}
              locked={locked}
              onPress={() => onLevelPress(level.id as LevelId)}
            />
          );
        })}

        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Regla de desbloqueo del Nivel 2</Text>
          <Text style={styles.messageText}>
            Debes completar 6 sesiones del Nivel 1 con 10 repeticiones validas cada una, sin fallos.
          </Text>
          {!isLoading && progress.levelOne.levelCompleted && !progress.levelOne.levelPerfect ? (
            <Text style={styles.warningText}>
              Completaste las sesiones del Nivel 1, pero necesitas repetirlo correctamente para desbloquear el siguiente nivel.
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellness.screenBg,
    paddingBottom: wellnessFloatingTabBarInset,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: wellness.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: 16,
    color: wellness.textSecondary,
  },
  messageCard: {
    marginTop: spacing.xs,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    padding: spacing.md,
  },
  messageTitle: {
    color: wellness.text,
    fontWeight: '700',
    fontSize: 16,
  },
  messageText: {
    marginTop: spacing.xs,
    color: wellness.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  warningText: {
    marginTop: spacing.xs,
    color: wellness.text,
    fontWeight: '700',
  },
});
