/**
 * Purpose: Level selection screen with lock states and persistence.
 * Module: levels
 * Dependencies: react-native, expo-router, levels/session
 * Notes: Level 1 playable now, levels 2-5 shown as locked/coming soon.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPatientLevels } from '@/src/modules/diagnostics/diagnostic-service';
import type { PatientLevelRecord } from '@/src/modules/diagnostics/types';
import { LevelCard } from '@/src/modules/levels/components/LevelCard';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { listLevels } from '@/src/modules/session/registry/level-registry';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii } from '@/src/shared/theme/wellness-theme';

export function LevelsScreen({
  headerSubtitle = 'Elige tu aventura respiratoria',
}: {
  headerSubtitle?: string;
} = {}) {
  const router = useRouter();
  const { patient } = usePatientSession();
  const { progress, isLoading, selectLevel } = useLevelsProgress();
  const levels = listLevels();
  const [patientLevels, setPatientLevels] = useState<PatientLevelRecord[]>([]);

  useEffect(() => {
    let active = true;
    const loadLevels = async () => {
      if (!patient) {
        if (active) setPatientLevels([]);
        return;
      }
      const rows = await getPatientLevels(patient.paciente_id);
      if (active) setPatientLevels(rows);
    };
    void loadLevels();
    return () => {
      active = false;
    };
  }, [patient]);

  const onLevelPress = (levelId: LevelId) => {
    selectLevel(levelId);
    router.push({ pathname: '/(tabs)/sesion', params: { levelId } });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar onPressProfile={() => router.push('/profile')} />
        <View style={styles.blockedContainer}>
          <Text style={styles.subtitle}>Cargando niveles…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar onPressProfile={() => router.push('/profile')} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>{headerSubtitle}</Text>

        {levels.map((level) => {
          const levelId = level.id as LevelId;
          const row = patientLevels.find((item) => item.level_id === levelId);
          const status = row?.level_status ?? 'locked';
          const locked = status === 'locked' || !!level.comingSoon;
          const statusLabel =
            status === 'active' ? 'Disponible / Activo' : status === 'completed' ? 'Completado' : 'Bloqueado';
          const sessionsDone = row?.perfect_sessions_completed ?? 0;
          return (
            <LevelCard
              key={level.id}
              title={level.title}
              statusLabel={statusLabel}
              statusTone={status === 'completed' ? 'completed' : status === 'active' ? 'active' : 'locked'}
              targetVolumeText={`Meta aprox: ${row?.target_volume ?? 0} mL`}
              sessionsText={`Sesiones completadas: ${sessionsDone}/6`}
              helperText="Completa 6 sesiones perfectas para desbloquear el siguiente nivel"
              locked={locked}
              onPress={() => onLevelPress(levelId)}
            />
          );
        })}

        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Regla de desbloqueo del Nivel 2</Text>
          <Text style={styles.messageText}>
            Debes completar 6 sesiones del nivel activo con 10 repeticiones válidas cada una.
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
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
