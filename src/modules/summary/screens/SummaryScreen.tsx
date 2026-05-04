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

import {
  getSessionDetail,
  type SessionDetail,
} from '@/src/modules/session/session-progress-service';
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

  const noParam = sessionId == null || sessionId === '';
  const invalidId = !noParam && (parsedId == null || Number.isNaN(parsedId));

  if (noParam) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
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
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#9cff54" />
          <Text style={styles.loadingText}>Cargando resumen…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { session } = sessionDetail;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>{getSummaryTitle(session)}</Text>
        <Text style={styles.screenSubtitle}>{getSummarySubtitle(session)}</Text>
        <Text style={styles.levelLine}>Nivel {session.level_id}</Text>

        <View style={styles.card}>
          <MetricRow label="Cumplimiento" value={`${session.compliance_percent}%`} />
          <MetricRow label="Intentos validos" value={String(session.valid_attempts)} />
          <MetricRow label="Intentos invalidos" value={String(session.invalid_attempts)} />
          <MetricRow label="Total intentos" value={String(session.total_attempts)} />
          <MetricRow label="Volumen maximo" value={`${session.max_volume} mL`} />
          <MetricRow label="Volumen promedio" value={`${session.avg_volume} mL`} />
          <MetricRow
            label="Tiempo medio sostenido"
            value={`${session.avg_hold_seconds.toFixed(1)} s`}
          />
          <MetricRow label="Completada" value={session.completed ? 'Si' : 'No'} />
          <MetricRow label="Sesion perfecta" value={session.perfect ? 'Si' : 'No'} />
          <MetricRow
            label="Interrumpida"
            value={session.interrupted === true ? 'Si' : 'No'}
          />
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

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#183911',
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
    color: '#dbffc8',
    fontSize: 16,
  },
  levelLine: {
    color: '#c6f7ab',
    fontSize: 14,
    marginBottom: 16,
  },
  screenTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  screenSubtitle: {
    color: '#c6f7ab',
    fontSize: 14,
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  detail: {
    color: '#dbffc8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#9de765',
    backgroundColor: '#234d16',
    padding: 16,
    marginBottom: 20,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  metricLabel: {
    color: '#d7ffc4',
    fontSize: 16,
    flex: 1,
    paddingRight: 12,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#80dd4f',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#17300d',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#b7f58f',
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#e6ffd8',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
});
