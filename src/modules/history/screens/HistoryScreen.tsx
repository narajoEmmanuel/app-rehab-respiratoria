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
  buildDayAggregate,
  buildAttemptsBySessionId,
  classifyCalendarDay,
  countCompletedToday,
  dayDetailMotivation,
  formatDisplayDateEs,
  globalMaxSensorVolumeMlForPatient,
  groupSessionsByDay,
  monthGridDates,
  computeStreakDays,
  hadUnlockPerfectDayForLevel,
  therapeuticActivityDayKeys,
  practiceActivityDayKeys,
  type CalendarDayKind,
  type DayAggregate,
} from '@/src/modules/history/services/history-aggregates';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';
import { isTherapeuticSessionRecord } from '@/src/modules/session/session-record-classification';
import { getCurrentActiveLevel } from '@/src/modules/diagnostics/diagnostic-service';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { readAllAttempts, readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppButton } from '@/src/shared/ui/AppButton';
import { RespiraBunnyImage } from '@/src/shared/ui/RespiraBunnyImage';
import { spacing } from '@/src/shared/theme/spacing';
import {
  appScreenBackground,
  wellness,
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';
import { dashboardScrollBottomPadding } from '@/src/theme/dashboard-screen';
import { addDaysLocal, getLocalDateKey, sessionRecordLocalDayKey } from '@/src/shared/utils/local-date-key';
import { isSensorDebugEnabled } from '@/src/modules/app-mode';

/** Meta visual de sostén (2 s del juego); solo etiqueta UI. */
const SUSTAIN_META_SECONDS = 2;

const CAL_BG: Record<CalendarDayKind, string> = {
  none: '#E8EDEA',
  perfect: '#43A047',
  good: '#B8E0C0',
  incomplete: '#FFE082',
  interrupted: '#F5B4B4',
};
const CAL_BG_PRACTICE = '#B3E5FC';

const CALENDAR_LEGEND_PRIMARY: { color: string; label: string }[] = [
  { color: CAL_BG.perfect, label: 'Completada' },
  { color: CAL_BG.good, label: 'Parcial' },
  { color: CAL_BG.none, label: 'Sin actividad' },
];

const CALENDAR_LEGEND_EXTRA: { color: string; label: string }[] = [
  { color: CAL_BG.incomplete, label: 'Sesión incompleta' },
  { color: CAL_BG.interrupted, label: 'Interrumpida' },
  { color: CAL_BG_PRACTICE, label: 'Práctica (sin sensor)' },
];

const WEEK_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const STREAK_ACTIVE_GRADIENT = ['#5CE0C8', '#34ABA5', '#1F7E7A'] as const;
const STREAK_WARM_GRADIENT = ['#FFF6EE', '#FFE8D4', '#FFD9B8'] as const;

/** Altura del bloque visual (fuego + Bunny) alineada con la card hero. */
const STREAK_HERO_VISUAL_HEIGHT = 108;
const STREAK_HERO_BUNNY_SIZE = STREAK_HERO_VISUAL_HEIGHT;

const CALENDAR_DAY_HEIGHT = 34;

const EMPTY_METRIC_PLACEHOLDER = 'Tras tu primera sesión';

/** Quita celdas vacías al final del mes para no reservar filas en blanco. */
function trimTrailingEmptyCalendarCells(cells: (string | null)[]): (string | null)[] {
  let lastIndex = cells.length - 1;
  while (lastIndex >= 0 && cells[lastIndex] == null) {
    lastIndex -= 1;
  }
  return cells.slice(0, lastIndex + 1);
}

type ProgressAchievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
};

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
}): ProgressAchievement[] {
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

function formatSessionDateTime(sessionDate: string): string {
  const parsed = Date.parse(sessionDate);
  if (Number.isNaN(parsed)) return 'Fecha no disponible';
  return new Date(parsed).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

function StreakFireEmoji({ active, hero }: { active: boolean; hero?: boolean }) {
  return (
    <Text
      style={[
        styles.streakFire,
        hero && styles.streakFireHero,
        active ? styles.streakFireActive : styles.streakFireDim,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      🔥
    </Text>
  );
}

function StreakHeroCard({
  streakDays,
  streakLost,
  dailyGoalMet,
}: {
  streakDays: number;
  streakLost: boolean;
  dailyGoalMet: boolean;
}) {
  const active = streakDays > 0;
  const dayLabel = streakDays === 1 ? 'día' : 'días';

  let title: string;
  let body: string;
  let gradientColors: readonly [string, string, string];
  let fireActive = false;

  if (active) {
    fireActive = true;
    gradientColors = STREAK_ACTIVE_GRADIENT;
    title = `${streakDays} ${dayLabel} de racha activa`;
    body = dailyGoalMet
      ? 'Meta del día completada. Sigue así.'
      : 'Completa tu sesión de hoy para mantener tu racha.';
  } else if (streakLost) {
    gradientColors = STREAK_WARM_GRADIENT;
    title = 'Tu racha puede comenzar de nuevo';
    body = 'Retoma tu práctica hoy para volver a activarla.';
  } else {
    gradientColors = STREAK_WARM_GRADIENT;
    title = 'Tu primera racha empieza hoy';
    body = 'Completa una sesión para encender tu progreso.';
  }

  const titleStyle = active ? styles.streakHeroTitleActive : styles.streakHeroTitleWarm;
  const bodyStyle = active ? styles.streakHeroBodyActive : styles.streakHeroBodyWarm;

  return (
    <View style={styles.streakHeroWrap}>
      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.85 }}
        style={styles.streakHeroGradient}>
        <View style={styles.streakHeroRow}>
          <View style={styles.streakHeroVisual}>
            <RespiraBunnyImage pose="presenting" size={STREAK_HERO_BUNNY_SIZE} />
            <View style={styles.streakHeroFireSlot}>
              <StreakFireEmoji active={fireActive} hero />
            </View>
          </View>
          <View style={styles.streakHeroCopy}>
            <Text style={titleStyle}>{title}</Text>
            <Text style={bodyStyle}>{body}</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function MonthChip({ label }: { label: string }) {
  return (
    <View style={styles.monthChip}>
      <Text style={styles.monthChipText}>{label}</Text>
    </View>
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
  showTrack,
}: {
  label: string;
  valueText: string;
  progress: number;
  showTrack: boolean;
}) {
  const safeProgress = Math.max(0, Math.min(progress, 1));
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricRowHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text
          style={[
            styles.metricValue,
            !showTrack && valueText === EMPTY_METRIC_PLACEHOLDER && styles.metricValueMuted,
          ]}>
          {valueText}
        </Text>
      </View>
      {showTrack ? (
        <View style={styles.metricTrack}>
          <View style={[styles.metricFill, { width: `${safeProgress * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

function AchievementCompactCard({ item }: { item: ProgressAchievement }) {
  const { title, description, unlocked, icon } = item;
  return (
    <View style={[styles.achievementCompact, unlocked && styles.achievementCompactUnlocked]}>
      <Text style={[styles.achievementCompactIcon, !unlocked && styles.achievementCompactIconLocked]}>
        {icon}
      </Text>
      <Text
        style={[styles.achievementCompactTitle, !unlocked && styles.achievementCompactTitleLocked]}
        numberOfLines={2}>
        {title}
      </Text>
      <Text
        style={[styles.achievementCompactDesc, !unlocked && styles.achievementCompactDescLocked]}
        numberOfLines={3}>
        {description}
      </Text>
    </View>
  );
}

function CalendarLegend({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <View style={styles.legendContainer}>
      <View style={styles.legendPrimaryRow}>
        {CALENDAR_LEGEND_PRIMARY.map((item) => (
          <LegendDot key={item.label} color={item.color} label={item.label} compact />
        ))}
      </View>
      {expanded ? (
        <View style={styles.legendExtraBlock}>
          {CALENDAR_LEGEND_EXTRA.map((item) => (
            <LegendDot key={item.label} color={item.color} label={item.label} compact />
          ))}
        </View>
      ) : null}
      <Pressable onPress={onToggle} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.legendMoreLink}>{expanded ? 'Ver menos estados' : 'Ver más estados'}</Text>
      </Pressable>
    </View>
  );
}

function LastSessionCard({
  session,
  bestHoldSeconds,
  onViewDetail,
}: {
  session: SessionRecord;
  bestHoldSeconds: number | null;
  onViewDetail: () => void;
}) {
  const volMl =
    session.max_sensor_estimated_volume_ml != null && session.max_sensor_estimated_volume_ml > 0
      ? `${Math.round(session.max_sensor_estimated_volume_ml)} mL`
      : session.max_volume > 0
        ? `${Math.round(session.max_volume)} mL`
        : '—';
  const holdText =
    bestHoldSeconds != null && bestHoldSeconds > 0
      ? `${bestHoldSeconds.toFixed(1)} s`
      : session.avg_hold_seconds > 0
        ? `${session.avg_hold_seconds.toFixed(1)} s`
        : '—';

  return (
    <AppCard style={styles.lastSessionCard}>
      <Text style={styles.lastSessionTitle}>Última sesión</Text>
      <Text style={styles.lastSessionDate}>{formatSessionDateTime(session.session_date)}</Text>
      <View style={styles.lastSessionMetrics}>
        <View style={styles.lastSessionMetric}>
          <Text style={styles.lastSessionMetricLabel}>Repeticiones válidas</Text>
          <Text style={styles.lastSessionMetricValue}>{session.valid_attempts}</Text>
        </View>
        <View style={styles.lastSessionMetric}>
          <Text style={styles.lastSessionMetricLabel}>Mejor volumen</Text>
          <Text style={styles.lastSessionMetricValue}>{volMl}</Text>
        </View>
        <View style={styles.lastSessionMetric}>
          <Text style={styles.lastSessionMetricLabel}>Tiempo sostenido</Text>
          <Text style={styles.lastSessionMetricValue}>{holdText}</Text>
        </View>
      </View>
      <AppButton title="Ver detalle" onPress={onViewDetail} variant="secondary" />
    </AppCard>
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
      : EMPTY_METRIC_PLACEHOLDER;
  const vimProgress = bestSensorVolumeMl != null && bestSensorVolumeMl > 0 ? 1 : 0;
  const adherenceValueText = `${displayStats.weeklyActiveDays} de 7 días`;
  const adherenceProgress = displayStats.weeklyActiveDays / 7;
  const sustainValueText =
    displayStats.avgHoldSeconds != null
      ? `${displayStats.avgHoldSeconds.toFixed(1)} s`
      : EMPTY_METRIC_PLACEHOLDER;
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
              <MonthChip label={headerMonthChip} />
            </View>

            <StreakHeroCard
              streakDays={streakDays}
              streakLost={streakLost}
              dailyGoalMet={dailyGoalMet}
            />

            <View style={styles.statMiniRow}>
              <StatMiniCard badgeVariant="yellow" label="Racha" value={streakMiniValue} />
              <StatMiniCard
                badgeVariant="teal"
                label="Sesiones"
                value={`${displayStats.weeklySessions} esta semana`}
              />
              <StatMiniCard
                badgeVariant="blue"
                label="Repeticiones válidas"
                value={`${displayStats.totalValidReps} completadas`}
              />
            </View>

            <AppCard style={styles.metricsCard}>
              <Text style={styles.metricsTitle}>Progreso respiratorio</Text>
              <MetricProgressRow
                label="Mejor volumen estimado"
                valueText={vimValueText}
                progress={vimProgress}
                showTrack={hasRespiratoryMetrics}
              />
              <MetricProgressRow
                label="Tiempo sostenido promedio"
                valueText={sustainValueText}
                progress={sustainProgress}
                showTrack={hasRespiratoryMetrics}
              />
              <MetricProgressRow
                label="Cumplimiento semanal"
                valueText={adherenceValueText}
                progress={adherenceProgress}
                showTrack
              />
            </AppCard>

            <Text style={styles.sectionTitle}>Calendario de actividad</Text>
            <Text style={styles.sectionSubtitle}>Revisa tus sesiones registradas por día.</Text>

            <AppCard style={styles.calendarCard}>
              <View style={styles.monthNav}>
                <Pressable
                  onPress={() => shiftMonth(-1)}
                  style={styles.monthNavBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Mes anterior">
                  <Text style={styles.monthNavBtnText}>‹</Text>
                </Pressable>
                <Text style={styles.monthTitle}>{monthChipLabel}</Text>
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
                {compactMonthCells.map((dateKey, idx) => {
                  if (!dateKey) {
                    return <View key={`e-${idx}`} style={styles.dayCellEmpty} />;
                  }
                  const list = byDay.get(dateKey) ?? [];
                  const kind = list.length === 0 ? 'none' : classifyCalendarDay(list);
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDateKey;
                  const hasPracticeOnly = kind === 'none' && practiceDayKeys.has(dateKey);
                  const inactive = kind === 'none' && !hasPracticeOnly;
                  return (
                    <Pressable
                      key={dateKey}
                      onPress={() => openDay(dateKey)}
                      style={[
                        styles.dayCell,
                        { backgroundColor: hasPracticeOnly ? CAL_BG_PRACTICE : CAL_BG[kind] },
                        inactive && styles.dayCellInactive,
                        isToday && styles.dayCellToday,
                        isSelected && styles.dayCellSelected,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Día ${dateKey}`}>
                      <Text
                        style={[
                          styles.dayCellNum,
                          inactive && styles.dayCellNumMuted,
                          (kind === 'perfect' || kind === 'good') && styles.dayCellNumOnColor,
                        ]}>
                        {Number(dateKey.slice(8, 10))}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <CalendarLegend
                expanded={legendExpanded}
                onToggle={() => setLegendExpanded((v) => !v)}
              />
            </AppCard>

            {!hasAnyHistory ? (
              <AppCard style={styles.emptySessionsCard}>
                <Text style={styles.inlineEmptyTitle}>Aún no hay sesiones registradas</Text>
                <Text style={styles.inlineEmptyText}>
                  Tu historial se activará cuando completes tu primera práctica.
                </Text>
                <AppButton
                  title="Comenzar primera sesión"
                  onPress={() => router.push('/(tabs)/terapia')}
                  variant="primary"
                  style={styles.emptySessionsCta}
                />
              </AppCard>
            ) : lastSession ? (
              <LastSessionCard
                session={lastSession}
                bestHoldSeconds={lastSessionHoldSeconds}
                onViewDetail={openLastSessionDay}
              />
            ) : null}

            <Text style={styles.sectionTitle}>Logros</Text>
            <Text style={styles.sectionSubtitle}>Desbloquéalos conforme avanzas en tu terapia.</Text>
            <View style={styles.achievementGrid}>
              {progressAchievements.map((a) => (
                <AchievementCompactCard key={a.id} item={a} />
              ))}
            </View>

            <Text style={styles.sectionTitle}>Reporte para profesional</Text>
            <AppCard style={styles.exportSection}>
              <Text style={styles.exportSectionBody}>
                Exporta tus sesiones, cumplimiento y progreso.
              </Text>
              {!hasAnyHistory ? (
                <Text style={styles.exportHint}>Disponible después de tu primera sesión.</Text>
              ) : null}
              <AppButton
                title="Exportar reporte"
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

function LegendDot({ color, label, compact }: { color: string; label: string; compact?: boolean }) {
  if (compact) {
    return (
      <View style={styles.legendItemCompact}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={styles.legendLabelCompact}>{label}</Text>
      </View>
    );
  }
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
    backgroundColor: appScreenBackground,
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
    alignItems: 'center',
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
  monthChip: {
    backgroundColor: '#F0F7F5',
    borderRadius: wellnessRadii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: wellness.primaryDark,
  },
  streakHeroWrap: {
    marginBottom: spacing.lg,
    borderRadius: wellnessRadii.cardLarge,
    overflow: 'hidden',
    ...wellnessShadows.card,
  },
  streakHeroGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: STREAK_HERO_VISUAL_HEIGHT + spacing.md * 2,
    justifyContent: 'center',
  },
  streakHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  streakHeroVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: STREAK_HERO_VISUAL_HEIGHT,
    flexShrink: 0,
    marginRight: spacing.xs,
  },
  streakHeroCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  streakHeroFireSlot: {
    height: STREAK_HERO_VISUAL_HEIGHT,
    justifyContent: 'center',
    marginLeft: -8,
    paddingTop: 10,
  },
  streakFire: {
    fontSize: 36,
    lineHeight: 40,
  },
  streakFireHero: {
    fontSize: 58,
    lineHeight: 62,
  },
  streakFireDim: {
    opacity: 0.42,
  },
  streakFireActive: {
    opacity: 1,
    textShadowColor: 'rgba(255, 160, 60, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  streakHeroTitleWarm: {
    fontSize: 22,
    fontWeight: '800',
    color: '#5D4037',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  streakHeroBodyWarm: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: '#795548',
    fontWeight: '500',
  },
  streakHeroTitleActive: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.35,
    lineHeight: 30,
  },
  streakHeroBodyActive: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.94)',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: wellness.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.textSecondary,
    marginBottom: spacing.sm,
  },
  calendarCard: {
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    fontSize: 15,
    fontWeight: '700',
    color: wellness.text,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekCellText: {
    fontWeight: '700',
    color: wellness.textSecondary,
    fontSize: 11,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: CALENDAR_DAY_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 2,
  },
  dayCellInactive: {
    backgroundColor: '#EEF2F0',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: CALENDAR_DAY_HEIGHT,
    marginBottom: 2,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: wellness.primary,
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: wellness.primaryDark,
  },
  dayCellNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#37474F',
  },
  dayCellNumMuted: {
    color: '#B0BEC5',
    fontWeight: '600',
  },
  dayCellNumOnColor: {
    color: '#1B5E20',
  },
  legendContainer: {
    marginTop: 6,
    paddingTop: 4,
    gap: 4,
    alignSelf: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: wellness.border,
  },
  legendPrimaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  legendItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLabelCompact: {
    fontSize: 11,
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  legendExtraBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendMoreLink: {
    fontSize: 11,
    fontWeight: '700',
    color: wellness.primaryDark,
    marginTop: 2,
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
    fontSize: 15,
    fontWeight: '800',
    color: wellness.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  statMiniLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: wellness.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
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
    maxWidth: '58%',
  },
  metricValueMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
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
  emptySessionsCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  emptySessionsCta: {
    marginTop: spacing.xs,
  },
  inlineEmptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: wellness.text,
  },
  inlineEmptyText: {
    fontSize: 15,
    color: wellness.textSecondary,
    lineHeight: 22,
  },
  lastSessionCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  lastSessionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: wellness.text,
  },
  lastSessionDate: {
    fontSize: 15,
    fontWeight: '600',
    color: wellness.primaryDark,
  },
  lastSessionMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  lastSessionMetric: {
    minWidth: '30%',
    flexGrow: 1,
  },
  lastSessionMetricLabel: {
    fontSize: 12,
    color: wellness.textSecondary,
    marginBottom: 2,
  },
  lastSessionMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: wellness.text,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  achievementCompact: {
    width: '48%',
    backgroundColor: '#F7F9F8',
    borderRadius: wellnessRadii.card,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#E0E6E3',
    alignItems: 'center',
  },
  achievementCompactUnlocked: {
    borderColor: 'rgba(52, 171, 165, 0.45)',
    backgroundColor: '#F4FBFA',
    ...wellnessShadows.soft,
  },
  achievementCompactIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  achievementCompactIconLocked: {
    opacity: 0.55,
  },
  achievementCompactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: wellness.primaryDark,
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementCompactTitleLocked: {
    color: wellness.text,
    fontWeight: '700',
  },
  achievementCompactDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: wellness.primaryDark,
    textAlign: 'center',
    fontWeight: '600',
  },
  achievementCompactDescLocked: {
    color: wellness.textSecondary,
    fontWeight: '500',
  },
  exportSection: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  exportHint: {
    fontSize: 13,
    lineHeight: 18,
    color: wellness.textSecondary,
    fontStyle: 'italic',
  },
  exportSectionBody: {
    fontSize: 14,
    lineHeight: 20,
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
