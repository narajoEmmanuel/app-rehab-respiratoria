/**
 * Purpose: Level selection screen with lock states and persistence.
 * Module: levels
 * Dependencies: react-native, expo-router, levels/session
 * Notes: Level 1 playable now, levels 2-5 shown as locked/coming soon.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPatientLevels } from '@/src/modules/diagnostics/diagnostic-service';
import type { PatientLevelRecord } from '@/src/modules/diagnostics/types';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { listLevels } from '@/src/modules/session/registry/level-registry';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import type { TherapyLevelStatusChip } from '@/src/shared/ui/therapy-level-card';
import { TherapyLevelCard } from '@/src/shared/ui/therapy-level-card';
import { spacing } from '@/src/shared/theme/spacing';
import { dashboardScreen, dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { getLevelVisualIdentity } from '@/src/theme/level-colors';

function deriveTherapyLevelPresentation(params: {
  status: PatientLevelRecord['level_status'] | undefined;
  locked: boolean;
  perfectTowardUnlock: number;
}): { statusChip: TherapyLevelStatusChip; motivationalCopy: string } {
  const { status, locked, perfectTowardUnlock } = params;
  if (status === 'completed') {
    return {
      statusChip: 'completed',
      motivationalCopy: 'Consolidas tu avance en este nivel.',
    };
  }
  if (locked) {
    return {
      statusChip: 'locked',
      motivationalCopy: 'Completa el nivel anterior para desbloquearlo.',
    };
  }
  if (perfectTowardUnlock > 0) {
    return {
      statusChip: 'in_progress',
      motivationalCopy: 'Vas avanzando — mantén la constancia.',
    };
  }
  return {
    statusChip: 'available',
    motivationalCopy: 'Listo para iniciar.',
  };
}

export function LevelsScreen({
  headerSubtitle = 'Completa sesiones guiadas y desbloquea nuevos retos respiratorios.',
}: {
  headerSubtitle?: string;
} = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      const levelsRows = await getPatientLevels(patient.paciente_id);
      if (active) setPatientLevels(levelsRows);
    };
    void loadLevels();
    return () => {
      active = false;
    };
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const refreshLevels = async () => {
        if (!patient) return;
        const rows = await getPatientLevels(patient.paciente_id);
        if (!cancelled) setPatientLevels(rows);
      };
      void refreshLevels();
      return () => {
        cancelled = true;
      };
    }, [patient]),
  );

  const onLevelPress = (levelId: LevelId) => {
    selectLevel(levelId);
    router.push({
      pathname: '/(tabs)/sesion',
      params: {
        levelId,
        sessionRunId: `${levelId}-${Date.now()}`,
      },
    });
  };

  const scrollBottom = dashboardScrollBottomPadding(insets.bottom);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar onPressProfile={() => router.push('/profile')} />
        <View style={styles.blockedContainer}>
          <Text style={styles.screenTitle}>Avanza a tu ritmo</Text>
          <Text style={styles.tagline}>Cargando niveles…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar onPressProfile={() => router.push('/profile')} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Avanza a tu ritmo</Text>
        <Text style={styles.tagline}>{headerSubtitle}</Text>

        {levels.map((level) => {
          const levelId = level.id as LevelId;
          const row = patientLevels.find((item) => item.level_id === levelId);
          const status = row?.level_status ?? 'locked';
          const locked = status === 'locked' || !!level.comingSoon;
          const perfectTowardUnlock = row?.perfect_sessions_completed ?? 0;
          const completedToday = row?.sessions_completed_today ?? 0;
          const visual = getLevelVisualIdentity(level.id);
          const identityLine = `Nivel ${visual.levelNumber} · ${visual.semantic}`;
          const { statusChip, motivationalCopy } = deriveTherapyLevelPresentation({
            status,
            locked,
            perfectTowardUnlock,
          });
          return (
            <TherapyLevelCard
              key={level.id}
              title={level.title}
              levelIdentityLine={identityLine}
              accentColor={visual.accent}
              identitySoftBg={visual.accentSoft}
              statusChip={statusChip}
              motivationalCopy={motivationalCopy}
              targetVolumeText={`Meta aprox: ${row?.target_volume ?? 0} mL`}
              sessionsText={`Sesiones perfectas: ${perfectTowardUnlock}/6 · Completadas hoy: ${completedToday}/6`}
              helperText={
                locked
                  ? undefined
                  : 'Completa 6 sesiones perfectas en el nivel activo para desbloquear el siguiente.'
              }
              locked={locked}
              onPress={() => onLevelPress(levelId)}
            />
          );
        })}

        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Desbloqueo del siguiente nivel</Text>
          <Text style={styles.messageText}>
            Completa 6 sesiones del nivel activo con 10 repeticiones válidas en cada una.
          </Text>
          {!isLoading && progress.levelOne.levelCompleted && !progress.levelOne.levelPerfect ? (
            <Text style={styles.warningText}>
              Ya completaste las sesiones del Nivel 1. Para desbloquear el siguiente, alcanza 6 sesiones con 10
              repeticiones válidas en cada una.
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
    backgroundColor: dashboardScreen.screenBg,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: dashboardScreen.screenPaddingHorizontal,
    paddingTop: spacing.md,
  },
  blockedContainer: {
    flex: 1,
    paddingHorizontal: dashboardScreen.screenPaddingHorizontal,
    paddingTop: spacing.md,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: dashboardScreen.textPrimaryStrong,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 22,
    color: dashboardScreen.textSecondary,
    marginBottom: spacing.lg,
  },
  messageCard: {
    marginTop: spacing.xs,
    borderRadius: dashboardScreen.cardRadius,
    borderWidth: 1,
    borderColor: dashboardScreen.cardBorderColor,
    backgroundColor: dashboardScreen.cardBg,
    padding: spacing.lg,
  },
  messageTitle: {
    color: dashboardScreen.textPrimary,
    fontWeight: '700',
    fontSize: 17,
  },
  messageText: {
    marginTop: spacing.sm,
    color: dashboardScreen.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  warningText: {
    marginTop: spacing.sm,
    color: dashboardScreen.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
  },
});
