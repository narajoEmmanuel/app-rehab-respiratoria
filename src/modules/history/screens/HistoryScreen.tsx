/**
 * Purpose: Patient history as motivational progress (adherence + gamified calendar).
 * Module: history
 */
import { useFocusEffect, useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiagnosticLockedView } from '@/src/modules/diagnostics/components/DiagnosticLockedView';
import { hasDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import {
  LEVEL1_DAILY_GOAL,
  attachBestHoldSeconds,
  buildAchievements,
  buildDayAggregate,
  buildAttemptsBySessionId,
  classifyCalendarDay,
  countCompletedToday,
  dayDetailMotivation,
  formatDisplayDateEs,
  globalMaxHoldSecondsForPatient,
  groupSessionsByDay,
  levelOnePerfectSlotsForUnlock,
  monthGridDates,
  pickMotivationalLine,
  computeStreakDays,
  type AchievementDef,
  type CalendarDayKind,
  type DayAggregate,
} from '@/src/modules/history/services/history-aggregates';
import type { LevelOneProgress } from '@/src/modules/levels/types/level-progress';
import { loadLevelsProgress } from '@/src/modules/levels/storage/levels-progress-storage';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { readAllAttempts, readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessFloatingTabBarInset, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { getLocalDateKey } from '@/src/shared/utils/local-date-key';

const CAL_BG: Record<CalendarDayKind, string> = {
  none: '#E8ECE9',
  perfect: '#2E7D32',
  good: '#A5D6A7',
  incomplete: '#FFE082',
  interrupted: '#EF9A9A',
};

const WEEK_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function SummaryCard({
  emoji,
  label,
  value,
  hint,
}: {
  emoji: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIconContainer}>
        <Text style={styles.summaryCardIcon} accessibilityLabel="">
          {emoji}
        </Text>
      </View>
      <View style={styles.summaryTextColumn}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
        {hint ? <Text style={styles.summaryHint}>{hint}</Text> : null}
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
  const { patient } = usePatientSession();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof readAllSessions>>>([]);
  const [attempts, setAttempts] = useState<Awaited<ReturnType<typeof readAllAttempts>>>([]);
  const [levelOneSlotsPerfect, setLevelOneSlotsPerfect] = useState(0);
  const [levelOneSnapshot, setLevelOneSnapshot] = useState<LevelOneProgress | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<DayAggregate | null>(null);

  const load = useCallback(async () => {
    if (!patient) {
      setReady(false);
      setLoading(false);
      setLevelOneSnapshot(null);
      return;
    }
    const exists = await hasDiagnostic(patient.paciente_id);
    if (!exists) {
      setReady(false);
      setLoading(false);
      setLevelOneSnapshot(null);
      return;
    }
    setReady(true);
    setLoading(true);
    try {
      const [sess, att, levels] = await Promise.all([
        readAllSessions(),
        readAllAttempts(),
        loadLevelsProgress(),
      ]);
      setSessions(sess);
      setAttempts(att);
      setLevelOneSlotsPerfect(levelOnePerfectSlotsForUnlock(levels.levelOne));
      setLevelOneSnapshot(levels.levelOne);
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
    () => groupSessionsByDay(sessions, patientId, 'level-1'),
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

  const completedToday = useMemo(
    () =>
      patientId >= 0 ? countCompletedToday(sessions, patientId, 'level-1', todayKey) : 0,
    [sessions, patientId, todayKey],
  );

  const bestHoldGlobal = useMemo(
    () =>
      patientId >= 0 ? globalMaxHoldSecondsForPatient(sessions, attempts, patientId, 'level-1') : null,
    [sessions, attempts, patientId],
  );

  const todayKind: CalendarDayKind | null = useMemo(() => {
    const list = byDay.get(todayKey) ?? [];
    if (list.length === 0) return null;
    return classifyCalendarDay(list);
  }, [byDay, todayKey]);

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
    if (!patient || !levelOneSnapshot) return [];
    return buildAchievements({
      sessions,
      patientId: patient.paciente_id,
      levelId: 'level-1',
      levelOne: levelOneSnapshot,
      streakDays,
    });
  }, [patient, levelOneSnapshot, sessions, streakDays]);

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar title="Tu progreso" onPressProfile={() => router.push('/profile')} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {!ready ? (
          <DiagnosticLockedView />
        ) : loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={wellness.primary} />
            <Text style={styles.loadingText}>Cargando tu historial…</Text>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Cada sesión cuenta para fortalecer tu respiración.
            </Text>
            <Text style={styles.heroMotivation}>{heroMotivation}</Text>

            <View style={styles.summaryStack}>
              <SummaryCard
                emoji="🔥"
                label="Racha actual"
                value={`${streakDays} ${streakDays === 1 ? 'día' : 'días'}`}
                hint="Días seguidos con práctica registrada"
              />
              <SummaryCard
                emoji="📋"
                label="Sesiones de hoy"
                value={`${Math.min(completedToday, LEVEL1_DAILY_GOAL)}/${LEVEL1_DAILY_GOAL}`}
                hint="Completadas (meta del día)"
              />
              <SummaryCard
                emoji="🎯"
                label="Progreso Nivel 1"
                value={`${levelOneSlotsPerfect}/${LEVEL1_DAILY_GOAL} perfectas`}
                hint="Progreso hacia desbloquear el siguiente nivel"
              />
              <SummaryCard
                emoji="⏱️"
                label="Mejor inspiración"
                value={
                  bestHoldGlobal != null && bestHoldGlobal > 0
                    ? `${bestHoldGlobal.toFixed(1)} s`
                    : 'Pendiente'
                }
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
                <LegendDot color={CAL_BG.perfect} label="Día perfecto" />
                <LegendDot color={CAL_BG.good} label="Buen avance" />
                <LegendDot color={CAL_BG.incomplete} label="Incompleto" />
                <LegendDot color={CAL_BG.interrupted} label="Interrumpido" />
                <LegendDot color={CAL_BG.none} label="Sin actividad" />
              </View>
            </View>

            {!hasAnyHistory ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No hay sesiones registradas todavía.</Text>
                <Text style={styles.emptyText}>
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
    backgroundColor: wellness.screenBg,
    paddingBottom: wellnessFloatingTabBarInset,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: wellness.text,
    marginTop: spacing.sm,
    lineHeight: 28,
  },
  heroMotivation: {
    marginTop: spacing.sm,
    fontSize: 17,
    color: wellness.primaryDark,
    fontWeight: '600',
    lineHeight: 24,
  },
  summaryStack: {
    marginTop: spacing.lg,
    gap: spacing.md,
    width: '100%',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    ...wellnessShadows.card,
  },
  summaryIconContainer: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  summaryCardIcon: {
    fontSize: 34,
    lineHeight: 40,
  },
  summaryTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.text,
    lineHeight: 24,
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 30,
    fontWeight: '800',
    color: wellness.text,
    lineHeight: 36,
  },
  summaryHint: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: wellness.textSecondary,
    lineHeight: 20,
  },
  sectionCard: {
    marginTop: spacing.lg,
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    ...wellnessShadows.card,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.text,
  },
  sectionHint: {
    marginTop: 6,
    fontSize: 16,
    color: wellness.textSecondary,
    marginBottom: spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthNavBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.softGreen,
  },
  monthNavBtnText: {
    fontSize: 28,
    fontWeight: '700',
    color: wellness.primaryDark,
    lineHeight: 32,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: wellness.text,
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
    color: wellness.textSecondary,
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
    borderRadius: 14,
    marginBottom: 6,
    padding: 4,
  },
  dayCellEmpty: {
    width: '14.28%',
    aspectRatio: 1,
    marginBottom: 6,
  },
  dayCellToday: {
    borderWidth: 3,
    borderColor: wellness.primary,
  },
  dayCellNum: {
    fontSize: 18,
    fontWeight: '800',
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
    color: wellness.text,
  },
  emptyCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: wellness.text,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: spacing.sm,
    fontSize: 17,
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: wellness.border,
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
    color: wellness.textSecondary,
  },
  achievementTextWrap: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: wellness.text,
  },
  achievementTitleLocked: {
    color: wellness.textSecondary,
  },
  achievementDesc: {
    marginTop: 4,
    fontSize: 16,
    color: wellness.textSecondary,
    lineHeight: 22,
  },
  achievementDescLocked: {
    color: wellness.textSecondary,
  },
  loadingBox: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 17,
    color: wellness.textSecondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: wellness.text,
    textTransform: 'capitalize',
  },
  modalStatus: {
    marginTop: spacing.sm,
    fontSize: 18,
    fontWeight: '700',
    color: wellness.primaryDark,
    marginBottom: spacing.md,
  },
  modalLine: {
    fontSize: 17,
    color: wellness.text,
    marginBottom: 8,
    lineHeight: 24,
  },
  modalMotivation: {
    marginTop: spacing.md,
    fontSize: 17,
    fontWeight: '600',
    color: wellness.primaryDark,
    lineHeight: 24,
  },
  modalClose: {
    marginTop: spacing.lg,
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
