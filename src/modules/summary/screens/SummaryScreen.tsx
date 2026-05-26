/**
 * Purpose: Session summary after completing Level 1 — loads saved session by id.
 * Module: summary
 */
import { useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

import {
  getSessionDetail,
  type SessionDetail,
} from '@/src/modules/session/session-progress-service';
import {
  sessionClassificationMainTitle,
  sessionClassificationSummaryNote,
  sessionSensorDataCardVisible,
} from '@/src/modules/session/session-record-classification';
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
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/terapia')}>
            <Text style={styles.primaryButtonText}>Volver a Terapia</Text>
          </Pressable>
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
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/terapia')}>
            <Text style={styles.primaryButtonText}>Volver a Terapia</Text>
          </Pressable>
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
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/terapia')}>
            <Text style={styles.primaryButtonText}>Volver a Terapia</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || sessionDetail == null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/terapia" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={wellness.primary} />
          <Text style={styles.loadingText}>Cargando resumen…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const session = sessionDetail.session;
  const classificationTitle = sessionClassificationMainTitle(session);
  const classificationNote = sessionClassificationSummaryNote(session);
  const showSensorCard = sessionSensorDataCardVisible(session);
  const sensorMaxMl = session.max_sensor_estimated_volume_ml;
  const sensorU95Ml = session.max_sensor_u95_ml;

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
          <View style={styles.sensorCard}>
            <Text style={styles.sensorCardTitle}>Datos del sensor</Text>
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
            <SensorDataRow
              label="U95 máximo"
              value={
                typeof sensorU95Ml === 'number' && Number.isFinite(sensorU95Ml)
                  ? `±${Math.round(sensorU95Ml)} mL`
                  : '—'
              }
            />
            <Text style={styles.sensorCardNote}>
              Datos calculados con el modelo activo del espirómetro seleccionado.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <SummaryMetricTile label="Repeticiones válidas" value={String(session.valid_attempts)} />
          <SummaryMetricTile label="Repeticiones no completadas" value={String(session.invalid_attempts)} />
          <SummaryMetricTile label="Cumplimiento" value={`${session.compliance_percent}%`} />
          <SummaryMetricTile label="Volumen máximo" value={`${session.max_volume} mL`} />
          <SummaryMetricTile label="Volumen promedio" value={`${session.avg_volume} mL`} />
          <SummaryMetricTile label="Tiempo máximo sostenido" value={`${maxHoldSeconds.toFixed(1)} s`} />
          <SummaryMetricTile
            label="Tiempo promedio sostenido"
            value={`${session.avg_hold_seconds.toFixed(1)} s`}
          />
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace('/(tabs)/terapia')}>
          <Text style={styles.primaryButtonText}>Volver a Terapia</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.replace('/(tabs)/historial')}>
          <Text style={styles.secondaryButtonText}>Ver Historial</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryMetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricTileLabel}>{label}</Text>
      <Text style={styles.metricTileValue}>{value}</Text>
    </View>
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
    backgroundColor: wellness.screenBg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: wellness.textSecondary,
    fontSize: 16,
  },
  levelLine: {
    color: wellness.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  classificationBanner: {
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellness.softGreen,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  classificationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  classificationNote: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: wellness.textSecondary,
    lineHeight: 18,
  },
  sensorCard: {
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  sensorCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: wellness.primaryDark,
    marginBottom: 10,
  },
  sensorDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 6,
  },
  sensorDataLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
  },
  sensorDataValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: wellness.text,
    textAlign: 'right',
  },
  sensorCardNote: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: wellness.textSecondary,
    lineHeight: 16,
  },
  screenTitle: {
    color: wellness.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  screenSubtitle: {
    color: wellness.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  title: {
    color: wellness.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  detail: {
    color: wellness.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricTile: {
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    backgroundColor: wellness.card,
    padding: 14,
  },
  metricTileLabel: {
    color: wellness.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  metricTileValue: {
    color: wellness.text,
    fontSize: 18,
    fontWeight: '800',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: wellness.primary,
    paddingVertical: 14,
    borderRadius: wellnessRadii.pill,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    paddingVertical: 12,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.softGreen,
  },
  secondaryButtonText: {
    color: wellness.primaryDark,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
});
