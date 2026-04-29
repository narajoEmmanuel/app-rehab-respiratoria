/**
 * Purpose: Level selection screen with lock states and persistence.
 * Module: levels
 * Dependencies: react-native, expo-router, levels/session
 * Notes: Level 1 playable now, levels 2-5 shown as locked/coming soon.
 */
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LevelCard } from '@/src/modules/levels/components/LevelCard';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { listLevels } from '@/src/modules/session/registry/level-registry';

export function LevelsScreen() {
  const router = useRouter();
  const { progress, isLoading, selectLevel } = useLevelsProgress();
  const levels = listLevels();

  const onLevelPress = (levelId: LevelId) => {
    selectLevel(levelId);
    router.push({ pathname: '/(tabs)/sesion', params: { levelId } });
  };

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 30,
    backgroundColor: '#1f3f14',
  },
  title: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 16,
    color: '#d7f6c8',
  },
  messageCard: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#9de765',
    backgroundColor: '#254f15',
    padding: 14,
  },
  messageTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  messageText: {
    marginTop: 6,
    color: '#d7ffc4',
    fontSize: 14,
    lineHeight: 20,
  },
  warningText: {
    marginTop: 8,
    color: '#ffe596',
    fontWeight: '700',
  },
});

