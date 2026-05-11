import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { isSensorDebugEnabled } from '@/src/modules/app-mode';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import {
  buildCalibrationProfile,
  clearCalibrationProfile,
  computeGlobalDistanceRange,
  computeVolumeSummaries,
  determineVolumeDistanceRelation,
  loadCalibrationProfileDetailed,
  saveCalibrationProfile,
  type CalibrationCapturePoint,
  type CalibrationProfile,
  type GlobalDistanceRange,
  type LoadCalibrationResult,
  type VolumeCalibrationSummary,
  type VolumeDistanceRelation,
} from '@/src/modules/device/calibration';
import type { SensorConnectionStatus } from '@/src/modules/device/types/sensor-reading';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellness,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

const EXAMPLE_VOLUMES_ML = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000] as const;

const BUFFER_MAX_SAMPLES = 20;
const BUFFER_WINDOW_MS = 2000;
const MIN_SAMPLES_TO_REGISTER = 5;
/** A partir de esta desviación estándar marcamos la señal como variable y avisamos. */
const STABILITY_VARIABLE_STD_MM = 5;
/** Por debajo de esto consideramos la señal estable visualmente. */
const STABILITY_STABLE_STD_MM = 2.5;

export type ValidSample = {
  distanceMm: number;
  rawDistanceMm: number;
  timestamp: number;
  source: string;
  receivedAt: number;
};

export type BufferStats = {
  sampleCount: number;
  avgDistanceMm: number;
  avgRawDistanceMm: number;
  minDistanceMm: number;
  maxDistanceMm: number;
  stdDistanceMm: number;
  latestSource: string;
  latestTimestamp: number;
};

export type SignalStability = 'insufficient' | 'stable' | 'acceptable' | 'variable';

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

function parseVolumeMlInput(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function computeBufferStats(buf: ValidSample[]): BufferStats | null {
  const n = buf.length;
  if (n === 0) return null;
  const ds = buf.map((s) => s.distanceMm);
  const rs = buf.map((s) => s.rawDistanceMm);
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const avgDistanceMm = sum(ds) / n;
  const avgRawDistanceMm = sum(rs) / n;
  let stdDistanceMm = 0;
  if (n >= 2) {
    const variance = ds.reduce((acc, v) => acc + (v - avgDistanceMm) * (v - avgDistanceMm), 0) / n;
    stdDistanceMm = Math.sqrt(variance);
  }
  const last = buf[n - 1];
  return {
    sampleCount: n,
    avgDistanceMm,
    avgRawDistanceMm,
    minDistanceMm: Math.min(...ds),
    maxDistanceMm: Math.max(...ds),
    stdDistanceMm,
    latestSource: last.source,
    latestTimestamp: last.timestamp,
  };
}

function classifyStability(stats: BufferStats | null): SignalStability {
  if (!stats || stats.sampleCount < MIN_SAMPLES_TO_REGISTER) return 'insufficient';
  if (stats.stdDistanceMm <= STABILITY_STABLE_STD_MM) return 'stable';
  if (stats.stdDistanceMm <= STABILITY_VARIABLE_STD_MM) return 'acceptable';
  return 'variable';
}

function stabilityLabel(s: SignalStability): string {
  switch (s) {
    case 'stable':
      return 'Estable';
    case 'acceptable':
      return 'Aceptable';
    case 'variable':
      return 'Variable';
    default:
      return 'Esperando muestras';
  }
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

/** Confirmación que funciona en native (Alert.alert) y en web (window.confirm). */
function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok =
      typeof globalThis.confirm === 'function' ? globalThis.confirm(`${title}\n\n${message}`) : true;
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Borrar', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

async function confirmActionDouble(title: string, firstMessage: string, secondMessage: string): Promise<boolean> {
  const first = await confirmAction(title, firstMessage);
  if (!first) return false;
  return confirmAction(title, secondMessage);
}

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

type SavedStatus =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'saved'; updatedAt: number; pointsCount: number }
  | { kind: 'unsaved' }
  | { kind: 'corrupt'; errorMessage: string };

export function SensorCalibrationScreen() {
  const router = useRouter();
  const [volumeInput, setVolumeInput] = useState('');
  const [points, setPoints] = useState<CalibrationCapturePoint[]>([]);
  const [buffer, setBuffer] = useState<ValidSample[]>([]);
  const [savedProfile, setSavedProfile] = useState<CalibrationProfile | null>(null);
  const [savedStatus, setSavedStatus] = useState<SavedStatus>({ kind: 'loading' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [storageBusy, setStorageBusy] = useState<'idle' | 'saving' | 'loading' | 'clearing'>(
    'idle',
  );
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const debug = isSensorDebugEnabled();

  const {
    status,
    mode,
    lastReading,
    errorMessage,
    url,
    connect,
    disconnect,
    resetConnection,
    startMock,
    stopMock,
  } = useSensorConnection();

  const volumeMl = useMemo(() => parseVolumeMlInput(volumeInput), [volumeInput]);

  const distanceMm = lastReading?.distanceMm;
  const distanceValid = lastReading?.distanceValid === true;
  const distanceIsFinite = typeof distanceMm === 'number' && Number.isFinite(distanceMm);
  const liveSignalOk = distanceValid && distanceIsFinite;

  useEffect(() => {
    if (!lastReading) return;
    if (lastReading.distanceValid !== true) return;
    const dm = lastReading.distanceMm;
    if (typeof dm !== 'number' || !Number.isFinite(dm)) return;
    const rawCandidate = lastReading.rawDistanceMm;
    const sample: ValidSample = {
      distanceMm: dm,
      rawDistanceMm:
        typeof rawCandidate === 'number' && Number.isFinite(rawCandidate) ? rawCandidate : dm,
      timestamp: lastReading.timestamp,
      source: String(lastReading.source ?? mode),
      receivedAt: Date.now(),
    };
    setBuffer((prev) => {
      const now = sample.receivedAt;
      const merged = [...prev, sample].filter((s) => now - s.receivedAt <= BUFFER_WINDOW_MS);
      return merged.length > BUFFER_MAX_SAMPLES
        ? merged.slice(merged.length - BUFFER_MAX_SAMPLES)
        : merged;
    });
  }, [lastReading, mode]);

  useEffect(() => {
    if (status === 'idle' || status === 'disconnected' || status === 'error') {
      setBuffer([]);
    }
  }, [status]);

  const bufferStats = useMemo(() => computeBufferStats(buffer), [buffer]);
  const stability = useMemo(() => classifyStability(bufferStats), [bufferStats]);
  const isVariableSignal = stability === 'variable';
  const hasEnoughSamples =
    bufferStats !== null && bufferStats.sampleCount >= MIN_SAMPLES_TO_REGISTER;
  const inLiveMode = status === 'connected' || status === 'receiving' || mode === 'mock';

  const canRegister =
    inLiveMode && volumeMl !== null && liveSignalOk && hasEnoughSamples && bufferStats !== null;

  const registerBlockReason = useMemo(() => {
    if (volumeMl === null && volumeInput.trim() !== '') return 'Volumen no válido (usa un número ≥ 0).';
    if (volumeMl === null) return 'Indica un volumen en mL.';
    if (!inLiveMode) return 'Conecta el sensor para comenzar.';
    if (!liveSignalOk) return 'No hay señal válida del sensor';
    if (!hasEnoughSamples) return 'Espera señal estable antes de registrar';
    return null;
  }, [hasEnoughSamples, inLiveMode, liveSignalOk, volumeInput, volumeMl]);

  const volumeSummaries = useMemo<VolumeCalibrationSummary[]>(
    () => computeVolumeSummaries(points),
    [points],
  );
  const globalRange = useMemo<GlobalDistanceRange>(
    () => computeGlobalDistanceRange(points),
    [points],
  );
  const relation = useMemo<VolumeDistanceRelation>(
    () => determineVolumeDistanceRelation(volumeSummaries),
    [volumeSummaries],
  );
  const groupedPoints = useMemo(() => {
    const grouped = new Map<number, CalibrationCapturePoint[]>();
    for (const p of points) {
      if (!grouped.has(p.volumeMl)) grouped.set(p.volumeMl, []);
      grouped.get(p.volumeMl)?.push(p);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([volume, items]) => ({
        volume,
        items: [...items].sort((a, b) => a.repetitionNumber - b.repetitionNumber),
      }));
  }, [points]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result: LoadCalibrationResult = await loadCalibrationProfileDetailed();
      if (cancelled) return;
      if (result.kind === 'ok') {
        setSavedProfile(result.profile);
        setPoints(result.profile.points);
        setHasUnsavedChanges(false);
        setSavedStatus({
          kind: 'saved',
          updatedAt: result.profile.updatedAt,
          pointsCount: result.profile.points.length,
        });
      } else if (result.kind === 'empty') {
        setSavedProfile(null);
        setSavedStatus({ kind: 'none' });
      } else {
        setSavedProfile(null);
        setSavedStatus({ kind: 'corrupt', errorMessage: result.errorMessage });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setStorageMessage(null);
  }, []);

  const onRegister = useCallback(() => {
    if (!canRegister || volumeMl === null || !bufferStats) return;
    hapticLight();
    setPoints((prev) => {
      const sameVol = prev.filter((p) => p.volumeMl === volumeMl).length;
      const next: CalibrationCapturePoint = {
        id: newCaptureId(),
        volumeMl,
        distanceMm: bufferStats.avgDistanceMm,
        rawDistanceMm: bufferStats.avgRawDistanceMm,
        distanceValid: true,
        source: bufferStats.latestSource,
        timestamp: bufferStats.latestTimestamp,
        repetitionNumber: sameVol + 1,
        createdAt: Date.now(),
        sampleCount: bufferStats.sampleCount,
        minSampleDistanceMm: bufferStats.minDistanceMm,
        maxSampleDistanceMm: bufferStats.maxDistanceMm,
        stdDistanceMm: bufferStats.stdDistanceMm,
      };
      return [...prev, next];
    });
    markDirty();
  }, [bufferStats, canRegister, markDirty, volumeMl]);

  const onDeletePoint = useCallback(
    async (id: string) => {
      const target = points.find((p) => p.id === id);
      const targetLabel = target ? `${target.volumeMl} mL · rep ${target.repetitionNumber}` : 'este punto';
      const ok = await confirmActionDouble(
        'Borrar punto',
        `Se eliminará ${targetLabel} de la calibración local en pantalla.`,
        'Confirma nuevamente para borrar este punto.',
      );
      if (!ok) return;
      hapticLight();
      setPoints((prev) => prev.filter((p) => p.id !== id));
      markDirty();
    },
    [markDirty, points],
  );

  const onResetCalibration = useCallback(async () => {
    const ok = await confirmActionDouble(
      'Reiniciar calibración local',
      'Se vaciarán todos los puntos de la pantalla.',
      'Confirma nuevamente para reiniciar la calibración local en pantalla.',
    );
    if (!ok) return;
    hapticLight();
    setPoints([]);
    markDirty();
  }, [markDirty]);

  const onResetConnection = useCallback(() => {
    hapticLight();
    setBuffer([]);
    resetConnection();
  }, [resetConnection]);

  const onSaveCalibration = useCallback(async () => {
    if (storageBusy !== 'idle') return;
    hapticLight();
    setStorageBusy('saving');
    setStorageMessage(null);
    try {
      const profile = buildCalibrationProfile(points, { previous: savedProfile });
      await saveCalibrationProfile(profile);
      setSavedProfile(profile);
      setHasUnsavedChanges(false);
      setSavedStatus({
        kind: 'saved',
        updatedAt: profile.updatedAt,
        pointsCount: profile.points.length,
      });
      setStorageMessage('Calibración guardada localmente.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar.';
      setStorageMessage(message);
    } finally {
      setStorageBusy('idle');
    }
  }, [points, savedProfile, storageBusy]);

  const onLoadCalibration = useCallback(async () => {
    if (storageBusy !== 'idle') return;
    hapticLight();
    setStorageBusy('loading');
    setStorageMessage(null);
    const result = await loadCalibrationProfileDetailed();
    if (result.kind === 'ok') {
      setSavedProfile(result.profile);
      setPoints(result.profile.points);
      setHasUnsavedChanges(false);
      setSavedStatus({
        kind: 'saved',
        updatedAt: result.profile.updatedAt,
        pointsCount: result.profile.points.length,
      });
      setStorageMessage('Calibración cargada desde almacenamiento local.');
    } else if (result.kind === 'empty') {
      setSavedProfile(null);
      setSavedStatus({ kind: 'none' });
      setStorageMessage('No hay calibración guardada todavía.');
    } else {
      setSavedProfile(null);
      setSavedStatus({ kind: 'corrupt', errorMessage: result.errorMessage });
      setStorageMessage(`Calibración guardada corrupta: ${result.errorMessage}`);
    }
    setStorageBusy('idle');
  }, [storageBusy]);

  const onClearStorage = useCallback(async () => {
    if (storageBusy !== 'idle') return;
    const ok = await confirmActionDouble(
      'Borrar calibración guardada',
      'Se eliminará el perfil de calibración guardado en este dispositivo. Los puntos actuales en pantalla no se borran.',
      'Confirma nuevamente para borrar la calibración guardada del dispositivo.',
    );
    if (!ok) return;
    hapticLight();
    setStorageBusy('clearing');
    setStorageMessage(null);
    try {
      await clearCalibrationProfile();
      setSavedProfile(null);
      setSavedStatus({ kind: 'none' });
      setHasUnsavedChanges(points.length > 0);
      setStorageMessage('Calibración guardada eliminada.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al borrar.';
      setStorageMessage(message);
    } finally {
      setStorageBusy('idle');
    }
  }, [points.length, storageBusy]);

  const effectiveSavedStatus: SavedStatus = useMemo(() => {
    if (savedStatus.kind === 'loading' || savedStatus.kind === 'corrupt') return savedStatus;
    if (hasUnsavedChanges) return { kind: 'unsaved' };
    return savedStatus;
  }, [hasUnsavedChanges, savedStatus]);

  const savedStatusLabel = useMemo(() => {
    switch (effectiveSavedStatus.kind) {
      case 'loading':
        return 'Cargando calibración guardada…';
      case 'none':
        return 'Calibración no guardada';
      case 'saved':
        return 'Calibración guardada localmente';
      case 'unsaved':
        return 'Cambios pendientes por guardar';
      case 'corrupt':
        return 'Calibración guardada corrupta';
    }
  }, [effectiveSavedStatus]);

  const canSave = points.length > 0 && hasUnsavedChanges && storageBusy === 'idle';
  const canLoad =
    savedStatus.kind === 'saved' && savedProfile !== null && storageBusy === 'idle';
  const canClearStorage =
    (savedStatus.kind === 'saved' || savedStatus.kind === 'corrupt') && storageBusy === 'idle';

  const isConnecting = status === 'connecting';
  const isOnline = status === 'connected' || status === 'receiving';
  const modeLabel = mode === 'mock' ? 'simulado' : 'real';

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
                      liveSignalOk && inLiveMode ? styles.statusDotOk : styles.statusDotMuted,
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
            <View style={[styles.pill, liveSignalOk ? styles.pillOk : styles.pillWarn]}>
              <Text style={styles.pillText}>{liveSignalOk ? 'Señal válida' : 'Señal no válida'}</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillTextMuted}>Modo {modeLabel}</Text>
            </View>
            <View
              style={[
                styles.pill,
                stability === 'stable'
                  ? styles.pillOk
                  : stability === 'variable'
                    ? styles.pillWarn
                    : null,
              ]}>
              <Text
                style={
                  stability === 'stable' || stability === 'variable'
                    ? styles.pillText
                    : styles.pillTextMuted
                }>
                {stabilityLabel(stability)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.calibrationPurposeCard}>
          <View style={styles.calibrationPurposeHeader}>
            <View style={styles.calibrationPurposeIcon}>
              <IconSymbol name="checkmark.circle.fill" size={22} color={wellness.primaryDark} />
            </View>
            <View style={styles.calibrationPurposeTextCol}>
              <Text style={styles.calibrationPurposeTitle}>Calibración clave para tu terapia</Text>
              <Text style={styles.calibrationPurposeSubtitle}>
                Esta calibración alinea sensor y espirómetro para mejorar la estimación de volumen y la calidad del
                entrenamiento respiratorio.
              </Text>
            </View>
          </View>
          <View style={styles.purposePillRow}>
            <View style={styles.purposePill}>
              <Text style={styles.purposePillText}>Juego más estable</Text>
            </View>
            <View style={styles.purposePill}>
              <Text style={styles.purposePillText}>Lectura más confiable</Text>
            </View>
            <View style={styles.purposePill}>
              <Text style={styles.purposePillText}>Proceso experimental</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.telemetryHeader}>
            <View style={styles.telemetryHeaderIcon}>
              <IconSymbol name="dot.radiowaves.left.and.right" size={16} color={wellness.primaryDark} />
            </View>
            <Text style={styles.cardTitleStrong}>Lectura en vivo</Text>
          </View>
          <Text style={styles.cardHint}>
            Esta matriz muestra solo métricas útiles para registrar puntos confiables.
          </Text>
          <View style={styles.telemetryGrid}>
            <MetricCell label="Estado" value={statusLabel(status)} />
            <MetricCell label="Distance" value={formatScalar(distanceMm)} unit="mm" />
            <MetricCell label="Raw" value={formatScalar(lastReading?.rawDistanceMm)} unit="mm" />
            <MetricCell label="Señal" value={lastReading?.distanceValid ? 'Válida' : 'Sin validar'} />
            <MetricCell label="Muestras buffer" value={bufferStats ? String(bufferStats.sampleCount) : '0'} />
            <MetricCell label="Variación (std)" value={bufferStats ? bufferStats.stdDistanceMm.toFixed(2) : '—'} unit="mm" />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.telemetryHeader}>
            <View style={styles.telemetryHeaderIcon}>
              <IconSymbol name="gearshape.fill" size={16} color={wellness.primaryDark} />
            </View>
            <Text style={styles.cardTitleStrong}>Conexión del sensor</Text>
          </View>
          <Text style={styles.cardHint}>
            La conexión del sensor se comparte con toda la app. La URL y la conexión principal se gestionan en
            Preparar dispositivo; aquí puedes reconectar o limpiar si hace falta.
          </Text>
          <Text style={styles.sharedUrlReadonly} numberOfLines={1}>
            {url.trim() || '—'}
          </Text>

          {isConnecting ? (
            <View style={styles.connectingRow}>
              <ActivityIndicator size="small" color={wellness.primaryDark} />
              <Text style={styles.connectingHint}>Conectando al ESP32…</Text>
            </View>
          ) : null}

          {!isOnline && !isConnecting ? (
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              onPress={() => {
                hapticLight();
                connect();
              }}
              accessibilityRole="button"
              accessibilityLabel="Conectar sensor">
              <Text style={styles.primaryBtnText}>Conectar sensor</Text>
            </Pressable>
          ) : null}

          {isOnline ? (
            <View style={styles.rowGap}>
              <View style={styles.connectedPill}>
                <Text style={styles.connectedPillText}>Conectado</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
                onPress={onResetConnection}
                accessibilityRole="button"
                accessibilityLabel="Limpiar conexión">
                <Text style={styles.secondaryBtnText}>Limpiar conexión</Text>
              </Pressable>
              <Text style={styles.limpiarExplain}>
                Cierra la conexión actual si la señal se queda detenida, cambia la red o el estado queda atascado.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
                onPress={() => {
                  hapticLight();
                  disconnect();
                }}
                accessibilityRole="button"
                accessibilityLabel="Desconectar sensor">
                <Text style={styles.ghostBtnText}>Desconectar</Text>
              </Pressable>
            </View>
          ) : null}

          {!isOnline && !isConnecting && status === 'error' ? (
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              onPress={onResetConnection}
              accessibilityRole="button"
              accessibilityLabel="Limpiar conexión">
              <Text style={styles.secondaryBtnText}>Limpiar conexión</Text>
            </Pressable>
          ) : null}
          {!isOnline && !isConnecting && status === 'error' ? (
            <Text style={styles.limpiarExplain}>
              Cierra el socket atascado o con error para volver a intentar con un estado limpio.
            </Text>
          ) : null}

          {status === 'error' && errorMessage ? <Text style={styles.errorHint}>{errorMessage}</Text> : null}

          {debug ? (
            <>
              <Pressable
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
                onPress={() => {
                  hapticLight();
                  startMock();
                }}>
                <Text style={styles.ghostBtnText}>Modo demostración (debug)</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
                onPress={() => {
                  hapticLight();
                  stopMock();
                }}>
                <Text style={styles.ghostBtnText}>Detener demostración</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Estabilidad de medición</Text>
          <Text style={styles.cardHint}>
            Se analizan varias lecturas recientes para registrar un punto más confiable.
          </Text>
          {bufferStats ? (
            <>
              <View style={styles.stabilityRow}>
                <View style={styles.stabilityCol}>
                  <Text style={styles.stabilityEyebrow}>Promedio distance</Text>
                  <Text style={styles.stabilityBigNumber}>{bufferStats.avgDistanceMm.toFixed(1)}</Text>
                  <Text style={styles.stabilityUnit}>mm</Text>
                </View>
                <View style={styles.stabilityCol}>
                  <Text style={styles.stabilityEyebrow}>±std</Text>
                  <Text
                    style={[
                      styles.stabilityBigNumber,
                      isVariableSignal ? styles.stabilityBigNumberWarn : null,
                    ]}>
                    {bufferStats.stdDistanceMm.toFixed(2)}
                  </Text>
                  <Text style={styles.stabilityUnit}>mm</Text>
                </View>
              </View>
              <Text style={styles.summaryLine}>
                Promedio raw: {bufferStats.avgRawDistanceMm.toFixed(1)} mm
              </Text>
              <Text style={styles.summaryLine}>
                Min / max: {bufferStats.minDistanceMm.toFixed(1)} · {bufferStats.maxDistanceMm.toFixed(1)} mm
              </Text>
              <Text style={styles.summaryLine}>
                Estado: {stabilityLabel(stability)} · Lecturas: {bufferStats.sampleCount} (máx {BUFFER_MAX_SAMPLES}
                {' · ventana '}
                {(BUFFER_WINDOW_MS / 1000).toFixed(1)} s)
              </Text>
              <View
                style={[
                  styles.stabilityBadge,
                  stability === 'stable'
                    ? styles.stabilityBadgeOk
                    : stability === 'variable'
                      ? styles.stabilityBadgeWarn
                      : styles.stabilityBadgeMuted,
                ]}>
                <Text
                  style={
                    stability === 'insufficient' || stability === 'acceptable'
                      ? styles.stabilityBadgeTextMuted
                      : styles.stabilityBadgeText
                  }>
                  {stabilityLabel(stability)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Sin lecturas disponibles. Conecta el dispositivo para comenzar.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Volumen del espirómetro</Text>
          <Text style={styles.cardSubTitleStrong}>Valor objetivo para registrar el siguiente punto (mL)</Text>
          <TextInput
            value={volumeInput}
            onChangeText={setVolumeInput}
            keyboardType="decimal-pad"
            style={styles.volumeInput}
            placeholder="Ej. 1500"
            placeholderTextColor={wellness.textSecondary}
          />
          <Text style={styles.chipsLabel}>Selección rápida 0–5000 mL</Text>
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
          {canRegister && isVariableSignal ? (
            <Text style={styles.warnHint}>
              La señal está variable, considera repetir la medición.
            </Text>
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
            <Text style={styles.cardTitleStrong}>Puntos capturados</Text>
            {points.length > 0 ? (
              <Pressable
                onPress={onResetCalibration}
                style={({ pressed }) => [styles.textBtn, pressed && styles.textBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Vaciar puntos de la pantalla">
                <Text style={styles.textBtnLabel}>Reiniciar puntos</Text>
              </Pressable>
            ) : null}
          </View>
          {points.length > 0 ? (
            <Text style={styles.cardHint}>
              “Reiniciar” solo vacía la lista en pantalla. No borra la calibración guardada
              localmente; para eso usa “Borrar calibración guardada”.
            </Text>
          ) : null}
          {points.length === 0 ? (
            <Text style={styles.emptyText}>Aún no hay puntos. Conecta, valida señal y registra.</Text>
          ) : (
            groupedPoints.map((group) => (
              <View key={group.volume} style={styles.pointsGroup}>
                <Text style={styles.pointsGroupTitle}>{group.volume} mL</Text>
                {group.items.map((p) => (
                  <View key={p.id} style={styles.pointTableRow}>
                    <View style={styles.pointMain}>
                      <Text style={styles.pointMeta}>
                        Rep #{p.repetitionNumber} · {p.distanceMm.toFixed(1)} mm
                      </Text>
                      <Text style={styles.pointMetaMuted}>
                        n={p.sampleCount} · ±{p.stdDistanceMm.toFixed(2)} · rango{' '}
                        {(p.maxSampleDistanceMm - p.minSampleDistanceMm).toFixed(1)} mm
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => void onDeletePoint(p.id)}
                      style={({ pressed }) => [styles.iconDelete, pressed && styles.iconDeletePressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar punto">
                      <Text style={styles.iconDeleteText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>

        {volumeSummaries.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitleStrong}>Resumen por volumen</Text>
            <Text style={styles.cardHint}>
              Promedios calculados como media aritmética de distanceMm y rawDistanceMm por cada volumen marcado.
            </Text>
            <View style={styles.summaryTableHead}>
              <Text style={styles.summaryHeadCell}>Vol</Text>
              <Text style={styles.summaryHeadCell}>Rep</Text>
              <Text style={styles.summaryHeadCell}>Prom</Text>
              <Text style={styles.summaryHeadCell}>Min-Max</Text>
            </View>
            {volumeSummaries.map((row) => (
              <View key={row.volumeMl} style={styles.summaryTableRow}>
                <Text style={styles.summaryCell}>{row.volumeMl}</Text>
                <Text style={styles.summaryCell}>{row.repetitions}</Text>
                <Text style={styles.summaryCell}>{row.avgDistanceMm.toFixed(1)} mm</Text>
                <Text style={styles.summaryCell}>
                  {row.minDistanceMm.toFixed(1)}-{row.maxDistanceMm.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Resultados de calibración</Text>
          <View style={styles.resultsGrid}>
            <MetricCell label="Relación volumen-distancia" value={relationLabel(relation)} />
            <MetricCell
              label="Rango útil (mm)"
              value={globalRange.rangeMm === null ? '—' : globalRange.rangeMm.toFixed(1)}
            />
            <MetricCell label="Estado" value={savedStatusLabel} />
            <MetricCell label="Puntos registrados" value={String(points.length)} />
          </View>
          {globalRange.rangeMm !== null ? (
            <Text style={styles.summaryLine}>
              Mín: {(globalRange.minDistanceMm ?? 0).toFixed(1)} mm · Máx:{' '}
              {(globalRange.maxDistanceMm ?? 0).toFixed(1)} mm
            </Text>
          ) : null}
          <Text style={styles.relationHint}>{relationHint(relation)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Persistencia local</Text>
          <View
            style={[
              styles.savedBadge,
              effectiveSavedStatus.kind === 'saved'
                ? styles.savedBadgeOk
                : effectiveSavedStatus.kind === 'unsaved'
                  ? styles.savedBadgeWarn
                  : effectiveSavedStatus.kind === 'corrupt'
                    ? styles.savedBadgeError
                    : styles.savedBadgeMuted,
            ]}>
            {storageBusy !== 'idle' ? (
              <ActivityIndicator size="small" color={wellness.primaryDark} />
            ) : null}
            <Text
              style={
                effectiveSavedStatus.kind === 'saved' || effectiveSavedStatus.kind === 'unsaved'
                  ? styles.savedBadgeText
                  : effectiveSavedStatus.kind === 'corrupt'
                    ? styles.savedBadgeTextError
                    : styles.savedBadgeTextMuted
              }>
              {savedStatusLabel}
            </Text>
          </View>

          {effectiveSavedStatus.kind === 'saved' ? (
            <>
              <Text style={styles.summaryLine}>Puntos guardados: {effectiveSavedStatus.pointsCount}</Text>
              <Text style={styles.summaryLine}>
                Última actualización: {formatTimestamp(effectiveSavedStatus.updatedAt)}
              </Text>
            </>
          ) : null}
          {effectiveSavedStatus.kind === 'unsaved' && savedProfile ? (
            <Text style={styles.summaryLine}>
              Último guardado: {formatTimestamp(savedProfile.updatedAt)} ·{' '}
              {savedProfile.points.length} pts
            </Text>
          ) : null}
          {effectiveSavedStatus.kind === 'corrupt' ? (
            <Text style={styles.errorHint}>
              El JSON persistido no se pudo leer. Borra la calibración guardada para limpiarlo.
            </Text>
          ) : null}
          {storageMessage ? <Text style={styles.cardHint}>{storageMessage}</Text> : null}

          <View style={styles.rowGap}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                !canSave && styles.btnDisabled,
                pressed && canSave && styles.primaryBtnPressed,
              ]}
              onPress={() => {
                void onSaveCalibration();
              }}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityLabel="Guardar calibración local">
              <Text style={[styles.primaryBtnText, !canSave && styles.btnTextDisabled]}>
                Guardar calibración local
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                !canLoad && styles.btnDisabled,
                pressed && canLoad && styles.secondaryBtnPressed,
              ]}
              onPress={() => {
                void onLoadCalibration();
              }}
              disabled={!canLoad}
              accessibilityRole="button"
              accessibilityLabel="Cargar calibración guardada">
              <Text style={[styles.secondaryBtnText, !canLoad && styles.btnTextDisabled]}>
                ↻{' '}
                Cargar calibración guardada
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.dangerBtn,
                !canClearStorage && styles.btnDisabled,
                pressed && canClearStorage && styles.dangerBtnPressed,
              ]}
              onPress={() => {
                void onClearStorage();
              }}
              disabled={!canClearStorage}
              accessibilityRole="button"
              accessibilityLabel="Borrar calibración guardada">
              <Text style={[styles.dangerBtnText, !canClearStorage && styles.btnTextDisabled]}>
                Borrar calibración guardada
              </Text>
            </Pressable>
          </View>
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

function MetricCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricCellLabel}>{label}</Text>
      <Text style={styles.metricCellValue} numberOfLines={2}>
        {value}
        {unit ? ` ${unit}` : ''}
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
  calibrationPurposeCard: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.border,
    ...wellnessShadows.card,
  },
  calibrationPurposeHeader: { flexDirection: 'row', gap: spacing.md },
  calibrationPurposeIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: wellness.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: wellness.border,
  },
  calibrationPurposeTextCol: { flex: 1 },
  calibrationPurposeTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: wellness.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  calibrationPurposeSubtitle: {
    fontSize: 14,
    color: wellness.textSecondary,
    lineHeight: 20,
  },
  purposePillRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  purposePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  purposePillText: { fontSize: 12, fontWeight: '700', color: wellness.primaryDark },
  card: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: wellness.border,
    ...wellnessShadows.cardPress,
  },
  cardTitleStrong: {
    fontSize: 20,
    fontWeight: '800',
    color: wellness.text,
    letterSpacing: -0.2,
    marginBottom: spacing.xs,
  },
  cardSubTitleStrong: {
    fontSize: 14,
    color: wellness.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  cardHint: {
    fontSize: 13,
    color: wellness.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  telemetryHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: wellness.successBg,
    borderWidth: 1,
    borderColor: wellness.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCell: {
    width: '48%',
    backgroundColor: wellness.screenBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: wellness.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  metricCellLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metricCellValue: {
    fontSize: 16,
    fontWeight: '800',
    color: wellness.text,
  },
  sharedUrlReadonly: {
    fontSize: 13,
    fontWeight: '600',
    color: wellness.textSecondary,
    marginBottom: spacing.md,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  connectedPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.successBg,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  connectedPillText: { fontSize: 13, fontWeight: '800', color: wellness.primaryDark },
  limpiarExplain: {
    fontSize: 12,
    lineHeight: 17,
    color: wellness.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
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
  warnHint: {
    fontSize: 14,
    fontWeight: '700',
    color: wellness.errorText,
    marginTop: spacing.xs,
  },
  connectingHint: {
    fontSize: 13,
    color: wellness.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  errorHint: {
    fontSize: 13,
    fontWeight: '600',
    color: wellness.errorText,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  stabilityRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  stabilityCol: { flex: 1 },
  stabilityEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stabilityBigNumber: {
    fontSize: 30,
    fontWeight: '800',
    color: wellness.primaryDark,
    letterSpacing: -0.5,
  },
  stabilityBigNumberWarn: { color: wellness.errorText },
  stabilityUnit: { fontSize: 12, fontWeight: '700', color: wellness.textSecondary, marginTop: -2 },
  stabilityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: wellnessRadii.pill,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  stabilityBadgeOk: { backgroundColor: wellness.successBg },
  stabilityBadgeWarn: { backgroundColor: wellness.errorBg, borderColor: wellness.borderStrong },
  stabilityBadgeMuted: { backgroundColor: wellness.screenBg },
  stabilityBadgeText: { fontSize: 13, fontWeight: '800', color: wellness.primaryDark },
  stabilityBadgeTextMuted: { fontSize: 13, fontWeight: '700', color: wellness.textSecondary },
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
  pointMain: { flex: 1 },
  pointMeta: { fontSize: 14, fontWeight: '600', color: wellness.textSecondary, marginTop: 2 },
  pointMetaMuted: { fontSize: 12, color: wellness.textSecondary, marginTop: 2 },
  pointsGroup: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: wellness.border,
    paddingTop: spacing.md,
  },
  pointsGroupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: wellness.primaryDark,
    marginBottom: spacing.xs,
  },
  pointTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: wellness.border,
    gap: spacing.sm,
  },
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
  summaryTableHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: wellness.border,
  },
  summaryTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: wellness.border,
  },
  summaryHeadCell: { width: '25%', fontSize: 12, fontWeight: '700', color: wellness.textSecondary },
  summaryCell: { width: '25%', fontSize: 13, fontWeight: '700', color: wellness.text },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryLine: { fontSize: 14, fontWeight: '600', color: wellness.text, lineHeight: 20 },
  relationHint: { fontSize: 14, fontWeight: '600', color: wellness.textSecondary, lineHeight: 20 },
  linkBack: { paddingVertical: spacing.lg, alignItems: 'center' },
  linkBackPressed: { opacity: 0.8 },
  linkBackText: { fontSize: 16, fontWeight: '700', color: wellness.link, textDecorationLine: 'underline' },
  savedBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.sm,
  },
  savedBadgeOk: { backgroundColor: wellness.successBg },
  savedBadgeWarn: { backgroundColor: wellness.errorBg, borderColor: wellness.borderStrong },
  savedBadgeError: { backgroundColor: wellness.errorBg, borderColor: wellness.borderStrong },
  savedBadgeMuted: { backgroundColor: wellness.screenBg },
  savedBadgeText: { fontSize: 13, fontWeight: '800', color: wellness.primaryDark },
  savedBadgeTextMuted: { fontSize: 13, fontWeight: '700', color: wellness.textSecondary },
  savedBadgeTextError: { fontSize: 13, fontWeight: '800', color: wellness.errorText },
  dangerBtn: {
    backgroundColor: wellness.errorBg,
    borderRadius: wellnessRadii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: wellness.borderStrong,
  },
  dangerBtnPressed: { opacity: 0.9 },
  dangerBtnText: { fontSize: 16, fontWeight: '800', color: wellness.errorText },
});
