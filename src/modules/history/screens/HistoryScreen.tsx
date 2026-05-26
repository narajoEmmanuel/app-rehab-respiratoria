/**
 * Purpose: Patient history as motivational progress (adherence + gamified calendar).
 * Module: history
 * Dependencies: react-native, @react-navigation/native, expo-router
 * Notes: Intended to show historical sessions and trends.
 *        Diagnostic is not required to view this screen.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  globalMaxSensorVolumeMlForPatient,
  groupSessionsByDay,
  monthGridDates,
  pickMotivationalLine,
  computeStreakDays,
  therapeuticActivityDayKeys,
  practiceActivityDayKeys,
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
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppButton } from '@/src/shared/ui/AppButton';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors } from '@/src/shared/theme/wellness-theme';
import { dashboardScreen, dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { getLocalDateKey } from '@/src/shared/utils/local-date-key';

const CAL_BG: Record<CalendarDayKind, string> = {
  none: '#E8ECE9',
  perfect: '#2E7D32',
  good: '#A5D6A7',
  incomplete: '#FFE082',
  interrupted: '#EF9A9A',
};
const CAL_BG_PRACTICE = '#D6EAF8';

const WEEK_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function StreakFireIcon({ active }: { active: boolean }) {
  return (
    <Text
      style={[styles.streakFireEmoji, !active && styles.streakFireEmojiMuted]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      🔥
    </Text>
  );
}

function SummaryCard({
  label,
  value,
  badge,
  progress,
  hint,
  trailingDecoration,
}: {
  label: string;
  value: string;
  badge: string;
  progress?: number;
  hint?: string;
  trailingDecoration?: ReactNode;
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
      {trailingDecoration ? (
        <View style={styles.summaryTrailing}>{trailingDecoration}</View>
      ) : null}
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

  const { completed: completedToday } = useMemo(
    () =>
      patientId >= 0
        ? todayStatsForPatientAndLevel(sessions, patientId, historyLevelId, todayKey)
        : { completed: 0, perfect: 0 },
    [sessions, patientId, historyLevelId, todayKey],
  );

  const bestSensorVolumeMl = useMemo(
    () => (patientId >= 0 ? globalMaxSensorVolumeMlForPatient(sessions, patientId) : null),
    [sessions, patientId],
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
    if (!patient) return [];
    return buildAchievements({
      sessions,
      patientId: patient.paciente_id,
      levelId: historyLevelId,
      streakDays,
    });
  }, [patient, historyLevelId, sessions, streakDays]);

  const historyLevelOrdinal = historyLevelId.replace('level-', '');

  const hasAnyHistory = therapeuticDayKeys.size > 0 || practiceDayKeys.size > 0;

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

            <View style={styles.summaryStack}>
              <SummaryCard
                label="Racha terapéutica"
                value={`${streakDays} ${streakDays === 1 ? 'día' : 'días'}`}
                badge={streakDays > 0 ? 'Activa' : 'Pendiente'}
                progress={Math.min(streakDays / 7, 1)}
                hint="Días seguidos con sesión de sensor"
                trailingDecoration={<StreakFireIcon active={streakDays > 0} />}
              />
              <SummaryCard
                label={`Sesiones hoy · Nivel ${historyLevelOrdinal}`}
                value={`${Math.min(completedToday, LEVEL1_DAILY_GOAL)}/${LEVEL1_DAILY_GOAL}`}
                badge={
                  completedToday >= LEVEL1_DAILY_GOAL
                    ? 'Completado'
                    : completedToday > 0
                      ? 'Parcial'
                      : 'Pendiente'
                }
                progress={Math.min(completedToday / LEVEL1_DAILY_GOAL, 1)}
                hint="Solo sensor · Meta diaria de tu nivel activo"
              />
              <SummaryCard
                label="Mejor volumen con sensor"
                value={
                  bestSensorVolumeMl != null && bestSensorVolumeMl > 0
                    ? `${Math.round(bestSensorVolumeMl)} mL`
                    : 'Pendiente'
                }
                badge={bestSensorVolumeMl != null && bestSensorVolumeMl > 0 ? 'Récord' : 'Pendiente'}
                hint="Mayor volumen estimado · Solo sensor"
              />
            </View>

            <AppCard style={styles.calendarCardSpacing}>
              <SectionHeader title="Tu calendario" subtitle="Toca un día para ver el detalle." />
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
                  const hasPracticeOnly = kind === 'none' && practiceDayKeys.has(dateKey);
                  return (
                    <Pressable
                      key={dateKey}
                      onPress={() => openDay(dateKey)}
                      style={[
                        styles.dayCell,
                        { backgroundColor: hasPracticeOnly ? CAL_BG_PRACTICE : CAL_BG[kind] },
                        isToday && styles.dayCellToday,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Día ${dateKey}`}>
                      <Text
                        style={[
                          styles.dayCellNum,
                          kind === 'none' && !hasPracticeOnly && styles.dayCellNumMuted,
                        ]}>
                        {Number(dateKey.slice(8, 10))}
                      </Text>
                      {hasPracticeOnly ? <View style={styles.practiceDot} /> : null}
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.legend}>
                <LegendDot color={CAL_BG.perfect} label="Cumplimiento completo" />
                <LegendDot color={CAL_BG.good} label="Avance parcial" />
                <LegendDot color={CAL_BG.incomplete} label="Sesión incompleta" />
                <LegendDot color={CAL_BG.interrupted} label="Interrumpido" />
                <LegendDot color={CAL_BG_PRACTICE} label="Solo práctica (no terapéutica)" />
                <LegendDot color={CAL_BG.none} label="Sin actividad" />
              </View>
            </AppCard>

            {!hasAnyHistory ? (
              <View style={styles.inlineEmptyCard}>
                <Text style={styles.inlineEmptyTitle}>No hay sesiones registradas todavía.</Text>
                <Text style={styles.inlineEmptyText}>
                  Completa tu primera sesión para empezar tu progreso.
                </Text>
              </View>
            ) : null}

            <SectionHeader title="Logros recientes" />
            <AppCard>
              {achievementsList.map((a) => (
                <AchievementRow key={a.id} item={a} />
              ))}
            </AppCard>

            <SectionHeader title="Compartir resumen de progreso" />
            <AppCard style={styles.exportSection}>
              <Text style={styles.exportSectionBody}>
                Genera un archivo con tus sesiones para revisarlo con un profesional de la salud.
              </Text>
              <AppButton
                title="Exportar resumen"
                onPress={() => router.push('/data-export')}
                variant="secondary"
                iconName="doc.text.fill"
              />
            </AppCard>
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
                <View style={styles.modalChipRow}>
                  <View style={[styles.modalChip, styles.modalChipStatus]}>
                    <Text style={styles.modalChipText}>{selectedDay.statusLabel}</Text>
                  </View>
                  {selectedDay.classification.sensorSessionsCount > 0 ? (
                    <View style={[styles.modalChip, styles.modalChipSensor]}>
                      <Text style={styles.modalChipText}>Sensor</Text>
                    </View>
                  ) : null}
                  {selectedDay.classification.practiceSessionsCount > 0 ? (
                    <View style={[styles.modalChip, styles.modalChipPractice]}>
                      <Text style={styles.modalChipText}>Práctica</Text>
                    </View>
                  ) : null}
                  {selectedDay.classification.unclassifiedSessionsCount > 0 ? (
                    <View style={[styles.modalChip, styles.modalChipUnclassified]}>
                      <Text style={styles.modalChipText}>Sin clasificar</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Resumen del día</Text>
                  <Text style={styles.modalLine}>
                    Completadas: {selectedDay.completedCount}/{LEVEL1_DAILY_GOAL} · Perfectas: {selectedDay.perfectCount}
                  </Text>
                  {selectedDay.interruptedCount > 0 ? (
                    <Text style={styles.modalLine}>
                      Interrumpidas: {selectedDay.interruptedCount}
                    </Text>
                  ) : null}
                  <Text style={styles.modalLine}>
                    Mejor inspiración:{' '}
                    {selectedDay.bestHoldSeconds != null && selectedDay.bestHoldSeconds > 0
                      ? `${selectedDay.bestHoldSeconds.toFixed(1)} s`
                      : '—'}
                  </Text>
                </View>

                {selectedDay.classification.sensorSessionsCount > 0 ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Sesiones con sensor</Text>
                    <Text style={styles.modalLine}>
                      {selectedDay.classification.sensorSessionsCount}{' '}
                      {selectedDay.classification.sensorSessionsCount === 1 ? 'sesión' : 'sesiones'}
                      {selectedDay.maxVolumeMl != null && selectedDay.maxVolumeMl > 0
                        ? ` · Máx. ${selectedDay.maxVolumeMl} mL`
                        : ''}
                    </Text>
                    {selectedDay.classification.maxSensorU95Ml != null ? (
                      <Text style={styles.modalLineMuted}>
                        U95 máx. ±{Math.round(selectedDay.classification.maxSensorU95Ml)} mL
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {selectedDay.classification.practiceSessionsCount > 0 ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Práctica táctil</Text>
                    <Text style={styles.modalLineMuted}>
                      {selectedDay.classification.practiceSessionsCount}{' '}
                      {selectedDay.classification.practiceSessionsCount === 1 ? 'sesión' : 'sesiones'}{' '}
                      · No terapéutica
                    </Text>
                  </View>
                ) : null}

                {selectedDay.classification.unclassifiedSessionsCount > 0 ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Sin clasificar</Text>
                    <Text style={styles.modalLineMuted}>
                      {selectedDay.classification.unclassifiedSessionsCount}{' '}
                      {selectedDay.classification.unclassifiedSessionsCount === 1 ? 'sesión' : 'sesiones'}{' '}
                      · Registro anterior a la clasificación
                    </Text>
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
  summaryTrailing: {
    marginLeft: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 52,
  },
  streakFireEmoji: {
    fontSize: 44,
    lineHeight: 50,
  },
  streakFireEmojiMuted: {
    opacity: 0.28,
  },
  calendarCardSpacing: {
    marginTop: spacing.lg,
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
  practiceDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2196F3',
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
  exportSection: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  exportSectionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: wellnessColors.textSecondary,
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
  modalChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  modalChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalChipStatus: {
    backgroundColor: 'rgba(52, 171, 165, 0.12)',
  },
  modalChipSensor: {
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
  },
  modalChipPractice: {
    backgroundColor: 'rgba(33, 150, 243, 0.12)',
  },
  modalChipUnclassified: {
    backgroundColor: 'rgba(158, 158, 158, 0.15)',
  },
  modalChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: dashboardScreen.textPrimary,
  },
  modalSection: {
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: dashboardScreen.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalLine: {
    fontSize: 16,
    color: dashboardScreen.textPrimary,
    marginBottom: 4,
    lineHeight: 24,
  },
  modalLineMuted: {
    fontSize: 14,
    color: dashboardScreen.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  modalMotivation: {
    marginTop: spacing.sm,
    fontSize: 15,
    fontWeight: '600',
    color: wellness.primaryDark,
    lineHeight: 22,
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
