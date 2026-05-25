/**
 * Purpose: Level selection screen with lock states and persistence.
 * Module: levels
 * Dependencies: react-native, expo-router, levels/session
 * Notes: Level 1 playable now, levels 2-5 shown as locked/coming soon.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  showLevelPlayModePicker,
  showTherapyReadinessAlert,
  useTherapyReadinessGate,
} from '@/src/modules/device/volume-estimation';
import { logLevelSensorModeSelected } from '@/src/modules/session/sensor/level-sensor-debug';
import { evaluateLevelSensorReadiness } from '@/src/modules/session/sensor/level-sensor-readiness';
import { getPatientLevels } from '@/src/modules/diagnostics/diagnostic-service';
import type { PatientLevelRecord } from '@/src/modules/diagnostics/types';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import {
  buildLevelUnlockDiagnosticSnapshot,
  logLevelUnlockDiagnostics,
} from '@/src/modules/session/level-unlock-diagnostics';
import { getLevelDifficultyConfig } from '@/src/modules/session/levels/level-difficulty-config';
import { listLevels } from '@/src/modules/session/registry/level-registry';
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';
import { readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import {
  lifetimeStatsForPatientLevelRow,
  todayStatsForPatientLevelRow,
  type TodaySessionStats,
} from '@/src/modules/session/utils/today-session-stats';
import { TARGET_PERFECT_SESSIONS } from '@/src/modules/session/session-progress-service';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { TherapyLevelCard } from '@/src/shared/ui/therapy-level-card';
import type { TherapyLevelStatusChip } from '@/src/shared/ui/therapy-level-card';
import { isLevelEntryLockedForUi } from '@/src/config/dev-level-flags';
import { getLocalDateKey } from '@/src/shared/utils/local-date-key';
import { spacing } from '@/src/shared/theme/spacing';
import { dashboardScreen, dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { getLevelVisualIdentity } from '@/src/theme/level-colors';

/** Conteos acumulados (desbloqueo) y del día (cards / advertencia de hoy). */
type LevelDisplayStats = {
  lifetime: TodaySessionStats;
  today: TodaySessionStats;
};

function buildLevelDisplayStatsByPatientLevelId(
  levelsRows: PatientLevelRecord[],
  sessions: Awaited<ReturnType<typeof readAllSessions>>,
  todayKey: string,
): Record<number, LevelDisplayStats> {
  const statsByLevelId: Record<number, LevelDisplayStats> = {};
  for (const row of levelsRows) {
    statsByLevelId[row.patient_level_id] = {
      lifetime: lifetimeStatsForPatientLevelRow(sessions, row.patient_level_id),
      today: todayStatsForPatientLevelRow(sessions, row.patient_level_id, todayKey),
    };
  }
  return statsByLevelId;
}

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
  const { isLoading, selectLevel } = useLevelsProgress();
  const {
    refresh: refreshTherapyGate,
    lastReading,
    sensorConnected,
    sensorStatus,
  } = useTherapyReadinessGate();
  const levels = listLevels();
  const [patientLevels, setPatientLevels] = useState<PatientLevelRecord[]>([]);
  /** Stats por nivel: lifetime (progreso/desbloqueo) y today (completadas hoy en card). */
  const [levelStatsByPatientLevelId, setLevelStatsByPatientLevelId] = useState<
    Record<number, LevelDisplayStats>
  >({});
  const [startingLevelId, setStartingLevelId] = useState<LevelId | null>(null);
  const [lastReadingReceivedAtMs, setLastReadingReceivedAtMs] = useState<number | null>(null);

  useEffect(() => {
    if (!lastReading) return;
    setLastReadingReceivedAtMs(Date.now());
  }, [lastReading, lastReading?.distanceMm, lastReading?.timestamp]);

  useEffect(() => {
    let active = true;
    const loadLevels = async () => {
      if (!patient) {
        if (active) {
          setPatientLevels([]);
          setLevelStatsByPatientLevelId({});
        }
        return;
      }
      const [levelsRows, sessions] = await Promise.all([
        getPatientLevels(patient.paciente_id),
        readAllSessions(),
      ]);
      const today = getLocalDateKey();
      const statsByLevelId = buildLevelDisplayStatsByPatientLevelId(levelsRows, sessions, today);
      if (__DEV__) {
        logLevelUnlockDiagnostics(await buildLevelUnlockDiagnosticSnapshot(patient.paciente_id));
      }
      if (active) {
        setPatientLevels(levelsRows);
        setLevelStatsByPatientLevelId(statsByLevelId);
      }
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
        const [rows, sessions] = await Promise.all([
          getPatientLevels(patient.paciente_id),
          readAllSessions(),
        ]);
        const today = getLocalDateKey();
        const statsByLevelId = buildLevelDisplayStatsByPatientLevelId(rows, sessions, today);
        if (__DEV__) {
          logLevelUnlockDiagnostics(await buildLevelUnlockDiagnosticSnapshot(patient.paciente_id));
        }
        if (!cancelled) {
          setPatientLevels(rows);
          setLevelStatsByPatientLevelId(statsByLevelId);
        }
      };
      void refreshLevels();
      void refreshTherapyGate();
      return () => {
        cancelled = true;
      };
    }, [patient, refreshTherapyGate]),
  );

  const navigateToSession = useCallback(
    (levelId: LevelId, inputMode: SessionInputMode) => {
      selectLevel(levelId);
      router.push({
        pathname: '/(tabs)/sesion',
        params: {
          levelId,
          sessionRunId: `${levelId}-${Date.now()}`,
          inputMode,
        },
      });
    },
    [router, selectLevel],
  );

  const beginOfficialSensorSession = useCallback(
    async (levelId: LevelId) => {
      setStartingLevelId(levelId);
      try {
        const readiness = await evaluateLevelSensorReadiness({
          inputMode: 'sensor',
          sensorConnected,
          sensorStatus,
          lastReading,
          receivedAtMs: lastReadingReceivedAtMs,
          patientId: patient?.paciente_id ?? null,
        });

        if (!readiness.canStart) {
          if (readiness.blockReason === 'no_live_reading') {
            Alert.alert(
              'Esperando datos del sensor',
              'Conecta el sensor y verifica que esté enviando lecturas antes de comenzar.',
              [{ text: 'Entendido', style: 'default' }],
            );
            return;
          }
          showTherapyReadinessAlert(readiness.gate, (route) => router.push(route));
          return;
        }

        navigateToSession(levelId, 'sensor');
      } finally {
        setStartingLevelId(null);
      }
    },
    [
      lastReading,
      lastReadingReceivedAtMs,
      navigateToSession,
      patient?.paciente_id,
      router,
      sensorConnected,
      sensorStatus,
    ],
  );

  const beginPracticeMode = useCallback(
    (levelId: LevelId) => {
      navigateToSession(levelId, 'touch_practice');
    },
    [navigateToSession],
  );

  const onPlayLevel = useCallback(
    (levelId: LevelId, progressionLocked: boolean) => {
      if (progressionLocked || startingLevelId !== null) return;

      showLevelPlayModePicker({
        onWithSensor: () => {
          logLevelSensorModeSelected('sensor');
          void beginOfficialSensorSession(levelId);
        },
        onPracticeMode: () => {
          beginPracticeMode(levelId);
        },
      });
    },
    [beginOfficialSensorSession, beginPracticeMode, startingLevelId],
  );

  const scrollBottom = dashboardScrollBottomPadding(insets.bottom);
  const activePatientLevel = patientLevels.find((row) => row.level_status === 'active');
  const activeLevelStats =
    activePatientLevel != null
      ? levelStatsByPatientLevelId[activePatientLevel.patient_level_id]
      : undefined;
  /** Perfectas acumuladas (desbloqueo); completadas hoy (advertencia). */
  const perfectSessionsOnActive = activeLevelStats?.lifetime.perfect ?? 0;
  const sessionsCompletedTodayOnActive = activeLevelStats?.today.completed ?? 0;
  const showPerfectGapWarning =
    !isLoading &&
    activePatientLevel != null &&
    sessionsCompletedTodayOnActive >= TARGET_PERFECT_SESSIONS &&
    perfectSessionsOnActive < TARGET_PERFECT_SESSIONS;

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
          const progressionLocked = status === 'locked';
          const locked = isLevelEntryLockedForUi(progressionLocked, level.comingSoon);
          const levelStats = levelStatsByPatientLevelId[row?.patient_level_id ?? -1];
          const perfectTowardUnlock =
            levelStats?.lifetime.perfect ?? row?.perfect_sessions_completed ?? 0;
          const completedSessions =
            levelStats?.today.completed ?? row?.sessions_completed_today ?? 0;
          const visual = getLevelVisualIdentity(level.id);
          const difficultyConfig = getLevelDifficultyConfig(level.id);
          const identityLine = `Nivel ${visual.levelNumber} · ${difficultyConfig.description}`;
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
              targetVolumeMl={row?.target_volume ?? 0}
              completedSessionsDisplay={`${completedSessions}/${TARGET_PERFECT_SESSIONS}`}
              perfectSessionsDisplay={`${perfectTowardUnlock}/${TARGET_PERFECT_SESSIONS}`}
              helperText={
                locked
                  ? undefined
                  : statusChip === 'completed'
                    ? 'Nivel completado.'
                    : 'Completa 6 sesiones perfectas con sensor para avanzar.'
              }
              locked={locked}
              starting={startingLevelId === levelId}
              onPress={() => {
                onPlayLevel(levelId, locked);
              }}
            />
          );
        })}

        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>Desbloqueo del siguiente nivel</Text>
          <Text style={styles.messageText}>
            Completa 6 sesiones del nivel activo con 10 repeticiones válidas en cada una.
          </Text>
          {showPerfectGapWarning ? (
            <Text style={styles.warningText}>
              Hoy completaste {TARGET_PERFECT_SESSIONS} sesiones en tu nivel activo, pero faltan{' '}
              {TARGET_PERFECT_SESSIONS - perfectSessionsOnActive} perfectas para desbloquear el
              siguiente. Cada una debe tener 10 repeticiones válidas.
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
