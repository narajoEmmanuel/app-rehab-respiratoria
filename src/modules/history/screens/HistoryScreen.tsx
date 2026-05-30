/**
 * Purpose: Patient history as motivational progress (adherence + gamified calendar).
 * Module: history
 * Dependencies: react-native, @react-navigation/native, expo-router
 * Notes: Intended to show historical sessions and trends.
 *        Diagnostic is not required to view this screen.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppButton } from '@/src/shared/ui/AppButton';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { spacing } from '@/src/shared/theme/spacing';
import { wellness, wellnessColors, wellnessRadii, wellnessShadows } from '@/src/shared/theme/wellness-theme';
import { dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { addDaysLocal, getLocalDateKey } from '@/src/shared/utils/local-date-key';
import { isSensorDebugEnabled } from '@/src/modules/app-mode';

/** Meta visual de sostén (3 s del juego); solo etiqueta UI. */
const SUSTAIN_META_SECONDS = 3;

const SCREEN_BG = '#E8F4F1';

const CAL_BG: Record<CalendarDayKind, string> = {
  none: '#CFD8DC',
  perfect: '#43A047',
  good: '#A5D6A7',
  incomplete: '#FFE082',
  interrupted: '#EF9A9A',
};
const CAL_BG_PRACTICE = '#81D4FA';

const CALENDAR_LEGEND: { color: string; label: string }[] = [
  { color: CAL_BG.perfect, label: 'Meta del día' },
  { color: CAL_BG.good, label: 'Buen avance' },
  { color: CAL_BG.incomplete, label: 'Sesión incompleta' },
  { color: CAL_BG.interrupted, label: 'Interrumpida' },
  { color: CAL_BG_PRACTICE, label: 'Práctica (sin sensor)' },
  { color: CAL_BG.none, label: 'Sin actividad' },
];

const STREAK_GRADIENT = ['#6AD4BC', '#3DB8A8', '#2A9E88'] as const;

const WEEK_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const BADGE_SLOT_SIZE = 40;

type BadgeVariant = 'yellow' | 'teal' | 'blue';

const BADGE_PALETTES: Record<
  BadgeVariant,
  {
    slotBg: string;
    ribbonLeft: readonly [string, string];
    ribbonRight: readonly [string, string];
    ring: readonly [string, string, string];
    core: readonly [string, string];
  }
> = {
  yellow: {
    slotBg: '#FFF8E8',
    ribbonLeft: ['#FFE082', '#FFC107'],
    ribbonRight: ['#FFD54F', '#FFB300'],
    ring: ['#FFE082', '#FFC107', '#F9A825'],
    core: ['#FFFDE7', '#FFD54F'],
  },
  teal: {
    slotBg: '#E8F6F5',
    ribbonLeft: ['#80CBC4', '#4DB6AC'],
    ribbonRight: ['#4DB6AC', '#26A69A'],
    ring: ['#B2DFDB', '#4DB6AC', '#00897B'],
    core: ['#E0F2F1', '#80CBC4'],
  },
  blue: {
    slotBg: '#E8F4FC',
    ribbonLeft: ['#90CAF9', '#64B5F6'],
    ribbonRight: ['#64B5F6', '#42A5F5'],
    ring: ['#BBDEFB', '#64B5F6', '#1E88E5'],
    core: ['#E3F2FD', '#90CAF9'],
  },
};

function SummaryBadgeIcon({ variant }: { variant: BadgeVariant }) {
  const palette = BADGE_PALETTES[variant];

  return (
    <View
      style={[badgeStyles.slot, { backgroundColor: palette.slotBg }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={badgeStyles.canvas}>
        <LinearGradient
          colors={[...palette.ribbonLeft]}
          style={[badgeStyles.ribbon, badgeStyles.ribbonLeft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={[...palette.ribbonRight]}
          style={[badgeStyles.ribbon, badgeStyles.ribbonRight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={[...palette.ring]}
          style={badgeStyles.outerRing}
          start={{ x: 0.25, y: 0.1 }}
          end={{ x: 0.95, y: 1 }}
        />
        {variant === 'teal' ? <View style={badgeStyles.innerRing} /> : null}
        <LinearGradient
          colors={[...palette.core]}
          style={badgeStyles.core}
          start={{ x: 0.25, y: 0.2 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={badgeStyles.shine} />
        {variant === 'yellow' ? <View style={badgeStyles.yellowAccent} /> : null}
        {variant === 'blue' ? <View style={badgeStyles.blueLevelMark} /> : null}
      </View>
    </View>
  );
}

function StreakFireEmoji({ muted }: { muted: boolean }) {
  return (
    <Text
      style={[styles.streakFireEmoji, muted && styles.streakFireEmojiMuted]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      🔥
    </Text>
  );
}

function StreakHeroCard({ streakDays }: { streakDays: number }) {
  const active = streakDays > 0;
  return (
    <LinearGradient
      colors={[...STREAK_GRADIENT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.streakHero}>
      <View style={styles.streakHeroContent}>
        <StreakFireEmoji muted={!active} />
        <View style={styles.streakHeroText}>
          <Text style={styles.streakHeroNumber}>{streakDays}</Text>
          <Text style={styles.streakHeroLabel}>días de racha activa</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function StatMiniCard({
  badgeVariant,
  label,
  value,
}: {
  badgeVariant: BadgeVariant;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statMiniCard}>
      <View style={styles.statMiniIconSlot}>
        <SummaryBadgeIcon variant={badgeVariant} />
      </View>
      <Text style={styles.statMiniValue}>{value}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );
}

function MetricProgressRow({
  label,
  valueText,
  progress,
}: {
  label: string;
  valueText: string;
  progress: number;
}) {
  const safeProgress = Math.max(0, Math.min(progress, 1));
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricRowHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{valueText}</Text>
      </View>
      <View style={styles.metricTrack}>
        <View style={[styles.metricFill, { width: `${safeProgress * 100}%` }]} />
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

  const historyLevelOrdinal = historyLevelId.replace('level-', '');

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
    return {
      totalSessions: patientSessions.length,
      totalValidReps,
      levelLabel: `Nivel ${historyLevelOrdinal}`,
      avgHoldSeconds: holdCount > 0 ? holdSumMs / holdCount / 1000 : null,
      weeklyActiveDays,
    };
  }, [patientSessions, attempts, therapeuticDayKeys, todayKey, historyLevelOrdinal]);

  const monthCells = useMemo(() => monthGridDates(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthTitle = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    const raw = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
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

  const hasAnyHistory = therapeuticDayKeys.size > 0 || practiceDayKeys.size > 0;
  const selectedDateKey = selectedDay?.dateKey ?? null;

  const sensorDebug = isSensorDebugEnabled();

  const vimValueText =
    bestSensorVolumeMl != null && bestSensorVolumeMl > 0
      ? `${Math.round(bestSensorVolumeMl)} mL`
      : 'Pendiente';
  const vimProgress = bestSensorVolumeMl != null && bestSensorVolumeMl > 0 ? 1 : 0;
  const adherenceValueText = `${displayStats.weeklyActiveDays}/7 días`;
  const adherenceProgress = displayStats.weeklyActiveDays / 7;
  const sustainValueText =
    displayStats.avgHoldSeconds != null
      ? `${displayStats.avgHoldSeconds.toFixed(1)} s / ${SUSTAIN_META_SECONDS} s meta`
      : 'Pendiente';
  const sustainProgress =
    displayStats.avgHoldSeconds != null
      ? Math.min(displayStats.avgHoldSeconds / SUSTAIN_META_SECONDS, 1)
      : 0;

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
            <View style={styles.pageHeader}>
              <Text style={styles.pageTitle}>Mi progreso</Text>
              <Text style={styles.pageMonth}>{monthTitle}</Text>
            </View>

            <StreakHeroCard streakDays={streakDays} />

            <AppCard style={styles.calendarCard}>
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
                  const isSelected = dateKey === selectedDateKey;
                  const hasPracticeOnly = kind === 'none' && practiceDayKeys.has(dateKey);
                  return (
                    <Pressable
                      key={dateKey}
                      onPress={() => openDay(dateKey)}
                      style={[
                        styles.dayCell,
                        { backgroundColor: hasPracticeOnly ? CAL_BG_PRACTICE : CAL_BG[kind] },
                        isToday && styles.dayCellToday,
                        isSelected && styles.dayCellSelected,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Día ${dateKey}`}>
                      <Text
                        style={[
                          styles.dayCellNum,
                          kind === 'none' && !hasPracticeOnly && styles.dayCellNumMuted,
                          (kind === 'perfect' || kind === 'good') && styles.dayCellNumOnColor,
                        ]}>
                        {Number(dateKey.slice(8, 10))}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.legendContainer}>
                {CALENDAR_LEGEND.map((item) => (
                  <LegendDot key={item.label} color={item.color} label={item.label} />
                ))}
              </View>
            </AppCard>

            <View style={styles.statMiniRow}>
              <StatMiniCard
                badgeVariant="yellow"
                label="Sesiones totales"
                value={String(displayStats.totalSessions)}
              />
              <StatMiniCard
                badgeVariant="teal"
                label="Repeticiones"
                value={String(displayStats.totalValidReps)}
              />
              <StatMiniCard
                badgeVariant="blue"
                label="Nivel actual"
                value={displayStats.levelLabel}
              />
            </View>

            <AppCard style={styles.metricsCard}>
              <Text style={styles.metricsTitle}>Progreso por métrica</Text>
              <MetricProgressRow label="Mejor volumen" valueText={vimValueText} progress={vimProgress} />
              <MetricProgressRow
                label="Constancia semanal"
                valueText={adherenceValueText}
                progress={adherenceProgress}
              />
              <MetricProgressRow
                label="Tiempo sostenido"
                valueText={sustainValueText}
                progress={sustainProgress}
              />
            </AppCard>

            {!hasAnyHistory ? (
              <View style={styles.inlineEmptyCard}>
                <Text style={styles.inlineEmptyTitle}>Aún no hay sesiones registradas</Text>
                <Text style={styles.inlineEmptyText}>
                  Completa tu primera sesión para ver tu progreso aquí.
                </Text>
              </View>
            ) : null}

            {achievementsList.length > 0 ? (
              <>
                <SectionHeader title="Logros" />
                <AppCard>
                  {achievementsList.map((a) => (
                    <AchievementRow key={a.id} item={a} />
                  ))}
                </AppCard>
              </>
            ) : null}

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
                      <Text style={styles.modalChipText}>Con medición</Text>
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
                    <Text style={styles.modalSectionTitle}>Tu inspiración</Text>
                    <Text style={styles.modalLine}>
                      {selectedDay.classification.sensorSessionsCount}{' '}
                      {selectedDay.classification.sensorSessionsCount === 1 ? 'sesión' : 'sesiones'}
                      {selectedDay.maxVolumeMl != null && selectedDay.maxVolumeMl > 0
                        ? ` · Mejor volumen ${selectedDay.maxVolumeMl} mL`
                        : ''}
                    </Text>
                    {sensorDebug && selectedDay.classification.maxSensorU95Ml != null ? (
                      <Text style={styles.modalLineMuted}>
                        U95 máx. ±{Math.round(selectedDay.classification.maxSensorU95Ml)} mL (debug)
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
      <View style={styles.legendDotSlot}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
      </View>
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: wellness.text,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 22,
    color: wellness.textSecondary,
    marginBottom: spacing.sm,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: wellness.text,
    letterSpacing: -0.4,
    flexShrink: 0,
  },
  pageMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'right',
    flex: 1,
  },
  streakHero: {
    borderRadius: wellnessRadii.cardLarge,
    paddingVertical: spacing.lg + 4,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...wellnessShadows.card,
  },
  streakHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  streakHeroText: {
    flex: 1,
  },
  streakFireEmoji: {
    fontSize: 48,
    lineHeight: 52,
  },
  streakFireEmojiMuted: {
    opacity: 0.55,
  },
  streakHeroNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 46,
  },
  streakHeroLabel: {
    marginTop: 2,
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
    lineHeight: 22,
  },
  calendarCard: {
    marginBottom: spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthNavBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F0F7F5',
  },
  monthNavBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: wellness.primaryDark,
    lineHeight: 28,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.text,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekCellText: {
    fontWeight: '700',
    color: wellness.textSecondary,
    fontSize: 13,
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
    marginBottom: 4,
  },
  dayCellEmpty: {
    width: '14.28%',
    aspectRatio: 1,
    marginBottom: 4,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: wellness.primary,
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: '#1578A8',
    transform: [{ scale: 1.06 }],
  },
  dayCellNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#37474F',
  },
  dayCellNumMuted: {
    color: '#90A4AE',
  },
  dayCellNumOnColor: {
    color: '#1B5E20',
  },
  legendContainer: {
    flexDirection: 'column',
    marginTop: spacing.sm,
    gap: 6,
    alignSelf: 'stretch',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  legendDotSlot: {
    width: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    color: wellness.textSecondary,
    fontWeight: '600',
  },
  statMiniRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statMiniCard: {
    flex: 1,
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.border,
    ...wellnessShadows.card,
    minWidth: 0,
  },
  statMiniIconSlot: {
    height: BADGE_SLOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statMiniValue: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: wellness.text,
    textAlign: 'center',
  },
  statMiniLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  metricsCard: {
    marginBottom: spacing.md,
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: wellness.text,
    marginBottom: spacing.md,
  },
  metricRow: {
    marginBottom: spacing.md,
  },
  metricRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 8,
  },
  metricLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: wellness.text,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: wellness.primaryDark,
    textAlign: 'right',
    flexShrink: 0,
  },
  metricTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8EDEA',
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: wellness.primary,
  },
  emptyCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  inlineEmptyCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  inlineEmptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: wellness.text,
    textAlign: 'center',
  },
  inlineEmptyText: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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
    fontSize: 17,
    fontWeight: '700',
    color: wellness.text,
  },
  achievementTitleLocked: {
    color: wellness.textSecondary,
  },
  achievementDesc: {
    marginTop: 4,
    fontSize: 15,
    color: wellness.textSecondary,
    lineHeight: 22,
  },
  achievementDescLocked: {
    color: wellness.textSecondary,
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
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: wellness.border,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: wellness.text,
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
    color: wellness.text,
  },
  modalSection: {
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalLine: {
    fontSize: 16,
    color: wellness.text,
    marginBottom: 4,
    lineHeight: 24,
  },
  modalLineMuted: {
    fontSize: 14,
    color: wellness.textSecondary,
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
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});

const badgeStyles = StyleSheet.create({
  slot: {
    width: BADGE_SLOT_SIZE,
    height: BADGE_SLOT_SIZE,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 171, 165, 0.1)',
  },
  canvas: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    width: 9,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  ribbonLeft: {
    left: 4,
    transform: [{ rotate: '-20deg' }],
  },
  ribbonRight: {
    right: 4,
    transform: [{ rotate: '20deg' }],
  },
  outerRing: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  innerRing: {
    position: 'absolute',
    bottom: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  core: {
    position: 'absolute',
    bottom: 5,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  shine: {
    position: 'absolute',
    bottom: 14,
    left: 5,
    width: 9,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  yellowAccent: {
    position: 'absolute',
    top: 1,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    opacity: 0.75,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.35)',
  },
  blueLevelMark: {
    position: 'absolute',
    bottom: 9,
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
});
