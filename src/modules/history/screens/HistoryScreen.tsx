/**
 * Purpose: Patient history as motivational progress (adherence + gamified calendar).
 * Module: history
 * Dependencies: react-native, @react-navigation/native, expo-router
 * Notes: Intended to show historical sessions and trends.
 *        Diagnostic is not required to view this screen.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HistoryAchievementsSection } from '@/src/modules/history/components/HistoryAchievementsSection';
import type { HistoryProgressAchievement } from '@/src/modules/history/components/HistoryAchievementCompactCard';
import { HistoryCalendarCard } from '@/src/modules/history/components/HistoryCalendarCard';
import { HistoryDayDetailModal } from '@/src/modules/history/components/HistoryDayDetailModal';
import { HistoryEmptySessionsCard } from '@/src/modules/history/components/HistoryEmptySessionsCard';
import { HistoryExportCard } from '@/src/modules/history/components/HistoryExportCard';
import { HistoryLastSessionCard } from '@/src/modules/history/components/HistoryLastSessionCard';
import { HistoryLoadingState } from '@/src/modules/history/components/HistoryLoadingState';
import { HISTORY_EMPTY_METRIC_PLACEHOLDER } from '@/src/modules/history/components/HistoryMetricProgressRow';
import { HistoryNoPatientState } from '@/src/modules/history/components/HistoryNoPatientState';
import { HistoryPageHeader } from '@/src/modules/history/components/HistoryPageHeader';
import { HistoryRespiratoryProgressCard } from '@/src/modules/history/components/HistoryRespiratoryProgressCard';
import { HistoryStatMiniCardsRow } from '@/src/modules/history/components/HistoryStatMiniCard';
import { HistoryStreakHeroCard } from '@/src/modules/history/components/HistoryStreakHeroCard';
import {
  LEVEL1_DAILY_GOAL,
  attachBestHoldSeconds,
  buildDayAggregate,
  buildAttemptsBySessionId,
  countCompletedToday,
  groupSessionsByDay,
  monthGridDates,
  computeStreakDays,
  hadUnlockPerfectDayForLevel,
  therapeuticActivityDayKeys,
  practiceActivityDayKeys,
  globalMaxSensorVolumeMlForPatient,
  type DayAggregate,
} from '@/src/modules/history/services/history-aggregates';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { isTherapeuticSessionRecord } from '@/src/modules/session/session-record-classification';
import { getCurrentActiveLevel } from '@/src/modules/diagnostics/diagnostic-service';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { readAllAttempts, readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { appScreenBackground } from '@/src/shared/theme/wellness-theme';
import { dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { addDaysLocal, getLocalDateKey, sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';
import { isSensorDebugEnabled } from '@/src/modules/app-mode';

/** Meta visual de sostén (2 s del juego); solo etiqueta UI. */
const SUSTAIN_META_SECONDS = 2;

/** Quita celdas vacías al final del mes para no reservar filas en blanco. */
function trimTrailingEmptyCalendarCells(cells: (string | null)[]): (string | null)[] {
  let lastIndex = cells.length - 1;
  while (lastIndex >= 0 && cells[lastIndex] == null) {
    lastIndex -= 1;
  }
  return cells.slice(0, lastIndex + 1);
}

function countCompletedTherapeuticSessions(sessions: SessionRecord[], patientId: number): number {
  return sessions.filter(
    (s) => s.patient_id === patientId && isTherapeuticSessionRecord(s) && s.completed,
  ).length;
}

/** Logros de Historial derivados de sesiones y racha ya cargadas (sin persistencia nueva). */
function buildHistoryProgressAchievements(input: {
  sessions: SessionRecord[];
  patientId: number;
  streakDays: number;
  activeDays: number;
}): HistoryProgressAchievement[] {
  const { sessions, patientId, streakDays, activeDays } = input;
  const totalCompleted = countCompletedTherapeuticSessions(sessions, patientId);
  const firstLevelCompleted =
    hadUnlockPerfectDayForLevel(sessions, patientId, 'level-1') ||
    sessions.some((s) => s.patient_id === patientId && s.level_id !== 'level-1');

  return [
    {
      id: 'first-session',
      title: 'Primera sesión',
      description: 'Completaste tu primera sesión.',
      unlocked: totalCompleted >= 1,
      icon: '🎯',
    },
    {
      id: 'first-day',
      title: 'Primer día',
      description: 'Registraste tu primer día de práctica.',
      unlocked: activeDays >= 1,
      icon: '📅',
    },
    {
      id: 'sessions-3',
      title: '3 sesiones',
      description: 'Completaste 3 sesiones.',
      unlocked: totalCompleted >= 3,
      icon: '✓',
    },
    {
      id: 'sessions-5',
      title: '5 sesiones',
      description: 'Vas construyendo constancia.',
      unlocked: totalCompleted >= 5,
      icon: '✓',
    },
    {
      id: 'sessions-10',
      title: '10 sesiones',
      description: 'Alcanzaste 10 sesiones registradas.',
      unlocked: totalCompleted >= 10,
      icon: '★',
    },
    {
      id: 'sessions-15',
      title: '15 sesiones',
      description: 'Tu práctica ya tiene continuidad.',
      unlocked: totalCompleted >= 15,
      icon: '★',
    },
    {
      id: 'sessions-20',
      title: '20 sesiones',
      description: 'Has sostenido tu progreso.',
      unlocked: totalCompleted >= 20,
      icon: '★',
    },
    {
      id: 'sessions-30',
      title: '30 sesiones',
      description: 'Completaste una meta mayor de terapia.',
      unlocked: totalCompleted >= 30,
      icon: '🏆',
    },
    {
      id: 'first-level',
      title: 'Primer nivel',
      description: 'Completaste tu primer nivel.',
      unlocked: firstLevelCompleted,
      icon: '⬆',
    },
    {
      id: 'streak-3',
      title: '3 días de racha',
      description: 'Mantuviste 3 días de práctica.',
      unlocked: streakDays >= 3,
      icon: '🔥',
    },
    {
      id: 'streak-7',
      title: '7 días de racha',
      description: 'Lograste una semana de constancia.',
      unlocked: streakDays >= 7,
      icon: '🔥',
    },
  ];
}

function formatMonthChip(year: number, monthIndex0: number): string {
  const d = new Date(year, monthIndex0, 1);
  const raw = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function countWeeklyCompletedSessions(sessions: SessionRecord[], todayKey: string): number {
  const start = addDaysLocal(todayKey, -6);
  return sessions.filter((s) => {
    const k = sessionRecordLocalDayKey(s.session_date);
    if (k == null || k < start || k > todayKey) return false;
    return s.completed && s.interrupted !== true;
  }).length;
}

function compareSessionRecency(a: SessionRecord, b: SessionRecord): number {
  const ta = Date.parse(a.session_date);
  const tb = Date.parse(b.session_date);
  if (!Number.isNaN(ta) && !Number.isNaN(tb) && tb !== ta) {
    return tb - ta;
  }
  return b.session_id - a.session_id;
}

export function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { patient } = usePatientSession();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof readAllSessions>>>([]);
  const [attempts, setAttempts] = useState<Awaited<ReturnType<typeof readAllAttempts>>>([]);
  const [historyLevelId, setHistoryLevelId] = useState<LevelId>('level-1');
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<DayAggregate | null>(null);
  const [legendExpanded, setLegendExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!patient) {
      setLoading(false);
      setSessions([]);
      setAttempts([]);
      return;
    }
    setLoading(true);
    console.log('[HISTORY] loading local data');
    const fallbackLevel: LevelId = patient.current_level_id ?? 'level-1';
    try {
      const [sess, att] = await Promise.all([readAllSessions(), readAllAttempts()]);
      const patientSessions = sess.filter((s) => s.patient_id === patient.paciente_id);
      console.log('[HISTORY] local sessions:', patientSessions.length);

      let levelId: LevelId = fallbackLevel;
      try {
        const active = await getCurrentActiveLevel(patient.paciente_id);
        if (active?.level_id) levelId = active.level_id;
      } catch (levelError) {
        console.warn('[HISTORY] Network ignored:', levelError);
      }

      setSessions(sess);
      setAttempts(att);
      setHistoryLevelId(levelId);
      console.log('[HISTORY] loaded successfully');
    } catch (error) {
      console.warn('[HISTORY] ignored error', error);
      setSessions([]);
      setAttempts([]);
      setHistoryLevelId(fallbackLevel);
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void load();
  }, [patient?.paciente_id, patient?.clave, load]);

  const patientId = patient?.paciente_id ?? -1;
  const todayKey = getLocalDateKey();

  const byDay = useMemo(
    () => groupSessionsByDay(sessions, patientId, null),
    [sessions, patientId],
  );

  const attemptsBySession = useMemo(() => buildAttemptsBySessionId(attempts), [attempts]);

  const therapeuticDayKeys = useMemo(
    () => (patientId >= 0 ? therapeuticActivityDayKeys(sessions, patientId) : new Set<string>()),
    [sessions, patientId],
  );

  const practiceDayKeys = useMemo(
    () => (patientId >= 0 ? practiceActivityDayKeys(sessions, patientId) : new Set<string>()),
    [sessions, patientId],
  );

  const streakDays = useMemo(
    () => (patientId >= 0 ? computeStreakDays(therapeuticDayKeys, todayKey) : 0),
    [therapeuticDayKeys, patientId, todayKey],
  );

  const bestSensorVolumeMl = useMemo(
    () => (patientId >= 0 ? globalMaxSensorVolumeMlForPatient(sessions, patientId) : null),
    [sessions, patientId],
  );

  const patientSessions = useMemo(
    () => (patientId >= 0 ? sessions.filter((s) => s.patient_id === patientId) : []),
    [sessions, patientId],
  );

  const displayStats = useMemo(() => {
    const sessionIds = new Set(patientSessions.map((s) => s.session_id));
    let totalValidReps = 0;
    let holdSumMs = 0;
    let holdCount = 0;
    for (const s of patientSessions) {
      totalValidReps += s.valid_attempts ?? 0;
    }
    for (const a of attempts) {
      if (!sessionIds.has(a.session_id) || a.hold_ms <= 0) continue;
      holdSumMs += a.hold_ms;
      holdCount++;
    }
    let weeklyActiveDays = 0;
    for (let i = 0; i < 7; i++) {
      if (therapeuticDayKeys.has(addDaysLocal(todayKey, -i))) weeklyActiveDays++;
    }
    const weeklySessions = countWeeklyCompletedSessions(patientSessions, todayKey);
    return {
      totalValidReps,
      avgHoldSeconds: holdCount > 0 ? holdSumMs / holdCount / 1000 : null,
      weeklyActiveDays,
      weeklySessions,
    };
  }, [patientSessions, attempts, therapeuticDayKeys, todayKey]);

  const monthCells = useMemo(() => monthGridDates(viewYear, viewMonth), [viewYear, viewMonth]);

  const compactMonthCells = useMemo(
    () => trimTrailingEmptyCalendarCells(monthCells),
    [monthCells],
  );

  const monthChipLabel = useMemo(
    () => formatMonthChip(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const headerMonthChip = useMemo(() => formatMonthChip(new Date().getFullYear(), new Date().getMonth()), []);

  const dailyGoalMet = useMemo(
    () =>
      patientId >= 0
        ? countCompletedToday(sessions, patientId, historyLevelId, todayKey) >= LEVEL1_DAILY_GOAL
        : false,
    [sessions, patientId, historyLevelId, todayKey],
  );

  const lastSession = useMemo(() => {
    if (patientSessions.length === 0) return null;
    return [...patientSessions].sort(compareSessionRecency)[0] ?? null;
  }, [patientSessions]);

  const lastSessionHoldSeconds = useMemo(() => {
    if (!lastSession) return null;
    const dayKey = sessionRecordLocalDayKey(lastSession.session_date);
    if (!dayKey) return null;
    const agg = attachBestHoldSeconds(
      buildDayAggregate(dayKey, byDay.get(dayKey) ?? [lastSession]),
      attemptsBySession,
    );
    return agg.bestHoldSeconds;
  }, [lastSession, byDay, attemptsBySession]);

  const progressAchievements = useMemo(() => {
    if (!patient) return [];
    return buildHistoryProgressAchievements({
      sessions,
      patientId: patient.paciente_id,
      streakDays,
      activeDays: therapeuticDayKeys.size,
    });
  }, [patient, sessions, streakDays, therapeuticDayKeys.size]);

  const hasAnyHistory = therapeuticDayKeys.size > 0 || practiceDayKeys.size > 0;
  const streakLost = streakDays === 0 && therapeuticDayKeys.size > 0;
  const selectedDateKey = selectedDay?.dateKey ?? null;

  const sensorDebug = isSensorDebugEnabled();

  const hasRespiratoryMetrics =
    (bestSensorVolumeMl != null && bestSensorVolumeMl > 0) || displayStats.avgHoldSeconds != null;

  const vimValueText =
    bestSensorVolumeMl != null && bestSensorVolumeMl > 0
      ? `${Math.round(bestSensorVolumeMl)} mL`
      : HISTORY_EMPTY_METRIC_PLACEHOLDER;
  const vimProgress = bestSensorVolumeMl != null && bestSensorVolumeMl > 0 ? 1 : 0;
  const adherenceValueText = `${displayStats.weeklyActiveDays} de 7 días`;
  const adherenceProgress = displayStats.weeklyActiveDays / 7;
  const sustainValueText =
    displayStats.avgHoldSeconds != null
      ? `${displayStats.avgHoldSeconds.toFixed(1)} s`
      : HISTORY_EMPTY_METRIC_PLACEHOLDER;
  const sustainProgress =
    displayStats.avgHoldSeconds != null
      ? Math.min(displayStats.avgHoldSeconds / SUSTAIN_META_SECONDS, 1)
      : 0;

  const streakMiniValue = `${streakDays} ${streakDays === 1 ? 'día' : 'días'}`;

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const openDay = (dateKey: string | null) => {
    if (!dateKey) return;
    const list = byDay.get(dateKey) ?? [];
    if (list.length === 0) {
      setSelectedDay(attachBestHoldSeconds(buildDayAggregate(dateKey, []), attemptsBySession));
      return;
    }
    const base = buildDayAggregate(dateKey, list);
    setSelectedDay(attachBestHoldSeconds(base, attemptsBySession));
  };

  const openLastSessionDay = () => {
    if (!lastSession) return;
    const dayKey = sessionRecordLocalDayKey(lastSession.session_date);
    if (dayKey) openDay(dayKey);
  };

  const scrollBottom = dashboardScrollBottomPadding(insets.bottom);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar onPressProfile={() => router.push('/profile')} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {!patient ? (
          <HistoryNoPatientState />
        ) : loading ? (
          <HistoryLoadingState />
        ) : (
          <>
            <HistoryPageHeader monthChipLabel={headerMonthChip} />

            <HistoryStreakHeroCard
              streakDays={streakDays}
              streakLost={streakLost}
              dailyGoalMet={dailyGoalMet}
            />

            <HistoryStatMiniCardsRow
              streakMiniValue={streakMiniValue}
              weeklySessions={displayStats.weeklySessions}
              totalValidReps={displayStats.totalValidReps}
            />

            <HistoryRespiratoryProgressCard
              vimValueText={vimValueText}
              vimProgress={vimProgress}
              sustainValueText={sustainValueText}
              sustainProgress={sustainProgress}
              adherenceValueText={adherenceValueText}
              adherenceProgress={adherenceProgress}
              hasRespiratoryMetrics={hasRespiratoryMetrics}
            />

            <HistoryCalendarCard
              monthChipLabel={monthChipLabel}
              compactMonthCells={compactMonthCells}
              byDay={byDay}
              practiceDayKeys={practiceDayKeys}
              todayKey={todayKey}
              selectedDateKey={selectedDateKey}
              legendExpanded={legendExpanded}
              onShiftMonth={shiftMonth}
              onOpenDay={openDay}
              onToggleLegend={() => setLegendExpanded((v) => !v)}
            />

            {!hasAnyHistory ? (
              <HistoryEmptySessionsCard
                onStartFirstSession={() => router.push('/(tabs)/terapia')}
              />
            ) : lastSession ? (
              <HistoryLastSessionCard
                session={lastSession}
                bestHoldSeconds={lastSessionHoldSeconds}
                onViewDetail={openLastSessionDay}
              />
            ) : null}

            <HistoryAchievementsSection achievements={progressAchievements} />

            <HistoryExportCard
              hasAnyHistory={hasAnyHistory}
              onExport={() => router.push('/data-export')}
            />
          </>
        )}
      </ScrollView>

      <HistoryDayDetailModal
        selectedDay={selectedDay}
        sensorDebug={sensorDebug}
        onClose={() => setSelectedDay(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: appScreenBackground,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
