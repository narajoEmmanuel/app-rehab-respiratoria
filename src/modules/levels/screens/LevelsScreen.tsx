/**
 * Purpose: Level selection screen — guided therapy with progression and evaluation CTA.
 * Module: levels
 * Dependencies: react-native, expo-router, levels/session, shared/ui components
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  showLevelPlayModePicker,
  showTherapyReadinessAlert,
  useTherapyReadinessGate,
} from '@/src/modules/device/volume-estimation';
import { logLevelSensorModeSelected } from '@/src/modules/session/sensor/level-sensor-debug';
import { evaluateLevelSensorReadiness } from '@/src/modules/session/sensor/level-sensor-readiness';
import { getLatestDiagnostic, getPatientLevels } from '@/src/modules/diagnostics/diagnostic-service';
import type { DiagnosticRecord, PatientLevelRecord } from '@/src/modules/diagnostics/types';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import {
  buildLevelUnlockDiagnosticSnapshot,
  logLevelUnlockDiagnostics,
} from '@/src/modules/session/level-unlock-diagnostics';
import {
  getLevelDifficultyConfig,
  getLevelDisplayMeta,
} from '@/src/modules/session/levels/level-difficulty-config';
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
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppButton } from '@/src/shared/ui/AppButton';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { MetricTile } from '@/src/shared/ui/MetricTile';
import { TherapyLevelCard } from '@/src/shared/ui/therapy-level-card';
import type { TherapyLevelStatusChip } from '@/src/shared/ui/therapy-level-card';
import { isLevelEntryLockedForUi } from '@/src/config/dev-level-flags';
import { getLocalDateKey } from '@/src/shared/utils/local-date-key';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessTypography } from '@/src/shared/theme/wellness-theme';
import { dashboardScreen, dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { getLevelVisualIdentity, parseLevelNumberFromId } from '@/src/theme/level-colors';

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
  isRecommended: boolean;
}): { statusChip: TherapyLevelStatusChip; motivationalCopy: string } {
  const { status, locked, perfectTowardUnlock, isRecommended } = params;
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
  if (isRecommended) {
    return {
      statusChip: 'recommended',
      motivationalCopy: 'Sigue a tu ritmo. Mantén el control.',
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

function formatDiagnosticDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

export function LevelsScreen({
  headerSubtitle = 'Elige un nivel para practicar respiraciones controladas según tu progreso.',
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
  const [latestDiagnostic, setLatestDiagnostic] = useState<DiagnosticRecord | null>(null);
  const [levelStatsByPatientLevelId, setLevelStatsByPatientLevelId] = useState<
    Record<number, LevelDisplayStats>
  >({});
  const [startingLevelId, setStartingLevelId] = useState<LevelId | null>(null);
  const [lastReadingReceivedAtMs, setLastReadingReceivedAtMs] = useState<number | null>(null);

  useEffect(() => {
    if (!lastReading) return;
    setLastReadingReceivedAtMs(Date.now());
  }, [lastReading, lastReading?.distanceMm, lastReading?.timestamp]);

  const loadLevelsData = useCallback(async () => {
    if (!patient) {
      setPatientLevels([]);
      setLatestDiagnostic(null);
      setLevelStatsByPatientLevelId({});
      return;
    }
    const [levelsRows, sessions, diagnostic] = await Promise.all([
      getPatientLevels(patient.paciente_id),
      readAllSessions(),
      getLatestDiagnostic(patient.paciente_id),
    ]);
    const today = getLocalDateKey();
    const statsByLevelId = buildLevelDisplayStatsByPatientLevelId(levelsRows, sessions, today);
    if (__DEV__) {
      logLevelUnlockDiagnostics(await buildLevelUnlockDiagnosticSnapshot(patient.paciente_id));
    }
    setPatientLevels(levelsRows);
    setLatestDiagnostic(diagnostic);
    setLevelStatsByPatientLevelId(statsByLevelId);
  }, [patient]);

  useEffect(() => {
    let active = true;
    void loadLevelsData().then(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [loadLevelsData]);

  useFocusEffect(
    useCallback(() => {
      void loadLevelsData();
      void refreshTherapyGate();
    }, [loadLevelsData, refreshTherapyGate]),
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
  const perfectSessionsOnActive = activeLevelStats?.lifetime.perfect ?? 0;
  const sessionsCompletedTodayOnActive = activeLevelStats?.today.completed ?? 0;
  const showPerfectGapWarning =
    !isLoading &&
    activePatientLevel != null &&
    sessionsCompletedTodayOnActive >= TARGET_PERFECT_SESSIONS &&
    perfectSessionsOnActive < TARGET_PERFECT_SESSIONS;

  const hasEvaluation = latestDiagnostic != null;
  const recommendedLevelId = activePatientLevel?.level_id ?? null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar onPressProfile={() => router.push('/profile')} />
        <View style={styles.blockedContainer}>
          <Text style={styles.screenTitle}>Terapia guiada</Text>
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
        <Text style={styles.screenTitle}>Terapia guiada</Text>
        <Text style={styles.tagline}>{headerSubtitle}</Text>

        {!hasEvaluation ? (
          <AppCard variant="highlight" style={styles.evaluationCard}>
            <Text style={styles.evaluationTitle}>Completa tu evaluación inicial</Text>
            <Text style={styles.evaluationText}>
              Necesitamos tu volumen de referencia para personalizar tus metas de terapia.
            </Text>
            <AppButton
              title="Iniciar evaluación"
              onPress={() => router.push('/diagnostico')}
              style={styles.evaluationButton}
            />
          </AppCard>
        ) : (
          <AppCard variant="soft" style={styles.referenceCard}>
            <Text style={styles.referenceTitle}>Tu referencia actual</Text>
            <View style={styles.referenceMetrics}>
              <MetricTile
                label="Volumen de referencia"
                value={`${latestDiagnostic.max_inspiratory_volume} mL`}
                size="compact"
                tone="default"
              />
              {recommendedLevelId ? (
                <MetricTile
                  label="Nivel recomendado"
                  value={`Nivel ${parseLevelNumberFromId(recommendedLevelId)}`}
                  size="compact"
                  tone="success"
                  emphasis="status"
                />
              ) : null}
              <MetricTile
                label="Última evaluación"
                value={formatDiagnosticDate(latestDiagnostic.diagnostic_date)}
                size="compact"
                tone="info"
                emphasis="status"
              />
            </View>
          </AppCard>
        )}

        <SectionHeader
          title="Niveles disponibles"
          subtitle="Avanza paso a paso. Cada sesión debe sentirse controlada y segura."
        />

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
          const displayMeta = getLevelDisplayMeta(level.id);
          const isRecommended = recommendedLevelId === levelId && status === 'active';
          const { statusChip } = deriveTherapyLevelPresentation({
            status,
            locked,
            perfectTowardUnlock,
            isRecommended,
          });
          return (
            <TherapyLevelCard
              key={level.id}
              levelNumber={visual.levelNumber}
              humanName={displayMeta.humanName}
              purpose={displayMeta.purpose}
              accentColor={visual.accent}
              statusChip={statusChip}
              targetVolumeMl={row?.target_volume ?? 0}
              requiredHoldMs={difficultyConfig.requiredHoldMs}
              restMs={difficultyConfig.restMs}
              repetitionsPerSession={difficultyConfig.repetitionsPerSession}
              completedSessionsDisplay={`${completedSessions}/${TARGET_PERFECT_SESSIONS}`}
              perfectSessionsDisplay={`${perfectTowardUnlock}/${TARGET_PERFECT_SESSIONS}`}
              helperText={
                locked
                  ? undefined
                  : statusChip === 'completed'
                    ? 'Nivel completado.'
                    : 'Completa 6 sesiones con 10 repeticiones válidas para avanzar.'
              }
              locked={locked}
              starting={startingLevelId === levelId}
              onPress={() => {
                onPlayLevel(levelId, locked);
              }}
            />
          );
        })}

        <AppCard style={styles.unlockInfoCard}>
          <Text style={styles.unlockInfoTitle}>Desbloqueo del siguiente nivel</Text>
          <Text style={styles.unlockInfoText}>
            Completa 6 sesiones del nivel activo con 10 repeticiones válidas en cada una.
          </Text>
          {showPerfectGapWarning ? (
            <Text style={styles.warningText}>
              Hoy completaste {TARGET_PERFECT_SESSIONS} sesiones en tu nivel activo, pero faltan{' '}
              {TARGET_PERFECT_SESSIONS - perfectSessionsOnActive} perfectas para desbloquear el
              siguiente. Cada una debe tener 10 repeticiones válidas.
            </Text>
          ) : null}
        </AppCard>

        <View style={styles.safetyNote}>
          <View style={styles.safetyIconWrap}>
            <MaterialIcons name="warning" size={18} color="#92400E" />
          </View>
          <Text style={styles.safetyNoteText}>
            Detén la sesión si sientes dolor, mareo, falta de aire intensa o malestar.
          </Text>
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
    ...wellnessTypography.screenTitle,
    color: dashboardScreen.textPrimaryStrong,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 22,
    color: dashboardScreen.textSecondary,
    marginBottom: spacing.lg,
  },
  evaluationCard: {
    marginBottom: spacing.lg,
  },
  evaluationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: wellnessColors.textPrimary,
    marginBottom: spacing.xs,
  },
  evaluationText: {
    fontSize: 15,
    lineHeight: 22,
    color: wellnessColors.textSecondary,
    marginBottom: spacing.md,
  },
  evaluationButton: {
    marginTop: spacing.xs,
  },
  referenceCard: {
    marginBottom: spacing.lg,
  },
  referenceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wellnessColors.primaryDark,
    marginBottom: spacing.sm,
  },
  referenceMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unlockInfoCard: {
    marginTop: spacing.xs,
  },
  unlockInfoTitle: {
    color: dashboardScreen.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  unlockInfoText: {
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
  safetyNote: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: wellnessColors.warningSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: spacing.sm,
  },
  safetyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  safetyNoteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#92400E',
  },
});
