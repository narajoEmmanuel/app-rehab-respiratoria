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

import { useEsp32WebSocketSensor } from '@/src/modules/device/adapters/use-esp32-websocket-sensor';
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
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellness,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

const EXAMPLE_VOLUMES_ML = [0, 500, 1000, 1500, 2000] as const;

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
    resetConnection,
    startMock,
    stopMock,
  } = useEsp32WebSocketSensor();

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
    if (!inLiveMode) return 'Conecta el sensor o usa modo demostración.';
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
    (id: string) => {
      hapticLight();
      setPoints((prev) => prev.filter((p) => p.id !== id));
      markDirty();
    },
    [markDirty],
  );

  const onResetCalibration = useCallback(() => {
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
    const ok = await confirmAction(
      'Borrar calibración guardada',
      'Se eliminará el perfil de calibración guardado en este dispositivo. Los puntos actuales en pantalla no se borran.',
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
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              onPress={onResetConnection}
              accessibilityRole="button"
              accessibilityLabel="Limpiar conexión y volver a idle">
              <Text style={styles.secondaryBtnText}>Limpiar conexión</Text>
            </Pressable>
            {status === 'connecting' ? (
              <Text style={styles.connectingHint}>
                Esperando handshake del ESP32… si no responde en unos segundos, usa “Limpiar conexión”.
              </Text>
            ) : null}
            {status === 'error' && errorMessage ? (
              <Text style={styles.errorHint}>{errorMessage}</Text>
            ) : null}
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
          <Text style={styles.cardTitle}>Estabilidad de señal</Text>
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
                Lecturas en buffer: {bufferStats.sampleCount} (máx {BUFFER_MAX_SAMPLES} · ventana{' '}
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
            <Text style={styles.emptyText}>
              Aún no hay lecturas válidas en el buffer. Conecta o usa modo demostración.
            </Text>
          )}
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
            <Text style={styles.cardTitle}>Puntos capturados</Text>
            {points.length > 0 ? (
              <Pressable
                onPress={onResetCalibration}
                style={({ pressed }) => [styles.textBtn, pressed && styles.textBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Vaciar puntos de la pantalla">
                <Text style={styles.textBtnLabel}>Reiniciar</Text>
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
                    <Text style={styles.pointMetaMuted}>
                      n={p.sampleCount} · ±{p.stdDistanceMm.toFixed(2)} mm · rango{' '}
                      {(p.maxSampleDistanceMm - p.minSampleDistanceMm).toFixed(1)} mm
                    </Text>
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

        {globalRange.rangeMm !== null ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rango útil global (distanceMm)</Text>
            <Text style={styles.summaryLine}>
              Mínimo: {(globalRange.minDistanceMm ?? 0).toFixed(1)} mm
            </Text>
            <Text style={styles.summaryLine}>
              Máximo: {(globalRange.maxDistanceMm ?? 0).toFixed(1)} mm
            </Text>
            <Text style={styles.summaryLine}>Rango: {globalRange.rangeMm.toFixed(1)} mm</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Relación volumen → distancia</Text>
          <Text style={styles.relationValue}>{relationLabel(relation)}</Text>
          <Text style={styles.relationHint}>{relationHint(relation)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Persistencia local</Text>
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
