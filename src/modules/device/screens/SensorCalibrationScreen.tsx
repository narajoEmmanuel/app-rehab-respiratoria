import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useEsp32WebSocketSensor } from '@/src/modules/device/adapters/use-esp32-websocket-sensor';
import type { SensorConnectionStatus } from '@/src/modules/device/types/sensor-reading';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellness,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

const EXAMPLE_VOLUMES_ML = [0, 500, 1000, 1500, 2000] as const;

export type CalibrationCapturePoint = {
  id: string;
  volumeMl: number;
  distanceMm: number;
  rawDistanceMm: number;
  distanceValid: boolean;
  source: string;
  timestamp: number;
  repetitionNumber: number;
  createdAt: number;
};

export type VolumeCalibrationSummary = {
  volumeMl: number;
  repetitions: number;
  avgDistanceMm: number;
  avgRawDistanceMm: number;
  minDistanceMm: number;
  maxDistanceMm: number;
};

export type GlobalDistanceRange = {
  minDistanceMm: number;
  maxDistanceMm: number;
  rangeMm: number;
};

export type VolumeDistanceRelation = 'direct' | 'inverse' | 'indeterminate';

function newCaptureId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `cap-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function statusLabel(state: SensorConnectionStatus): string {
  switch (state) {
    case 'idle':
      return 'idle';
    case 'connecting':
      return 'connecting';
    case 'connected':
    case 'receiving':
      return 'connected';
    case 'error':
      return 'error';
    case 'disconnected':
      return 'disconnected';
    default:
      return state;
  }
}

function formatScalar(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'sí' : 'no';
  if (typeof value === 'number' && !Number.isFinite(value)) return '—';
  return String(value);
}

function truncateRaw(raw: string | null, max = 280): string {
  if (!raw) return '—';
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max)}…`;
}

function parseVolumeMlInput(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function computeVolumeSummaries(points: CalibrationCapturePoint[]): VolumeCalibrationSummary[] {
  const byVolume = new Map<number, CalibrationCapturePoint[]>();
  for (const p of points) {
    const list = byVolume.get(p.volumeMl) ?? [];
    list.push(p);
    byVolume.set(p.volumeMl, list);
  }
  return Array.from(byVolume.entries())
    .map(([volumeMl, list]) => {
      const distances = list.map((x) => x.distanceMm);
      const raws = list.map((x) => x.rawDistanceMm);
      const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
      return {
        volumeMl,
        repetitions: list.length,
        avgDistanceMm: sum(distances) / list.length,
        avgRawDistanceMm: sum(raws) / list.length,
        minDistanceMm: Math.min(...distances),
        maxDistanceMm: Math.max(...distances),
      };
    })
    .sort((a, b) => a.volumeMl - b.volumeMl);
}

function computeGlobalRange(points: CalibrationCapturePoint[]): GlobalDistanceRange | null {
  if (points.length === 0) return null;
  const ds = points.map((p) => p.distanceMm);
  const minDistanceMm = Math.min(...ds);
  const maxDistanceMm = Math.max(...ds);
  return {
    minDistanceMm,
    maxDistanceMm,
    rangeMm: maxDistanceMm - minDistanceMm,
  };
}

/** Promedios por volumen ordenados; tendencia estrictamente creciente o decreciente en avgDistanceMm. */
function inferVolumeDistanceRelation(rows: VolumeCalibrationSummary[]): VolumeDistanceRelation {
  if (rows.length < 2) return 'indeterminate';
  const sorted = [...rows].sort((a, b) => a.volumeMl - b.volumeMl);
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    diffs.push(sorted[i].avgDistanceMm - sorted[i - 1].avgDistanceMm);
  }
  const allPositive = diffs.every((d) => d > 0);
  const allNegative = diffs.every((d) => d < 0);
  if (allPositive) return 'direct';
  if (allNegative) return 'inverse';
  return 'indeterminate';
}

function relationLabel(r: VolumeDistanceRelation): string {
  switch (r) {
    case 'direct':
      return 'Directa';
    case 'inverse':
      return 'Inversa';
    default:
      return 'Indeterminada';
  }
}

function relationHint(r: VolumeDistanceRelation): string {
  switch (r) {
    case 'direct':
      return 'A mayor volumen marcado, la distancia media sube de forma consistente entre niveles.';
    case 'inverse':
      return 'A mayor volumen marcado, la distancia media baja de forma consistente entre niveles.';
    default:
      return 'Hace falta al menos dos niveles de volumen distintos, o los promedios no siguen una tendencia clara.';
  }
}

function hapticLight() {
  if (Platform.OS === 'ios') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function SensorCalibrationScreen() {
  const router = useRouter();
  const [volumeInput, setVolumeInput] = useState('');
  const [points, setPoints] = useState<CalibrationCapturePoint[]>([]);

  const {
    status,
    mode,
    lastReading,
    lastRawMessage,
    messageCount,
    messagesPerSecond,
    errorMessage,
    closeCode,
    closeReason,
    url,
    setUrl,
    connect,
    disconnect,
    startMock,
    stopMock,
  } = useEsp32WebSocketSensor();

  const volumeMl = useMemo(() => parseVolumeMlInput(volumeInput), [volumeInput]);

  const distanceMm = lastReading?.distanceMm;
  const distanceValid = lastReading?.distanceValid === true;
  const distanceIsFinite = typeof distanceMm === 'number' && Number.isFinite(distanceMm);

  const canRegister =
    distanceValid &&
    distanceIsFinite &&
    volumeMl !== null &&
    (status === 'connected' || status === 'receiving' || mode === 'mock');

  const registerBlockReason = useMemo(() => {
    if (volumeMl === null && volumeInput.trim() !== '') return 'Volumen no válido (usa un número ≥ 0).';
    if (volumeMl === null) return 'Indica un volumen en mL.';
    if (!distanceValid) return 'No hay señal válida del sensor';
    if (!distanceIsFinite) return 'No hay señal válida del sensor';
    if (!(status === 'connected' || status === 'receiving' || mode === 'mock')) {
      return 'Conecta el sensor o usa modo demostración.';
    }
    return null;
  }, [distanceIsFinite, distanceValid, mode, status, volumeInput, volumeMl]);

  const volumeSummaries = useMemo(() => computeVolumeSummaries(points), [points]);
  const globalRange = useMemo(() => computeGlobalRange(points), [points]);
  const relation = useMemo(() => inferVolumeDistanceRelation(volumeSummaries), [volumeSummaries]);

  const onRegister = useCallback(() => {
    if (!canRegister || volumeMl === null || !lastReading) return;
    hapticLight();
    const distance = lastReading.distanceMm as number;
    const raw = lastReading.rawDistanceMm ?? distance;
    const source = String(lastReading.source ?? mode);
    const ts = lastReading.timestamp;
    setPoints((prev) => {
      const sameVol = prev.filter((p) => p.volumeMl === volumeMl).length;
      const next: CalibrationCapturePoint = {
        id: newCaptureId(),
        volumeMl,
        distanceMm: distance,
        rawDistanceMm: Number.isFinite(raw) ? raw : distance,
        distanceValid: true,
        source,
        timestamp: ts,
        repetitionNumber: sameVol + 1,
        createdAt: Date.now(),
      };
      return [...prev, next];
    });
  }, [canRegister, lastReading, mode, volumeMl]);

  const onDeletePoint = useCallback((id: string) => {
    hapticLight();
    setPoints((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const onResetCalibration = useCallback(() => {
    hapticLight();
    setPoints([]);
  }, []);

  const isConnecting = status === 'connecting';
  const modeLabel = mode === 'mock' ? 'simulado' : 'real';
  const signalOk = distanceValid && distanceIsFinite;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/sensor-connection" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Calibración local</Text>
        <Text style={styles.screenSubtitle}>ESP32 · VL53L0X · solo en este dispositivo</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroStatusCol}>
              <Text style={styles.heroEyebrow}>Estado</Text>
              <View style={styles.heroStatusRow}>
                {isConnecting ? (
                  <ActivityIndicator size="small" color={wellness.primaryDark} />
                ) : (
                  <View
                    style={[
                      styles.statusDot,
                      signalOk && (status === 'connected' || status === 'receiving' || mode === 'mock')
                        ? styles.statusDotOk
                        : styles.statusDotMuted,
                    ]}
                  />
                )}
                <Text style={styles.heroStatusText}>{statusLabel(status)}</Text>
              </View>
            </View>
            <View style={styles.heroMetricsCol}>
              <Text style={styles.heroEyebrow}>Puntos</Text>
              <Text style={styles.heroBigNumber}>{points.length}</Text>
            </View>
          </View>
          <View style={styles.pillRow}>
            <View style={[styles.pill, signalOk ? styles.pillOk : styles.pillWarn]}>
              <Text style={styles.pillText}>{signalOk ? 'Señal válida' : 'Señal no válida'}</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillTextMuted}>Modo {modeLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>Calibración experimental, no validada clínicamente</Text>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            La medición física con espirómetro real queda pendiente. Esta herramienta solo prepara el registro.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Telemetría en vivo</Text>
          <View style={styles.kvGrid}>
            <Metric label="status" value={statusLabel(status)} />
            <Metric label="url" value={url || '—'} emphasize />
            <Metric label="source" value={formatScalar(lastReading?.source)} />
            <Metric label="distanceMm" value={formatScalar(distanceMm)} />
            <Metric label="rawDistanceMm" value={formatScalar(lastReading?.rawDistanceMm)} />
            <Metric label="distanceValid" value={formatScalar(lastReading?.distanceValid)} />
            <Metric label="timestamp" value={formatScalar(lastReading?.timestamp)} />
            <Metric label="messages" value={formatScalar(messageCount)} />
            <Metric label="mps" value={formatScalar(messagesPerSecond)} />
            <Metric label="lastRawMessage" value={truncateRaw(lastRawMessage)} multiline />
            <Metric label="errorMessage" value={errorMessage ?? '—'} emphasize />
            <Metric label="closeCode" value={closeCode === null ? '—' : String(closeCode)} />
            <Metric label="closeReason" value={closeReason ?? '—'} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>WebSocket</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.urlInput}
            placeholder="ws://192.168.4.1:81"
            placeholderTextColor={wellness.textSecondary}
          />
          <View style={styles.rowGap}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                isConnecting && styles.btnDisabled,
                pressed && !isConnecting && styles.primaryBtnPressed,
              ]}
              onPress={() => {
                hapticLight();
                connect();
              }}
              disabled={isConnecting}>
              <Text style={[styles.primaryBtnText, isConnecting && styles.btnTextDisabled]}>Conectar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              onPress={() => {
                hapticLight();
                disconnect();
              }}>
              <Text style={styles.secondaryBtnText}>Desconectar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
              onPress={() => {
                hapticLight();
                startMock();
              }}>
              <Text style={styles.ghostBtnText}>Modo demostración</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
              onPress={() => {
                hapticLight();
                stopMock();
              }}>
              <Text style={styles.ghostBtnText}>Detener demostración</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Volumen del espirómetro (mL)</Text>
          <Text style={styles.cardHint}>Escribe el valor que marca el espirómetro en este instante.</Text>
          <TextInput
            value={volumeInput}
            onChangeText={setVolumeInput}
            keyboardType="decimal-pad"
            style={styles.volumeInput}
            placeholder="Ej. 500"
            placeholderTextColor={wellness.textSecondary}
          />
          <Text style={styles.chipsLabel}>Ejemplos</Text>
          <View style={styles.chipsRow}>
            {EXAMPLE_VOLUMES_ML.map((v) => (
              <Pressable
                key={v}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                onPress={() => {
                  hapticLight();
                  setVolumeInput(String(v));
                }}>
                <Text style={styles.chipText}>{v}</Text>
              </Pressable>
            ))}
          </View>
          {!canRegister && registerBlockReason ? (
            <Text style={styles.blockHint}>{registerBlockReason}</Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              { marginTop: spacing.md },
              !canRegister && styles.btnDisabled,
              pressed && canRegister && styles.primaryBtnPressed,
            ]}
            onPress={onRegister}
            disabled={!canRegister}>
            <Text style={[styles.primaryBtnText, !canRegister && styles.btnTextDisabled]}>Registrar punto</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Puntos capturados</Text>
            {points.length > 0 ? (
              <Pressable
                onPress={onResetCalibration}
                style={({ pressed }) => [styles.textBtn, pressed && styles.textBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Reiniciar calibración local">
                <Text style={styles.textBtnLabel}>Reiniciar</Text>
              </Pressable>
            ) : null}
          </View>
          {points.length === 0 ? (
            <Text style={styles.emptyText}>Aún no hay puntos. Conecta, valida señal y registra.</Text>
          ) : (
            points
              .slice()
              .reverse()
              .map((p) => (
                <View key={p.id} style={styles.pointRow}>
                  <View style={styles.pointMain}>
                    <Text style={styles.pointVol}>{p.volumeMl} mL</Text>
                    <Text style={styles.pointMeta}>
                      #{p.repetitionNumber} · {p.distanceMm.toFixed(1)} mm · {p.source}
                    </Text>
                    <Text style={styles.pointMetaMuted}>id {p.id.slice(0, 8)}…</Text>
                  </View>
                  <Pressable
                    onPress={() => onDeletePoint(p.id)}
                    style={({ pressed }) => [styles.iconDelete, pressed && styles.iconDeletePressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar punto">
                    <Text style={styles.iconDeleteText}>✕</Text>
                  </Pressable>
                </View>
              ))
          )}
        </View>

        {volumeSummaries.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumen por volumen</Text>
            <Text style={styles.cardHint}>
              Promedios calculados como media aritmética de distanceMm y rawDistanceMm por cada volumen marcado.
            </Text>
            {volumeSummaries.map((row) => (
              <View key={row.volumeMl} style={styles.summaryBlock}>
                <Text style={styles.summaryVol}>{row.volumeMl} mL</Text>
                <Text style={styles.summaryLine}>Repeticiones: {row.repetitions}</Text>
                <Text style={styles.summaryLine}>
                  Prom. distance: {row.avgDistanceMm.toFixed(1)} mm · Prom. raw: {row.avgRawDistanceMm.toFixed(1)} mm
                </Text>
                <Text style={styles.summaryLine}>
                  Min / max distance: {row.minDistanceMm.toFixed(1)} · {row.maxDistanceMm.toFixed(1)} mm
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {globalRange ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rango útil global (distanceMm)</Text>
            <Text style={styles.summaryLine}>Mínimo: {globalRange.minDistanceMm.toFixed(1)} mm</Text>
            <Text style={styles.summaryLine}>Máximo: {globalRange.maxDistanceMm.toFixed(1)} mm</Text>
            <Text style={styles.summaryLine}>Rango: {globalRange.rangeMm.toFixed(1)} mm</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Relación volumen → distancia</Text>
          <Text style={styles.relationValue}>{relationLabel(relation)}</Text>
          <Text style={styles.relationHint}>{relationHint(relation)}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.linkBack, pressed && styles.linkBackPressed]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver a conexión del sensor">
          <Text style={styles.linkBackText}>Volver a conexión del sensor</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  label,
  value,
  emphasize,
  multiline,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[styles.metricValue, emphasize && styles.metricValueEmph]}
        numberOfLines={multiline ? 4 : 2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: wellness.screenBg },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: wellness.text,
    letterSpacing: -0.4,
    marginBottom: spacing.xs,
  },
  screenSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: wellness.textSecondary,
    marginBottom: spacing.lg,
  },
  heroCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.border,
    ...wellnessShadows.card,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroStatusCol: { flex: 1 },
  heroMetricsCol: { alignItems: 'flex-end' },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  heroStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotOk: { backgroundColor: wellness.primary },
  statusDotMuted: { backgroundColor: wellness.textSecondary },
  heroStatusText: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  heroBigNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: wellness.primaryDark,
    letterSpacing: -1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  pillOk: {
    backgroundColor: wellness.successBg,
    borderColor: wellness.border,
  },
  pillWarn: {
    backgroundColor: wellness.errorBg,
    borderColor: wellness.borderStrong,
  },
  pillText: { fontSize: 13, fontWeight: '700', color: wellness.primaryDark },
  pillTextMuted: { fontSize: 13, fontWeight: '600', color: wellness.textSecondary },
  alertCard: {
    backgroundColor: wellness.errorBg,
    borderRadius: wellnessRadii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: wellness.errorText,
    lineHeight: 21,
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  noteText: {
    fontSize: 14,
    fontWeight: '600',
    color: wellness.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.border,
    ...wellnessShadows.cardPress,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  cardHint: {
    fontSize: 13,
    color: wellness.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  kvGrid: { gap: spacing.sm },
  metric: {
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: wellness.border,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: wellness.text,
  },
  metricValueEmph: { color: wellness.errorText },
  urlInput: {
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    backgroundColor: wellness.screenBg,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: wellness.text,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  rowGap: { gap: spacing.sm },
  primaryBtn: {
    backgroundColor: wellness.primary,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    ...wellnessShadows.cardPress,
  },
  primaryBtnPressed: { opacity: 0.92 },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: wellness.primaryDark },
  secondaryBtn: {
    backgroundColor: wellness.screenBg,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.borderStrong,
  },
  secondaryBtnPressed: { opacity: 0.92 },
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: wellness.primaryDark },
  ghostBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  ghostBtnPressed: { opacity: 0.85 },
  ghostBtnText: { fontSize: 15, fontWeight: '700', color: wellness.link, textDecorationLine: 'underline' },
  btnDisabled: { opacity: 0.45 },
  btnTextDisabled: { color: wellness.textSecondary },
  volumeInput: {
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    backgroundColor: wellness.screenBg,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: wellness.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  chipsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    marginBottom: spacing.xs,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  chipPressed: { opacity: 0.88 },
  chipText: { fontSize: 15, fontWeight: '700', color: wellness.primaryDark },
  blockHint: {
    fontSize: 14,
    fontWeight: '600',
    color: wellness.errorText,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  textBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  textBtnPressed: { opacity: 0.75 },
  textBtnLabel: { fontSize: 15, fontWeight: '800', color: wellness.link },
  emptyText: {
    fontSize: 15,
    color: wellness.textSecondary,
    lineHeight: 22,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: wellness.border,
  },
  pointMain: { flex: 1 },
  pointVol: { fontSize: 18, fontWeight: '800', color: wellness.text },
  pointMeta: { fontSize: 14, fontWeight: '600', color: wellness.textSecondary, marginTop: 2 },
  pointMetaMuted: { fontSize: 12, color: wellness.textSecondary, marginTop: 2 },
  iconDelete: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: wellness.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  iconDeletePressed: { opacity: 0.85 },
  iconDeleteText: { fontSize: 16, fontWeight: '700', color: wellness.errorText },
  summaryBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: wellness.border,
  },
  summaryVol: { fontSize: 17, fontWeight: '800', color: wellness.primaryDark, marginBottom: spacing.xs },
  summaryLine: { fontSize: 14, fontWeight: '600', color: wellness.text, lineHeight: 20 },
  relationValue: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.primaryDark,
    marginBottom: spacing.sm,
  },
  relationHint: { fontSize: 14, fontWeight: '600', color: wellness.textSecondary, lineHeight: 20 },
  linkBack: { paddingVertical: spacing.lg, alignItems: 'center' },
  linkBackPressed: { opacity: 0.8 },
  linkBackText: { fontSize: 16, fontWeight: '700', color: wellness.link, textDecorationLine: 'underline' },
});
