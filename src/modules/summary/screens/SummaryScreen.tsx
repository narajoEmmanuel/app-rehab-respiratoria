/**
 * Purpose: Session summary after completing Level 1 — loads saved session by id.
 * Module: summary
 */
import { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppButton } from '@/src/shared/ui/AppButton';
import { AppCard } from '@/src/shared/ui/AppCard';
import { MetricTile } from '@/src/shared/ui/MetricTile';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { spacing } from '@/src/shared/theme/spacing';
import { wellnessColors, wellnessRadii } from '@/src/shared/theme/wellness-theme';

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

  useLayoutEffect(() => {
    setSessionDetail(null);
    setErrorMessage(null);

    if (sessionId == null || sessionId === '') {
      setLoading(false);
      return;
    }
    if (parsedId == null || Number.isNaN(parsedId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;
    void (async () => {
      const detail = await getSessionDetail(parsedId);
      if (cancelled) return;
      if (!detail) {
        setSessionDetail(null);
        setErrorMessage('not_found');
        setLoading(false);
        return;
      }
      setSessionDetail(detail);
      setErrorMessage(null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, parsedId]);

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
          <Text style={styles.title}>{getSummaryTitle(null)}</Text>
          <Text style={styles.detail}>
            No hay una sesión seleccionada. Completa un nivel o abre un resumen desde el flujo de
            terapia.
          </Text>
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
          <Text style={styles.title}>{getSummaryTitle(null)}</Text>
          <Text style={styles.detail}>Identificador de sesión no válido.</Text>
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
          <Text style={styles.title}>{getSummaryTitle(null)}</Text>
          <Text style={styles.detail}>No se encontró la sesión guardada.</Text>
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
          <Text style={styles.loadingText}>Cargando resumen…</Text>
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
        <Text style={styles.screenTitle}>{getSummaryTitle(session)}</Text>
        <Text style={styles.screenSubtitle}>{getSummarySubtitle(session)}</Text>
        <Text style={styles.levelLine}>Nivel {levelNum}</Text>
        <View style={styles.classificationBanner}>
          <Text style={styles.classificationTitle}>{classificationTitle}</Text>
          {classificationNote ? (
            <Text style={styles.classificationNote}>{classificationNote}</Text>
          ) : null}
        </View>

        {showSensorCard ? (
          <AppCard style={styles.sensorCard}>
            <Text style={styles.sensorCardTitle}>Datos del sensor (debug)</Text>
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
            <Text style={styles.sensorCardNote}>
              Visible solo con depuración del sensor activada.
            </Text>
          </AppCard>
        ) : null}

        <SectionHeader title="Resultados" />
        <View style={styles.progressBlock}>
          <Text style={styles.progressHeadline}>{sessionProgress.headline}</Text>
          {sessionProgress.support ? (
            <Text style={styles.progressSupport}>{sessionProgress.support}</Text>
          ) : null}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(sessionProgress.progressRatio * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.progressMeta}>
            {session.valid_attempts} repeticiones válidas de {TARGET_ATTEMPTS}
          </Text>
        </View>
        <View style={styles.card}>
          <MetricTile label="Repeticiones válidas" value={String(session.valid_attempts)} tone="success" />
          <MetricTile label="No completadas" value={String(session.invalid_attempts)} />
          <MetricTile label="Volumen máximo" value={`${session.max_volume} mL`} />
          <MetricTile label="Volumen promedio" value={`${session.avg_volume} mL`} />
          <MetricTile label="Tiempo máx. sostenido" value={`${maxHoldSeconds.toFixed(1)} s`} />
          <MetricTile
            label="Tiempo prom. sostenido"
            value={`${session.avg_hold_seconds.toFixed(1)} s`}
          />
        </View>

        <View style={styles.actionsRow}>
          <AppButton
            title="Volver a Terapia"
            onPress={() => router.replace('/(tabs)/terapia')}
            variant="primary"
          />
          <AppButton
            title="Ver Historial"
            onPress={() => router.replace('/(tabs)/historial')}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SensorDataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sensorDataRow}>
      <Text style={styles.sensorDataLabel}>{label}</Text>
      <Text style={styles.sensorDataValue}>{value}</Text>
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
    fontSize: 16,
  },
  levelLine: {
    color: wellnessColors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  classificationBanner: {
    marginBottom: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellnessColors.successSoft,
    borderWidth: 1,
    borderColor: wellnessColors.border,
  },
  classificationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: wellnessColors.primaryDark,
  },
  classificationNote: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    lineHeight: 18,
  },
  sensorCard: {
    marginBottom: spacing.md,
  },
  sensorCardTitle: {
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '700',
    color: wellnessColors.textSecondary,
  },
  sensorDataValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
    textAlign: 'right',
  },
  sensorCardNote: {
    marginTop: spacing.sm,
    fontSize: 11,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    lineHeight: 16,
  },
  screenTitle: {
    color: wellnessColors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  screenSubtitle: {
    color: wellnessColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  title: {
    color: wellnessColors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  detail: {
    color: wellnessColors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  progressBlock: {
    width: '100%',
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellnessColors.successSoft,
    borderWidth: 1,
    borderColor: wellnessColors.border,
  },
  progressHeadline: {
    fontSize: 17,
    fontWeight: '800',
    color: wellnessColors.primaryDark,
  },
  progressSupport: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
    lineHeight: 20,
  },
  progressTrack: {
    marginTop: spacing.sm,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(61, 90, 74, 0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: wellnessColors.primary,
  },
  progressMeta: {
    marginTop: spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: wellnessColors.textSecondary,
  },
  actionsRow: {
    gap: spacing.sm,
  },
});
