/**
 * Purpose: Patient history as motivational progress (adherence + gamified calendar).
 * Module: history
 * Dependencies: react-native, @react-navigation/native, expo-router
 * Notes: Intended to show historical sessions and trends.
 *        Diagnostic is not required to view this screen.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  LEVEL1_DAILY_GOAL,
  attachBestHoldSeconds,
  buildAchievements,
  buildDayAggregate,
  buildAttemptsBySessionId,
  classifyCalendarDay,
  dayDetailMotivation,
  formatDisplayDateEs,
  globalMaxHoldSecondsForPatient,
  groupSessionsByDay,
  monthGridDates,
  pickMotivationalLine,
  computeStreakDays,
  type AchievementDef,
  type CalendarDayKind,
  type DayAggregate,
} from '@/src/modules/history/services/history-aggregates';
import { getCurrentActiveLevel } from '@/src/modules/diagnostics/diagnostic-service';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { readAllAttempts, readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import { todayStatsForPatientAndLevel } from '@/src/modules/session/utils/today-session-stats';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness } from '@/src/shared/theme/wellness-theme';
import { dashboardScreen, dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { sessionClassificationUiLabel } from '@/src/modules/session/session-record-classification';
import { getLocalDateKey, sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';

const CAL_BG: Record<CalendarDayKind, string> = {
  none: '#E8ECE9',
  perfect: '#2E7D32',
  good: '#A5D6A7',
  incomplete: '#FFE082',
  interrupted: '#EF9A9A',
};

const WEEK_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function SummaryCard({
  label,
  value,
  badge,
  progress,
  hint,
}: {
  label: string;
  value: string;
  badge: string;
  progress?: number;
  hint?: string;
}) {
  const safeProgress = Math.max(0, Math.min(progress ?? 0, 1));
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTextColumn}>
        <View style={styles.summaryHeaderRow}>
          <View style={styles.summaryStatusDot} />
          <Text style={styles.summaryLabel}>{label}</Text>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>{badge}</Text>
          </View>
        </View>
        <Text style={styles.summaryValue}>{value}</Text>
        {hint ? <Text style={styles.summaryHint}>{hint}</Text> : null}
        {progress != null ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${safeProgress * 100}%` }]} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AchievementRow({ item }: { item: AchievementDef }) {
  return (
    <View style={[styles.achievementRow, !item.unlocked && styles.achievementRowLocked]}>
      <Text style={[styles.achievementIcon, !item.unlocked && styles.achievementIconLocked]}>
        {item.unlocked ? '★' : '☆'}
      </Text>
      <View style={styles.achievementTextWrap}>
        <Text style={[styles.achievementTitle, !item.unlocked && styles.achievementTitleLocked]}>
          {item.title}
        </Text>
        <Text style={[styles.achievementDesc, !item.unlocked && styles.achievementDescLocked]}>
          {item.description}
        </Text>
      </View>
    </View>
  );
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

  const load = useCallback(async () => {
    if (!patient) {
      setLoading(false);
      setSessions([]);
      setAttempts([]);
      return;
    }
    setLoading(true);
    try {
      const [sess, att, active] = await Promise.all([
        readAllSessions(),
        readAllAttempts(),
        getCurrentActiveLevel(patient.paciente_id),
      ]);
      setSessions(sess);
      setAttempts(att);
      setHistoryLevelId(active?.level_id ?? 'level-1');
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const patientId = patient?.paciente_id ?? -1;
  const todayKey = getLocalDateKey();

  const byDay = useMemo(
    () => groupSessionsByDay(sessions, patientId, null),
    [sessions, patientId],
  );

  const attemptsBySession = useMemo(() => buildAttemptsBySessionId(attempts), [attempts]);

  const activityDayKeys = useMemo(() => {
    const set = new Set<string>();
    for (const key of byDay.keys()) {
      const list = byDay.get(key);
      if (list && list.length > 0) set.add(key);
    }
    return set;
  }, [byDay]);

  const streakDays = useMemo(
    () => (patientId >= 0 ? computeStreakDays(activityDayKeys, todayKey) : 0),
    [activityDayKeys, patientId, todayKey],
  );

  const { completed: completedToday, perfect: perfectToday } = useMemo(
    () =>
      patientId >= 0
        ? todayStatsForPatientAndLevel(sessions, patientId, historyLevelId, todayKey)
        : { completed: 0, perfect: 0 },
    [sessions, patientId, historyLevelId, todayKey],
  );

  const bestHoldGlobal = useMemo(
    () =>
      patientId >= 0 ? globalMaxHoldSecondsForPatient(sessions, attempts, patientId, null) : null,
    [sessions, attempts, patientId],
  );

  const todayKind: CalendarDayKind | null = useMemo(() => {
    const list =
      patientId >= 0
        ? sessions.filter(
            (s) =>
              s.patient_id === patientId &&
              s.level_id === historyLevelId &&
              sessionRecordLocalDayKey(s.session_date) === todayKey,
          )
        : [];
    if (list.length === 0) return null;
    return classifyCalendarDay(list);
  }, [sessions, patientId, historyLevelId, todayKey]);

  const heroMotivation = pickMotivationalLine({
    completedToday,
    streakDays,
    calendarKind: todayKind,
  });

  const monthCells = useMemo(() => monthGridDates(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthTitle = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }, [viewYear, viewMonth]);

  const achievementsList = useMemo(() => {
    if (!patient) return [];
    return buildAchievements({
      sessions,
      patientId: patient.paciente_id,
      levelId: historyLevelId,
      streakDays,
    });
  }, [patient, historyLevelId, sessions, streakDays]);

  const historyLevelOrdinal = historyLevelId.replace('level-', '');

  const hasAnyHistory = activityDayKeys.size > 0;

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

  const scrollBottom = dashboardScrollBottomPadding(insets.bottom);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar onPressProfile={() => router.push('/profile')} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {!patient ? (
          <View style={styles.emptyCard}>
            <Text style={styles.screenTitle}>Tu historial</Text>
            <Text style={styles.tagline}>
              Asocia un perfil de paciente para ver tu historial, calendario y logros.
            </Text>
          </View>
        ) : loading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.screenTitle}>Tu historial</Text>
            <Text style={styles.tagline}>Cargando tu historial…</Text>
            <ActivityIndicator size="large" color={wellness.primary} style={styles.loadingSpinner} />
          </View>
        ) : (
          <>
            <Text style={styles.screenTitle}>Tu historial</Text>
            <Text style={styles.tagline}>
              Cada sesión cuenta para fortalecer tu respiración.
            </Text>
            <Text style={styles.heroMotivation}>{heroMotivation}</Text>

            <Pressable
              onPress={() => router.push('/data-export')}
              style={({ pressed }) => [styles.exportClinicalRow, pressed && styles.exportClinicalRowPressed]}
              accessibilityRole="button"
              accessibilityLabel="Exportar datos clínicos">
              <Text style={styles.exportClinicalText}>Exportar datos clínicos</Text>
            </Pressable>

            <View style={styles.summaryStack}>
              <SummaryCard
                label="Racha actual"
                value={`${streakDays} ${streakDays === 1 ? 'día' : 'días'}`}
                badge={streakDays > 0 ? 'Activa' : 'Pendiente'}
                progress={Math.min(streakDays / 7, 1)}
                hint="Días seguidos con práctica registrada"
              />
              <SummaryCard
                label="Sesiones de hoy"
                value={`${Math.min(completedToday, LEVEL1_DAILY_GOAL)}/${LEVEL1_DAILY_GOAL}`}
                badge={
                  completedToday >= LEVEL1_DAILY_GOAL
                    ? 'Completado'
                    : completedToday > 0
                      ? 'Parcial'
                      : 'Pendiente'
                }
                progress={Math.min(completedToday / LEVEL1_DAILY_GOAL, 1)}
                hint="Completadas (meta del día)"
              />
              <SummaryCard
                label={`Progreso Nivel ${historyLevelOrdinal}`}
                value={`${perfectToday}/${LEVEL1_DAILY_GOAL} perfectas`}
                badge={
                  perfectToday >= LEVEL1_DAILY_GOAL
                    ? 'Completado'
                    : perfectToday > 0
                      ? 'Parcial'
                      : 'Pendiente'
                }
                progress={Math.min(perfectToday / LEVEL1_DAILY_GOAL, 1)}
                hint="Sesiones perfectas hoy (meta para desbloquear el siguiente nivel)"
              />
              <SummaryCard
                label="Mejor inspiración"
                value={
                  bestHoldGlobal != null && bestHoldGlobal > 0
                    ? `${bestHoldGlobal.toFixed(1)} s`
                    : 'Pendiente'
                }
                badge={bestHoldGlobal != null && bestHoldGlobal > 0 ? 'Completado' : 'Pendiente'}
                hint="Mayor tiempo sostenido registrado"
              />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Tu calendario</Text>
              <Text style={styles.sectionHint}>Toca un día para ver el detalle.</Text>
              <View style={styles.monthNav}>
                <Pressable
                  onPress={() => shiftMonth(-1)}
                  style={styles.monthNavBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Mes anterior">
                  <Text style={styles.monthNavBtnText}>‹</Text>
                </Pressable>
                <Text style={styles.monthTitle}>{monthTitle}</Text>
                <Pressable
                  onPress={() => shiftMonth(1)}
                  style={styles.monthNavBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Mes siguiente">
                  <Text style={styles.monthNavBtnText}>›</Text>
                </Pressable>
              </View>
              <View style={styles.weekRow}>
                {WEEK_LABELS.map((w, i) => (
                  <View key={`w-${i}`} style={styles.weekCell}>
                    <Text style={styles.weekCellText}>{w}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.grid}>
                {monthCells.map((dateKey, idx) => {
                  if (!dateKey) {
                    return <View key={`e-${idx}`} style={styles.dayCellEmpty} />;
                  }
                  const list = byDay.get(dateKey) ?? [];
                  const kind = list.length === 0 ? 'none' : classifyCalendarDay(list);
                  const isToday = dateKey === todayKey;
                  return (
                    <Pressable
                      key={dateKey}
                      onPress={() => openDay(dateKey)}
                      style={[
                        styles.dayCell,
                        { backgroundColor: CAL_BG[kind] },
                        isToday && styles.dayCellToday,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Día ${dateKey}`}>
                      <Text style={[styles.dayCellNum, kind === 'none' && styles.dayCellNumMuted]}>
                        {Number(dateKey.slice(8, 10))}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.legend}>
                <LegendDot color={CAL_BG.perfect} label="Completado" />
                <LegendDot color={CAL_BG.good} label="Parcial" />
                <LegendDot color={CAL_BG.incomplete} label="Pendiente" />
                <LegendDot color={CAL_BG.interrupted} label="Interrumpido" />
                <LegendDot color={CAL_BG.none} label="Sin actividad" />
              </View>
            </View>

            {!hasAnyHistory ? (
              <View style={styles.inlineEmptyCard}>
                <Text style={styles.inlineEmptyTitle}>No hay sesiones registradas todavía.</Text>
                <Text style={styles.inlineEmptyText}>
                  Completa tu primera sesión para empezar tu progreso.
                </Text>
              </View>
            ) : null}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Logros recientes</Text>
              {achievementsList.map((a) => (
                <AchievementRow key={a.id} item={a} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={selectedDay !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDay(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedDay(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {selectedDay ? (
              <>
                <Text style={styles.modalTitle}>{formatDisplayDateEs(selectedDay.dateKey)}</Text>
                <Text style={styles.modalStatus}>{selectedDay.statusLabel}</Text>
                <Text style={styles.modalLine}>
                  Sesiones completadas: {selectedDay.completedCount}/{LEVEL1_DAILY_GOAL}
                </Text>
                <Text style={styles.modalLine}>Sesiones perfectas: {selectedDay.perfectCount}</Text>
                <Text style={styles.modalLine}>
                  Sesiones interrumpidas: {selectedDay.interruptedCount}
                </Text>
                <Text style={styles.modalLine}>
                  Repeticiones válidas: {selectedDay.validRepetitionsSum}
                </Text>
                <Text style={styles.modalLine}>
                  Repeticiones por mejorar: {selectedDay.improveRepetitionsSum}
                </Text>
                <Text style={styles.modalLine}>
                  Mejor tiempo de inspiración:{' '}
                  {selectedDay.bestHoldSeconds != null && selectedDay.bestHoldSeconds > 0
                    ? `${selectedDay.bestHoldSeconds.toFixed(1)} s`
                    : 'Pendiente'}
                </Text>
                <Text style={styles.modalLine}>
                  Volumen máximo:{' '}
                  {selectedDay.maxVolumeMl != null && selectedDay.maxVolumeMl > 0
                    ? `${selectedDay.maxVolumeMl} mL`
                    : 'Pendiente'}
                </Text>
                {selectedDay.sessions.length > 0 ? (
                  <View style={styles.modalSessionsBlock}>
                    <Text style={styles.modalSessionsTitle}>Sesiones del día</Text>
                    {selectedDay.sessions.map((session) => (
                      <View key={session.session_id} style={styles.modalSessionRow}>
                        <Text style={styles.modalSessionTime}>
                          {new Date(session.session_date).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        <View style={styles.modalSessionChip}>
                          <Text style={styles.modalSessionChipText}>
                            {sessionClassificationUiLabel(session)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={styles.modalMotivation}>{dayDetailMotivation(selectedDay)}</Text>
                <Pressable
                  style={styles.modalClose}
                  onPress={() => setSelectedDay(null)}
                  accessibilityRole="button">
                  <Text style={styles.modalCloseText}>Cerrar</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: dashboardScreen.screenBg,
  },
  scrollContent: {
    flexGrow: 1,
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
    marginBottom: spacing.sm,
  },
  heroMotivation: {
    marginTop: spacing.xs,
    fontSize: 15,
    lineHeight: 21,
    color: '#374151',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  exportClinicalRow: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  exportClinicalRowPressed: {
    opacity: 0.78,
  },
  exportClinicalText: {
    fontSize: 15,
    fontWeight: '700',
    color: wellness.primaryDark,
    textDecorationLine: 'underline',
  },
  summaryStack: {
    marginTop: spacing.md,
    gap: spacing.md,
    width: '100%',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: dashboardScreen.cardBg,
    borderRadius: dashboardScreen.cardRadius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: dashboardScreen.cardBorderColor,
  },
  summaryTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: wellness.primary,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: dashboardScreen.textPrimary,
    lineHeight: 22,
    flex: 1,
  },
  summaryBadge: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    backgroundColor: 'rgba(52, 171, 165, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.22)',
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '700',
    color: dashboardScreen.textPrimary,
    lineHeight: 30,
  },
  summaryHint: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: dashboardScreen.textSecondary,
    lineHeight: 20,
  },
  progressTrack: {
    marginTop: spacing.sm,
    width: '100%',
    height: 6,
    borderRadius: 4,
    backgroundColor: '#E8EDEA',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: wellness.primary,
  },
  sectionCard: {
    marginTop: spacing.lg,
    backgroundColor: dashboardScreen.cardBg,
    borderRadius: dashboardScreen.cardRadius,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: dashboardScreen.cardBorderColor,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: dashboardScreen.textPrimary,
  },
  sectionHint: {
    marginTop: 6,
    fontSize: 15,
    color: dashboardScreen.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 21,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthNavBtn: {
    minWidth: dashboardScreen.primaryButtonMinHeight,
    minHeight: dashboardScreen.primaryButtonMinHeight,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: dashboardScreen.cardBg,
    borderWidth: 1,
    borderColor: dashboardScreen.cardBorderColor,
  },
  monthNavBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: wellness.primaryDark,
    lineHeight: 26,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: dashboardScreen.textPrimary,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekCellText: {
    fontWeight: '700',
    color: dashboardScreen.textSecondary,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 6,
    padding: 4,
  },
  dayCellEmpty: {
    width: '14.28%',
    aspectRatio: 1,
    marginBottom: 6,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: wellness.primary,
  },
  dayCellNum: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1B1B1B',
  },
  dayCellNumMuted: {
    color: '#78909C',
  },
  legend: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  legendLabel: {
    fontSize: 15,
    color: dashboardScreen.textPrimary,
  },
  emptyCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: dashboardScreen.cardRadius,
    backgroundColor: dashboardScreen.cardBg,
    borderWidth: 1,
    borderColor: dashboardScreen.cardBorderColor,
  },
  inlineEmptyCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: dashboardScreen.cardRadius,
    backgroundColor: dashboardScreen.cardBg,
    borderWidth: 1,
    borderColor: dashboardScreen.cardBorderColor,
  },
  inlineEmptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: dashboardScreen.textPrimary,
    textAlign: 'center',
  },
  inlineEmptyText: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: dashboardScreen.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dashboardScreen.cardBorderColor,
  },
  achievementRowLocked: {
    opacity: 0.45,
  },
  achievementIcon: {
    fontSize: 28,
    marginRight: spacing.md,
    color: '#F9A825',
  },
  achievementIconLocked: {
    color: dashboardScreen.textSecondary,
  },
  achievementTextWrap: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: dashboardScreen.textPrimary,
  },
  achievementTitleLocked: {
    color: dashboardScreen.textSecondary,
  },
  achievementDesc: {
    marginTop: 4,
    fontSize: 15,
    color: dashboardScreen.textSecondary,
    lineHeight: 22,
  },
  achievementDescLocked: {
    color: dashboardScreen.textSecondary,
  },
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: 'flex-start',
    width: '100%',
  },
  loadingSpinner: {
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: dashboardScreen.cardBg,
    borderRadius: dashboardScreen.cardRadius,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: dashboardScreen.cardBorderColor,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: dashboardScreen.textPrimary,
    textTransform: 'capitalize',
  },
  modalStatus: {
    marginTop: spacing.sm,
    fontSize: 17,
    fontWeight: '700',
    color: wellness.primaryDark,
    marginBottom: spacing.md,
  },
  modalLine: {
    fontSize: 16,
    color: dashboardScreen.textPrimary,
    marginBottom: 8,
    lineHeight: 24,
  },
  modalSessionsBlock: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: 8,
  },
  modalSessionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: dashboardScreen.textSecondary,
  },
  modalSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalSessionTime: {
    fontSize: 15,
    color: dashboardScreen.textPrimary,
    minWidth: 52,
  },
  modalSessionChip: {
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(61, 90, 74, 0.08)',
    borderWidth: 1,
    borderColor: dashboardScreen.cardBorderColor,
  },
  modalSessionChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  modalMotivation: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: wellness.primaryDark,
    lineHeight: 24,
  },
  modalClose: {
    marginTop: spacing.lg,
    backgroundColor: wellness.primary,
    borderRadius: dashboardScreen.primaryButtonRadius,
    paddingVertical: dashboardScreen.primaryButtonPaddingVertical,
    alignItems: 'center',
    minHeight: dashboardScreen.primaryButtonMinHeight,
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
