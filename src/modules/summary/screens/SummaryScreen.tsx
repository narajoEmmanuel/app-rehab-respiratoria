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
  sessionClassificationSummaryNote,
  sessionClassificationSummaryTitle,
} from '@/src/modules/session/session-record-classification';
import type { SessionRecord } from '@/src/modules/session/types/session-progress';

function getSummaryTitle(session: SessionRecord | null): string {
  if (!session) return 'Resumen de sesión';
  if (session.perfect && session.completed) return 'Sesión perfecta';
  if (session.completed) return 'Sesión completada';
  if (session.interrupted && !session.completed) return 'Sesión interrumpida';
  return 'Resumen de sesión';
}

function getSummarySubtitle(session: SessionRecord | null): string {
  if (!session) return 'Consulta los resultados de tu ejercicio.';
  if (session.perfect && session.completed) return 'Completaste todos los intentos objetivo correctamente.';
  if (session.completed) return 'Estos son los resultados de tu sesión.';
  if (session.interrupted && !session.completed) return 'La sesión se guardó sin completarse.';
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
        <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/niveles" />
        <View style={styles.centered}>
          <Text style={styles.title}>{getSummaryTitle(null)}</Text>
          <Text style={styles.detail}>
            No hay una sesion seleccionada. Completa un nivel o abre un resumen desde el flujo de
            terapia.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/niveles')}>
            <Text style={styles.primaryButtonText}>Volver a Terapia</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (invalidId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/niveles" />
        <View style={styles.centered}>
          <Text style={styles.title}>{getSummaryTitle(null)}</Text>
          <Text style={styles.detail}>Identificador de sesion no valido.</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/niveles')}>
            <Text style={styles.primaryButtonText}>Volver a Terapia</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage === 'not_found') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/niveles" />
        <View style={styles.centered}>
          <Text style={styles.title}>{getSummaryTitle(null)}</Text>
          <Text style={styles.detail}>No se encontro la sesion guardada.</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/niveles')}>
            <Text style={styles.primaryButtonText}>Volver a Terapia</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || sessionDetail == null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/niveles" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={wellness.primary} />
          <Text style={styles.loadingText}>Cargando resumen…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const session = sessionDetail.session;
  const classificationTitle = sessionClassificationSummaryTitle(session);
  const classificationNote = sessionClassificationSummaryNote(session);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/(tabs)/niveles" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>{getSummaryTitle(session)}</Text>
        <Text style={styles.screenSubtitle}>{getSummarySubtitle(session)}</Text>
        <Text style={styles.levelLine}>Nivel {levelNum}</Text>
        {classificationTitle ? (
          <View style={styles.classificationBanner}>
            <Text style={styles.classificationTitle}>{classificationTitle}</Text>
            {classificationNote ? (
              <Text style={styles.classificationNote}>{classificationNote}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <MetricTile label="Sesión completada" value={session.completed ? 'Sí' : 'No'} />
          <MetricTile label="Repeticiones válidas" value={String(session.valid_attempts)} />
          <MetricTile label="Repeticiones fallidas" value={String(session.invalid_attempts)} />
          <MetricTile label="Cumplimiento" value={`${session.compliance_percent}%`} />
          <MetricTile label="Volumen máximo" value={`${session.max_volume} mL`} />
          <MetricTile label="Volumen promedio" value={`${session.avg_volume} mL`} />
          <MetricTile label="Tiempo máximo sostenido" value={`${maxHoldSeconds.toFixed(1)} s`} />
          <MetricTile
            label="Tiempo promedio sostenido"
            value={`${session.avg_hold_seconds.toFixed(1)} s`}
          />
          <MetricTile label="Sesión perfecta" value={session.perfect ? 'Sí' : 'No'} />
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace('/(tabs)/niveles')}>
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

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricTileLabel}>{label}</Text>
      <Text style={styles.metricTileValue}>{value}</Text>
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
