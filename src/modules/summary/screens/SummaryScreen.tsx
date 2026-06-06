/**
 * Purpose: Session summary after completing Level 1 — loads saved session by id.
 * Module: summary
 */
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { AppText } from '@/src/shared/ui/AppText';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors } from '@/src/shared/theme/wellness-theme';

import { SessionSummaryActions } from '@/src/modules/summary/components/SessionSummaryActions';
import { SessionSummaryHero } from '@/src/modules/summary/components/SessionSummaryHero';
import { SessionSummaryMetricsGrid } from '@/src/modules/summary/components/SessionSummaryMetricsGrid';
import { SessionSummaryProgressCard } from '@/src/modules/summary/components/SessionSummaryProgressCard';
import {
  getSessionDetail,
  type SessionDetail,
  TARGET_ATTEMPTS,
} from '@/src/modules/session/session-progress-service';
import {
  sessionClassificationMainTitle,
  sessionClassificationSummaryNote,
  sessionSensorDataCardVisible,
} from '@/src/modules/session/session-record-classification';
import { describeSessionProgress } from '@/src/modules/session/patient-ui/session-progress-copy';
import { SessionSuccessStreakCard } from '@/src/modules/session/patient-ui/SessionSuccessStreakCard';
import { readAllSessions } from '@/src/modules/session/storage/session-progress-repository';
import { computeSuccessfulSessionStreak } from '@/src/modules/history/utils/session-success-streak';
import { isSensorDebugEnabled } from '@/src/modules/app-mode';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';

function getSummaryTitle(session: SessionRecord | null): string {
  if (!session) return 'Resumen de sesión';
  if (session.perfect && session.completed) return 'Buen control durante la sesión';
  if (session.completed) return 'Sesión completada';
  if (session.interrupted && !session.completed) return 'Sesión detenida';
  return 'Resumen de sesión';
}

function getSummarySubtitle(session: SessionRecord | null): string {
  if (!session) return 'Consulta los resultados de tu ejercicio.';
  if (session.perfect && session.completed) return 'Completaste todos los intentos objetivo con buen control.';
  if (session.completed) return 'Estos son los resultados de tu sesión.';
  if (session.interrupted && !session.completed) return 'Puedes retomarla cuando estés listo.';
  return 'Consulta los resultados de tu ejercicio.';
}

export function SummaryScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  const parsedId = useMemo(() => {
    if (sessionId == null || sessionId === '') return null;
    const n = Number(sessionId);
    return Number.isFinite(n) && Number.isInteger(n) ? n : Number.NaN;
  }, [sessionId]);

  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (sessionId == null || sessionId === '') {
        setSessionDetail(null);
        setErrorMessage(null);
        setCurrentStreak(0);
        setLoading(false);
        return;
      }
      if (parsedId == null || Number.isNaN(parsedId)) {
        setSessionDetail(null);
        setErrorMessage(null);
        setCurrentStreak(0);
        setLoading(false);
        return;
      }
      let cancelled = false;
      void (async () => {
        setLoading(true);
        setErrorMessage(null);
        setSessionDetail(null);
        setCurrentStreak(0);
        const detail = await getSessionDetail(parsedId);
        if (cancelled) return;
        if (!detail) {
          setSessionDetail(null);
          setErrorMessage('not_found');
          setCurrentStreak(0);
          setLoading(false);
          return;
        }
        const allSessions = await readAllSessions();
        if (cancelled) return;
        const patientSessions = allSessions.filter(
          (item) => item.patient_id === detail.session.patient_id,
        );
        const streak = computeSuccessfulSessionStreak(patientSessions);
        setSessionDetail(detail);
        setCurrentStreak(streak.currentStreak);
        setErrorMessage(null);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [parsedId, sessionId]),
  );

  const maxHoldSeconds = useMemo(() => {
    if (sessionDetail == null || !sessionDetail.attempts.length) return 0;
    return Math.max(...sessionDetail.attempts.map((a) => a.hold_ms)) / 1000;
  }, [sessionDetail]);

  const levelNum = useMemo(() => {
    if (sessionDetail == null) return '';
    const m = /^level-(\d+)$/.exec(sessionDetail.session.level_id);
    return m ? m[1] : sessionDetail.session.level_id;
  }, [sessionDetail]);

  const noParam = sessionId == null || sessionId === '';
  const invalidId = !noParam && (parsedId == null || Number.isNaN(parsedId));

  if (noParam) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/terapia" />
        <View style={styles.centered}>
          <AppText variant="titleLarge" style={styles.title}>
            {getSummaryTitle(null)}
          </AppText>
          <AppText variant="bodyLarge" style={styles.detail}>
            No hay una sesión seleccionada. Completa un nivel o abre un resumen desde el flujo de
            terapia.
          </AppText>
          <AppButton
            title="Volver a Terapia"
            onPress={() => router.replace('/(tabs)/terapia')}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (invalidId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/terapia" />
        <View style={styles.centered}>
          <AppText variant="titleLarge" style={styles.title}>
            {getSummaryTitle(null)}
          </AppText>
          <AppText variant="bodyLarge" style={styles.detail}>
            Identificador de sesión no válido.
          </AppText>
          <AppButton
            title="Volver a Terapia"
            onPress={() => router.replace('/(tabs)/terapia')}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage === 'not_found') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/terapia" />
        <View style={styles.centered}>
          <AppText variant="titleLarge" style={styles.title}>
            {getSummaryTitle(null)}
          </AppText>
          <AppText variant="bodyLarge" style={styles.detail}>
            No se encontró la sesión guardada.
          </AppText>
          <AppButton
            title="Volver a Terapia"
            onPress={() => router.replace('/(tabs)/terapia')}
            variant="primary"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loading || sessionDetail == null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/terapia" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={wellnessColors.primary} />
          <AppText variant="bodyLarge" style={styles.loadingText}>
            Cargando resumen…
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  const session = sessionDetail.session;
  const classificationTitle = sessionClassificationMainTitle(session);
  const classificationNote = sessionClassificationSummaryNote(session);
  const showSensorCard = sessionSensorDataCardVisible(session);
  const sensorDebug = isSensorDebugEnabled();
  const sensorMaxMl = session.max_sensor_estimated_volume_ml;
  const sensorU95Ml = session.max_sensor_u95_ml;
  const sessionProgress = describeSessionProgress({
    validAttempts: session.valid_attempts,
    targetAttempts: TARGET_ATTEMPTS,
    perfect: session.perfect,
    completed: session.completed,
    interrupted: session.interrupted,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/terapia" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <SessionSummaryHero
          title={getSummaryTitle(session)}
          subtitle={getSummarySubtitle(session)}
          levelLabel={levelNum}
          classificationTitle={classificationTitle}
          classificationNote={classificationNote}
          perfect={session.perfect}
          completed={session.completed}
          interrupted={session.interrupted}
        />

        <SessionSuccessStreakCard currentStreak={currentStreak} />

        <SectionHeader title="Resultados" />
        <SessionSummaryProgressCard
          progressHeadline={sessionProgress.headline}
          progressSupport={sessionProgress.support}
          validAttempts={session.valid_attempts}
          targetAttempts={TARGET_ATTEMPTS}
          progressRatio={sessionProgress.progressRatio}
        />
        <SessionSummaryMetricsGrid
          validAttempts={session.valid_attempts}
          invalidAttempts={session.invalid_attempts}
          maxVolume={session.max_volume}
          avgVolume={session.avg_volume}
          maxHoldSeconds={maxHoldSeconds}
          avgHoldSeconds={session.avg_hold_seconds}
        />

        {showSensorCard ? (
          <AppCard style={styles.sensorCard}>
            <AppText variant="caption" style={styles.sensorCardTitle}>
              Datos del sensor (debug)
            </AppText>
            <SensorDataRow label="Fuente" value={session.data_source ?? 'sensor_model'} />
            <SensorDataRow
              label="Validación"
              value={session.official_validation_source ?? 'sensor_model'}
            />
            <SensorDataRow
              label="Volumen máx. estimado"
              value={
                typeof sensorMaxMl === 'number' && Number.isFinite(sensorMaxMl)
                  ? `${Math.round(sensorMaxMl)} mL`
                  : '—'
              }
            />
            {sensorDebug ? (
              <SensorDataRow
                label="U95 máximo"
                value={
                  typeof sensorU95Ml === 'number' && Number.isFinite(sensorU95Ml)
                    ? `±${Math.round(sensorU95Ml)} mL`
                    : '—'
                }
              />
            ) : null}
            <AppText variant="label" style={styles.sensorCardNote}>
              Visible solo con depuración del sensor activada.
            </AppText>
          </AppCard>
        ) : null}

        <SessionSummaryActions
          onBackToTherapy={() => router.replace('/(tabs)/terapia')}
          onViewHistory={() => router.replace('/(tabs)/historial')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SensorDataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sensorDataRow}>
      <AppText variant="label" style={styles.sensorDataLabel}>
        {label}
      </AppText>
      <AppText variant="chip" style={styles.sensorDataValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: wellnessColors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    color: wellnessColors.textSecondary,
  },
  sensorCard: {
    marginBottom: spacing.md,
  },
  sensorCardTitle: {
    fontWeight: '800',
    color: wellnessColors.primaryDark,
    marginBottom: spacing.sm,
  },
  sensorDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: 6,
  },
  sensorDataLabel: {
    flex: 1,
    color: wellnessColors.textSecondary,
  },
  sensorDataValue: {
    flex: 1,
    color: wellnessColors.textPrimary,
    textAlign: 'right',
  },
  sensorCardNote: {
    marginTop: spacing.sm,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    lineHeight: 16,
  },
  title: {
    color: wellnessColors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  detail: {
    color: wellnessColors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
