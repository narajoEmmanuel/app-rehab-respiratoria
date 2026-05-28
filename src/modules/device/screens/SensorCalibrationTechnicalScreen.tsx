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
  useActiveVolumeEstimate,
  volumeEstimationCardStatusLabel,
} from '@/src/modules/device/volume-estimation';
import {
  activeModelCardStatusLabel,
  buildActiveCalibrationModel,
  buildActiveCalibrationTechnicalSummary,
  clearActiveCalibrationModelForSpirometer,
  isActiveCalibrationModelStale,
  loadActiveCalibrationModelForSpirometer,
  resolveActiveModelCardStatus,
  saveActiveCalibrationModelForSpirometer,
  buildCalibrationProfile,
  createDefaultCalibratedDeviceIdentification,
  mergeCalibratedDeviceIdentification,
  RESPIRA_SYSTEM_COMPONENTS,
  buildLinearCalibrationModel,
  type CalibratedDeviceIdentification,
  buildPiecewiseLinearCalibrationModel,
  CALIBRATION_PROFILE_VERSION,
  clearCalibrationProfileForSpirometer,
  computeCalibrationUncertaintySummary,
  computeGeometricScaleReport,
  computeGlobalDistanceRange,
  computeRepeatabilityReport,
  computeSegmentReport,
  computeRequiredCalibrationCoverage,
  computeVolumeCoverage,
  computeVolumeSummaries,
  determineVolumeDistanceRelation,
  hasSubOperativeVolumes,
  loadCalibrationProfileDetailed,
  MIN_RELIABLE_SENSOR_DISTANCE_MM,
  MIN_REPETITIONS_PER_REQUIRED_VOLUME,
  MIN_REPETITIONS_PER_VOLUME,
  MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY,
  recommendCalibrationModel,
  saveCalibrationProfileForSpirometer,
  UNCERTAINTY_COVERAGE_FACTOR_K,
  type CalibrationCapturePoint,
  type CalibrationLinealQuality,
  type CalibrationModel,
  type CalibrationModelRecommendation,
  type CalibrationModelRecommendationKind,
  type CalibrationModelStatus,
  type CalibrationProfile,
  type CalibrationQuality,
  type CalibrationRecommendationStatus,
  type CalibrationRepeatabilityReport,
  type CalibrationSegmentReport,
  type GlobalDistanceRange,
  type LoadCalibrationResult,
  type VolumeCalibrationSummary,
  type VolumeCoverage,
  type VolumeDistanceRelation,
  type VolumeRepeatability,
  type GeometricScaleReport,
  type GeometricScaleSegmentStatus,
  type CalibrationUncertaintySummary,
  type VolumeUncertaintyReport,
  type VolumeUncertaintyStatus,
  type ActiveCalibrationModel,
  type ActiveCalibrationTechnicalSummary,
} from '@/src/modules/device/calibration';
import {
  buildGeometricSegmentsMl,
  createDefaultSpirometerDevicesIfNeeded,
  getActiveSpirometerContext,
  getExtendedRangeMinVolumeMl,
  getExtendedVolumeChipsMl,
  getRecommendedVolumeChipsMl,
  listSpirometerDevices,
  SPIROMETER_DEVICE_3000ML_ID,
  type SpirometerDevice,
  type SpirometerProfile,
} from '@/src/modules/device/spirometer';
import { exportCalibrationTechnicalCsv } from '@/src/modules/export/services/calibration-technical-export-service';
import type { CalibrationTechnicalExportContext } from '@/src/modules/export/formatters/calibration-technical-export-context';
import type { SensorConnectionStatus } from '@/src/modules/device/types/sensor-reading';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { AppCard } from '@/src/shared/ui/AppCard';
import { InfoTile } from '@/src/shared/ui/InfoTile';
import { MetricTile } from '@/src/shared/ui/MetricTile';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { IconSymbol } from '@/src/shared/ui/icon-symbol';
import { spacing } from '@/src/shared/theme/spacing';
import {
  wellness,
  wellnessColors,
  wellnessRadii,
  wellnessShadows,
} from '@/src/shared/theme/wellness-theme';

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

function modelStatusLabel(status: CalibrationModelStatus): string {
  switch (status) {
    case 'valid':
      return 'Modelo lineal listo';
    case 'insufficient_data':
      return 'Faltan puntos';
    case 'non_monotonic':
      return 'Relación no monotónica';
    case 'invalid_range':
      return 'Rango insuficiente';
    case 'high_error':
      return 'Error elevado, considera repetir';
    default:
      return status;
  }
}

function recommendedKindLabel(kind: CalibrationModelRecommendationKind): string {
  switch (kind) {
    case 'piecewise_linear':
      return 'Por tramos';
    case 'linear_regression':
      return 'Lineal';
    case 'none':
      return 'No disponible';
    default:
      return kind;
  }
}

function recommendationStatusLabel(status: CalibrationRecommendationStatus): string {
  switch (status) {
    case 'ready':
      return 'Listo';
    case 'limited_range':
      return 'Rango limitado';
    case 'needs_more_points':
      return 'Faltan puntos';
    case 'needs_recalibration':
      return 'Repetir calibración';
    case 'invalid':
      return 'Inválido';
    default:
      return status;
  }
}

type PatientCalibrationQuality = 'Alta' | 'Media' | 'Requiere revisión' | 'Pendiente';

/**
 * Patient-facing quality label derived from model metrics.
 * Does not alter calibration logic — purely interpretive.
 */
function derivePatientCalibrationQuality(
  recommendation: CalibrationModelRecommendation | null,
  linearModel: CalibrationModel | null,
  piecewiseModel: CalibrationModel | null,
): PatientCalibrationQuality {
  if (!recommendation) return 'Pendiente';

  const model =
    recommendation.recommendedKind === 'linear_regression'
      ? linearModel
      : (piecewiseModel ?? linearModel);
  if (!model || model.status !== 'valid') return 'Pendiente';

  const { rSquared, maeMl, maxAbsErrorMl } = model.metrics;
  if (rSquared == null || maeMl == null || maxAbsErrorMl == null) return 'Pendiente';

  if (rSquared >= 0.98 && maeMl <= 100 && maxAbsErrorMl <= 250) return 'Alta';
  if (rSquared >= 0.95 && maeMl <= 200 && maxAbsErrorMl <= 500) return 'Media';
  return 'Requiere revisión';
}

function patientQualityTone(q: PatientCalibrationQuality): 'success' | 'neutral' | 'danger' {
  if (q === 'Alta') return 'success';
  if (q === 'Media') return 'neutral';
  if (q === 'Requiere revisión') return 'danger';
  return 'neutral';
}

function recommendationStatusTone(
  status: CalibrationRecommendationStatus,
): 'ok' | 'warn' | 'muted' {
  if (status === 'ready') return 'ok';
  if (status === 'needs_more_points') return 'muted';
  return 'warn';
}

function linealQualityLabel(q: CalibrationLinealQuality): string {
  switch (q) {
    case 'acceptable':
      return 'Aceptable';
    case 'not_recommended':
      return 'No recomendado';
    case 'unavailable':
      return 'No disponible';
    default:
      return q;
  }
}

function linealQualityTone(q: CalibrationLinealQuality): 'ok' | 'warn' | 'muted' {
  if (q === 'acceptable') return 'ok';
  if (q === 'unavailable') return 'muted';
  return 'warn';
}

function calibrationQualityLabel(q: CalibrationQuality): string {
  switch (q) {
    case 'good':
      return 'Buena';
    case 'limited':
      return 'Limitada';
    case 'poor':
      return 'Insuficiente';
    case 'invalid':
      return 'Inválida';
    default:
      return q;
  }
}

function volumeRepeatabilityBadgeLabel(row: VolumeRepeatability): string {
  switch (row.warningLevel) {
    case 'high':
      return 'Repetir';
    case 'moderate':
      return 'Revisar';
    default:
      return 'Estable';
  }
}

function formatUncertaintyMl(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `±${value.toFixed(0)}`;
}

function uncertaintyOverallLabel(
  uncertainty: CalibrationUncertaintySummary['reports'],
  hasAcceptable: boolean,
): 'Aceptable' | 'Revisar' | 'Incompleto' {
  if (uncertainty.length === 0 || uncertainty.every((r) => r.status === 'insufficient_data')) {
    return 'Incompleto';
  }
  return hasAcceptable ? 'Aceptable' : 'Revisar';
}

function volumeUncertaintyStatusLabel(status: VolumeUncertaintyStatus): string {
  switch (status) {
    case 'ok':
      return 'OK';
    case 'limited':
      return 'Limitado';
    case 'insufficient_data':
      return 'Incompleto';
    default:
      return status;
  }
}

function geometricSegmentStatusLabel(status: GeometricScaleSegmentStatus): string {
  switch (status) {
    case 'ok':
      return 'Correcto';
    case 'review':
      return 'Revisar';
    case 'critical':
      return 'Crítico';
    case 'missing':
      return 'Faltante';
    default:
      return status;
  }
}

function formatExpectedDeltaMm(value: number): string {
  if (value > 0) return `+${value.toFixed(0)} mm`;
  if (value < 0) return `${value.toFixed(0)} mm`;
  return `${value.toFixed(0)} mm`;
}

function geometricValidationOverallLabel(
  report: GeometricScaleReport,
): string {
  if (!report.geometricValidationConfigured) return 'No configurada';
  if (report.missingSegments > 0) return 'Incompleto';
  if (report.passesGeometricValidation) return 'Correcto';
  return 'Revisar montaje';
}

function activeModelKindUiLabel(kind: 'linear_regression' | 'piecewise_linear'): string {
  return kind === 'piecewise_linear' ? 'Por tramos' : 'Lineal';
}

async function confirmActivationDouble(
  firstMessage: string,
  secondMessage: string,
): Promise<boolean> {
  const first = await confirmProceed('Activar modelo recomendado', firstMessage, {
    confirmLabel: 'Continuar',
  });
  if (!first) return false;
  return confirmProceed('Activar modelo recomendado', secondMessage, {
    confirmLabel: 'Activar modelo',
  });
}

function formatMetricMl(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(0)} mL`;
}

function formatR2(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toFixed(3);
}

function formatSlope(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

function formatIntercept(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
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

/** Confirmación con botón principal configurable (p. ej. continuar / reemplazar). */
function confirmProceed(
  title: string,
  message: string,
  options?: { confirmLabel?: string },
): Promise<boolean> {
  const okLabel = options?.confirmLabel ?? 'Continuar';
  if (Platform.OS === 'web') {
    const ok =
      typeof globalThis.confirm === 'function' ? globalThis.confirm(`${title}\n\n${message}`) : true;
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: okLabel, onPress: () => resolve(true) },
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

export type SensorCalibrationTechnicalScreenProps = {
  onClose?: () => void;
};

export function SensorCalibrationTechnicalScreen({
  onClose,
}: SensorCalibrationTechnicalScreenProps = {}) {
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
  const [retakeVolumeMl, setRetakeVolumeMl] = useState<number | null>(null);
  const [retakeDraftPoints, setRetakeDraftPoints] = useState<CalibrationCapturePoint[]>([]);
  const [deviceIdentification, setDeviceIdentification] = useState<CalibratedDeviceIdentification>(
    () => createDefaultCalibratedDeviceIdentification(),
  );
  const [activeSpirometerDevice, setActiveSpirometerDevice] = useState<SpirometerDevice | null>(
    null,
  );
  const [activeSpirometerProfile, setActiveSpirometerProfile] = useState<SpirometerProfile | null>(
    null,
  );
  const [spirometerReady, setSpirometerReady] = useState(false);
  const [activeCalibrationModel, setActiveCalibrationModel] =
    useState<ActiveCalibrationModel | null>(null);
  const [showActiveModelSummary, setShowActiveModelSummary] = useState(false);
  const [activeModelBusy, setActiveModelBusy] = useState<'idle' | 'activating' | 'clearing'>(
    'idle',
  );
  const debug = isSensorDebugEnabled();
  const [advancedMetricsExpanded, setAdvancedMetricsExpanded] = useState(false);
  const [advancedStorageExpanded, setAdvancedStorageExpanded] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);

  const isRetakeMode = retakeVolumeMl !== null;

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
  /**
   * Por debajo de `MIN_RELIABLE_SENSOR_DISTANCE_MM` el VL53L0X se vuelve inestable;
   * bloqueamos el registro porque ese punto no aporta calibración confiable.
   */
  const distanceAboveSensorMin =
    distanceIsFinite && (distanceMm as number) >= MIN_RELIABLE_SENSOR_DISTANCE_MM;

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

  const retakeDraftFull =
    isRetakeMode && retakeDraftPoints.length >= MIN_REPETITIONS_PER_REQUIRED_VOLUME;
  const retakeVolumeMismatch =
    isRetakeMode && volumeMl !== null && volumeMl !== retakeVolumeMl;

  const canRegister =
    inLiveMode &&
    volumeMl !== null &&
    liveSignalOk &&
    distanceAboveSensorMin &&
    hasEnoughSamples &&
    bufferStats !== null &&
    !retakeDraftFull &&
    !retakeVolumeMismatch;

  const registerBlockReason = useMemo(() => {
    if (isRetakeMode && retakeDraftFull) {
      return 'Ya tienes 5 mediciones en borrador. Usa «Reemplazar mediciones anteriores» o cancela la repetición.';
    }
    if (retakeVolumeMismatch) {
      return 'Termina o cancela la repetición antes de cambiar de volumen.';
    }
    if (volumeMl === null && volumeInput.trim() !== '') return 'Volumen no válido (usa un número ≥ 0).';
    if (volumeMl === null) return 'Indica un volumen en mL.';
    if (!inLiveMode) return 'Conecta el sensor para comenzar.';
    if (!liveSignalOk) return 'No hay señal válida del sensor';
    if (!distanceAboveSensorMin) {
      return 'La distancia está por debajo del rango confiable del sensor. Reubica el sensor o usa un volumen mayor.';
    }
    if (!hasEnoughSamples) return 'Espera señal estable antes de registrar';
    return null;
  }, [
    distanceAboveSensorMin,
    hasEnoughSamples,
    inLiveMode,
    isRetakeMode,
    liveSignalOk,
    retakeDraftFull,
    retakeVolumeMismatch,
    volumeInput,
    volumeMl,
  ]);

  const operativeMinVolumeMl = activeSpirometerProfile?.operativeMinVolumeMl ?? 250;

  const recommendedVolumeChips = useMemo(
    () =>
      activeSpirometerProfile
        ? getRecommendedVolumeChipsMl(activeSpirometerProfile)
        : [],
    [activeSpirometerProfile],
  );
  const extendedVolumeChips = useMemo(
    () =>
      activeSpirometerProfile ? getExtendedVolumeChipsMl(activeSpirometerProfile) : [],
    [activeSpirometerProfile],
  );
  const requiredVolumesMl = useMemo(
    () => activeSpirometerProfile?.requiredVolumesMl ?? [],
    [activeSpirometerProfile],
  );
  const geometricSegmentCount = useMemo(
    () =>
      activeSpirometerProfile
        ? buildGeometricSegmentsMl(activeSpirometerProfile).length
        : 0,
    [activeSpirometerProfile],
  );

  const isSubOperativeInput = volumeMl !== null && volumeMl < operativeMinVolumeMl;

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

  /**
   * Perfil "en vivo": se construye a partir de los puntos actuales en pantalla (incluye
   * cambios sin guardar). Conserva id/createdAt del perfil persistido cuando existe,
   * para que el modelo derive un calibrationProfileId estable.
   */
  const liveProfile = useMemo<CalibrationProfile | null>(() => {
    if (!activeSpirometerDevice || !activeSpirometerProfile) return null;
    const snapshot = activeSpirometerProfile;
    return {
      id: savedProfile?.id ?? 'live',
      name: savedProfile?.name ?? 'Calibración local',
      createdAt: savedProfile?.createdAt ?? 0,
      updatedAt: savedProfile?.updatedAt ?? 0,
      points,
      summaries: volumeSummaries,
      globalRange,
      relation,
      isExperimental: true,
      source: 'local_calibration',
      notes: savedProfile?.notes,
      version: CALIBRATION_PROFILE_VERSION,
      spirometerDeviceId: activeSpirometerDevice.id,
      spirometerProfileId: snapshot.id,
      spirometerProfileSnapshot: snapshot,
      calibrationRangeMl: {
        min: snapshot.operativeMinVolumeMl,
        max: snapshot.maxVolumeMl,
      },
      requiredVolumesMl: [...snapshot.requiredVolumesMl],
      deviceIdentification,
    };
  }, [
    activeSpirometerDevice,
    activeSpirometerProfile,
    deviceIdentification,
    globalRange,
    points,
    relation,
    savedProfile,
    volumeSummaries,
  ]);
  const linearModel = useMemo<CalibrationModel | null>(
    () => (liveProfile ? buildLinearCalibrationModel(liveProfile) : null),
    [liveProfile],
  );
  const piecewiseModel = useMemo<CalibrationModel | null>(
    () => (liveProfile ? buildPiecewiseLinearCalibrationModel(liveProfile) : null),
    [liveProfile],
  );
  const recommendation = useMemo<CalibrationModelRecommendation | null>(() => {
    if (!liveProfile || !linearModel || !piecewiseModel) return null;
    return recommendCalibrationModel(liveProfile, linearModel, piecewiseModel);
  }, [liveProfile, linearModel, piecewiseModel]);
  const coverage = useMemo<VolumeCoverage | null>(
    () =>
      activeSpirometerProfile
        ? computeVolumeCoverage(volumeSummaries, activeSpirometerProfile)
        : null,
    [activeSpirometerProfile, volumeSummaries],
  );
  const repeatability = useMemo<CalibrationRepeatabilityReport>(
    () =>
      computeRepeatabilityReport(points, volumeSummaries, requiredVolumesMl),
    [points, requiredVolumesMl, volumeSummaries],
  );
  const segmentReport = useMemo<CalibrationSegmentReport>(
    () => computeSegmentReport(volumeSummaries, relation),
    [relation, volumeSummaries],
  );
  const requiredCoverage = useMemo(
    () => computeRequiredCalibrationCoverage(points, volumeSummaries, requiredVolumesMl),
    [points, requiredVolumesMl, volumeSummaries],
  );
  const geometricReport = useMemo(
    () =>
      activeSpirometerProfile
        ? computeGeometricScaleReport(volumeSummaries, relation, activeSpirometerProfile)
        : null,
    [activeSpirometerProfile, relation, volumeSummaries],
  );
  const uncertaintySummary = useMemo<CalibrationUncertaintySummary | null>(
    () => (liveProfile ? computeCalibrationUncertaintySummary(liveProfile) : null),
    [liveProfile],
  );
  const hasLegacySubOperative = useMemo<boolean>(
    () => hasSubOperativeVolumes(volumeSummaries, operativeMinVolumeMl),
    [operativeMinVolumeMl, volumeSummaries],
  );

  const technicalExportContext = useMemo<CalibrationTechnicalExportContext>(
    () => ({
      relation,
      recommendation,
      linearModel,
      piecewiseModel,
      coverage,
      repeatability,
      segmentReport,
      geometricReport,
      requiredCoverage,
      uncertaintySummary,
      activeModel: activeCalibrationModel,
      sensorStatus: status,
      filterLabel: lastReading?.filter ?? null,
    }),
    [
      activeCalibrationModel,
      coverage,
      geometricReport,
      lastReading?.filter,
      linearModel,
      piecewiseModel,
      recommendation,
      relation,
      repeatability,
      requiredCoverage,
      segmentReport,
      status,
      uncertaintySummary,
    ],
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

  const applyLoadCalibrationResult = useCallback((result: LoadCalibrationResult) => {
    if (result.kind === 'ok') {
      setSavedProfile(result.profile);
      setPoints(result.profile.points);
      setDeviceIdentification(
        mergeCalibratedDeviceIdentification(result.profile.deviceIdentification),
      );
      setRetakeVolumeMl(null);
      setRetakeDraftPoints([]);
      setHasUnsavedChanges(false);
      setSavedStatus({
        kind: 'saved',
        updatedAt: result.profile.updatedAt,
        pointsCount: result.profile.points.length,
      });
    } else if (result.kind === 'empty') {
      setSavedProfile(null);
      setPoints([]);
      setDeviceIdentification(createDefaultCalibratedDeviceIdentification());
      setRetakeVolumeMl(null);
      setRetakeDraftPoints([]);
      setHasUnsavedChanges(false);
      setSavedStatus({ kind: 'none' });
    } else {
      setSavedProfile(null);
      setPoints([]);
      setSavedStatus({ kind: 'corrupt', errorMessage: result.errorMessage });
    }
  }, []);

  const loadActiveModelForDevice = useCallback(async (deviceId: string) => {
    const model = await loadActiveCalibrationModelForSpirometer(deviceId);
    setActiveCalibrationModel(model);
    setShowActiveModelSummary(false);
  }, []);

  const loadCalibrationForDevice = useCallback(
    async (deviceId: string) => {
      const result = await loadCalibrationProfileDetailed(deviceId);
      applyLoadCalibrationResult(result);
      await loadActiveModelForDevice(deviceId);
    },
    [applyLoadCalibrationResult, loadActiveModelForDevice],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await createDefaultSpirometerDevicesIfNeeded();
      await listSpirometerDevices();
      const context = await getActiveSpirometerContext();
      if (cancelled) return;
      if (context) {
        setActiveSpirometerDevice(context.device);
        setActiveSpirometerProfile(context.profile);
        await loadCalibrationForDevice(SPIROMETER_DEVICE_3000ML_ID);
      }
      if (!cancelled) setSpirometerReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadCalibrationForDevice]);

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setStorageMessage(null);
  }, []);

  const handleExportCalibrationTechnical = useCallback(async () => {
    const profileForExport = savedProfile
      ? { ...savedProfile, deviceIdentification }
      : liveProfile && points.length > 0
        ? { ...liveProfile, deviceIdentification }
        : null;
    if (!profileForExport) {
      Alert.alert('Exportación', 'Guarda la calibración antes de exportar el archivo técnico.');
      return;
    }
    const result = await exportCalibrationTechnicalCsv({
      profile: { ...profileForExport, deviceIdentification },
      firmwareVersion: lastReading?.firmwareVersion,
      deviceId: lastReading?.deviceId,
      filterLabel: lastReading?.filter ?? null,
      sensorStatus: status,
      technicalContext: technicalExportContext,
    });
    if (!result.ok) {
      Alert.alert('Exportación', result.message);
    }
  }, [
    deviceIdentification,
    lastReading?.deviceId,
    lastReading?.filter,
    lastReading?.firmwareVersion,
    liveProfile,
    points.length,
    savedProfile,
    status,
    technicalExportContext,
  ]);

  const onStartVolumeRetake = useCallback(async (volume: number) => {
    const first = await confirmProceed(
      'Repetir volumen',
      `Se iniciará una nueva toma para ${volume} mL.`,
      { confirmLabel: 'Continuar' },
    );
    if (!first) return;
    const second = await confirmProceed(
      'Repetir volumen',
      'Las mediciones anteriores se reemplazarán solo cuando completes 5 nuevas mediciones válidas.',
      { confirmLabel: 'Entendido' },
    );
    if (!second) return;
    hapticLight();
    setRetakeVolumeMl(volume);
    setRetakeDraftPoints([]);
    setVolumeInput(String(volume));
  }, []);

  const onCancelVolumeRetake = useCallback(async () => {
    if (retakeVolumeMl === null) return;
    const ok = await confirmProceed(
      'Cancelar repetición',
      '¿Descartar las mediciones en borrador y conservar las anteriores?',
      { confirmLabel: 'Sí, descartar' },
    );
    if (!ok) return;
    hapticLight();
    setRetakeVolumeMl(null);
    setRetakeDraftPoints([]);
  }, [retakeVolumeMl]);

  const onConfirmRetakeReplace = useCallback(async () => {
    if (retakeVolumeMl === null || retakeDraftPoints.length !== MIN_REPETITIONS_PER_REQUIRED_VOLUME) {
      return;
    }
    const ok = await confirmProceed(
      'Reemplazar mediciones',
      `¿Reemplazar las mediciones anteriores de ${retakeVolumeMl} mL con estas ${MIN_REPETITIONS_PER_REQUIRED_VOLUME} nuevas mediciones?`,
      { confirmLabel: 'Reemplazar' },
    );
    if (!ok) return;
    hapticLight();
    const vol = retakeVolumeMl;
    setPoints((prev) => {
      const kept = prev.filter((p) => p.volumeMl !== vol);
      return [...kept, ...retakeDraftPoints];
    });
    setRetakeVolumeMl(null);
    setRetakeDraftPoints([]);
    markDirty();
  }, [markDirty, retakeDraftPoints, retakeVolumeMl]);

  const onRegister = useCallback(() => {
    if (!canRegister || volumeMl === null || !bufferStats || isRegistering) return;
    setIsRegistering(true);
    hapticLight();
    if (retakeVolumeMl !== null && volumeMl === retakeVolumeMl) {
      if (retakeDraftPoints.length >= MIN_REPETITIONS_PER_REQUIRED_VOLUME) return;
      setRetakeDraftPoints((prev) => {
        const next: CalibrationCapturePoint = {
          id: newCaptureId(),
          volumeMl,
          distanceMm: bufferStats.avgDistanceMm,
          rawDistanceMm: bufferStats.avgRawDistanceMm,
          distanceValid: true,
          source: bufferStats.latestSource,
          timestamp: bufferStats.latestTimestamp,
          repetitionNumber: prev.length + 1,
          createdAt: Date.now(),
          sampleCount: bufferStats.sampleCount,
          minSampleDistanceMm: bufferStats.minDistanceMm,
          maxSampleDistanceMm: bufferStats.maxDistanceMm,
          stdDistanceMm: bufferStats.stdDistanceMm,
        };
        return [...prev, next];
      });
      setTimeout(() => setIsRegistering(false), 280);
      return;
    }
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
    setTimeout(() => setIsRegistering(false), 280);
  }, [
    bufferStats,
    canRegister,
    isRegistering,
    markDirty,
    retakeDraftPoints.length,
    retakeVolumeMl,
    volumeMl,
  ]);

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

  const onCancelCalibrationInProgress = useCallback(async () => {
    if (points.length === 0 && retakeVolumeMl === null) return;
    const ok = await confirmProceed(
      'Borrar calibración en curso',
      '¿Borrar la calibración en curso? Los puntos capturados en esta sesión se perderán, pero la calibración activa anterior no se modificará.',
      { confirmLabel: 'Borrar puntos' },
    );
    if (!ok) return;
    hapticLight();
    setPoints([]);
    setRetakeVolumeMl(null);
    setRetakeDraftPoints([]);
    setBuffer([]);
    markDirty();
  }, [markDirty, points.length, retakeVolumeMl]);

  const onResetConnection = useCallback(() => {
    hapticLight();
    setBuffer([]);
    resetConnection();
  }, [resetConnection]);

  const onSaveCalibration = useCallback(async () => {
    if (storageBusy !== 'idle' || !activeSpirometerDevice || !activeSpirometerProfile) return;
    hapticLight();
    setStorageBusy('saving');
    setStorageMessage(null);
    try {
      const profile = buildCalibrationProfile(points, {
        previous: savedProfile,
        spirometerDeviceId: activeSpirometerDevice.id,
        spirometerProfileId: activeSpirometerProfile.id,
        spirometerProfileSnapshot: activeSpirometerProfile,
        deviceIdentification,
      });
      await saveCalibrationProfileForSpirometer(activeSpirometerDevice.id, profile);
      setSavedProfile(profile);
      setHasUnsavedChanges(false);
      setSavedStatus({
        kind: 'saved',
        updatedAt: profile.updatedAt,
        pointsCount: profile.points.length,
      });
      setStorageMessage(
        `Calibración guardada para ${activeSpirometerDevice.label} (calibración específica del espirómetro).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar.';
      setStorageMessage(message);
    } finally {
      setStorageBusy('idle');
    }
  }, [
    activeSpirometerDevice,
    activeSpirometerProfile,
    deviceIdentification,
    points,
    savedProfile,
    storageBusy,
  ]);

  const onLoadCalibration = useCallback(async () => {
    if (storageBusy !== 'idle' || !activeSpirometerDevice) return;
    hapticLight();
    setStorageBusy('loading');
    setStorageMessage(null);
    const result = await loadCalibrationProfileDetailed(activeSpirometerDevice.id);
    applyLoadCalibrationResult(result);
    if (result.kind === 'ok') {
      setStorageMessage(
        `Calibración cargada para ${activeSpirometerDevice.label}.`,
      );
    } else if (result.kind === 'empty') {
      setStorageMessage('No hay calibración guardada para este espirómetro.');
    } else {
      setStorageMessage(`Calibración guardada corrupta: ${result.errorMessage}`);
    }
    setStorageBusy('idle');
  }, [activeSpirometerDevice, applyLoadCalibrationResult, storageBusy]);

  const onClearStorage = useCallback(async () => {
    if (storageBusy !== 'idle' || !activeSpirometerDevice) return;
    const ok = await confirmActionDouble(
      'Borrar calibración guardada',
      `Se eliminará la calibración guardada de ${activeSpirometerDevice.label}. Los puntos actuales en pantalla no se borran.`,
      'Confirma nuevamente para borrar la calibración guardada de este espirómetro.',
    );
    if (!ok) return;
    hapticLight();
    setStorageBusy('clearing');
    setStorageMessage(null);
    try {
      await clearCalibrationProfileForSpirometer(activeSpirometerDevice.id);
      setSavedProfile(null);
      setSavedStatus({ kind: 'none' });
      setHasUnsavedChanges(points.length > 0);
      setStorageMessage(`Calibración guardada eliminada para ${activeSpirometerDevice.label}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al borrar.';
      setStorageMessage(message);
    } finally {
      setStorageBusy('idle');
    }
  }, [activeSpirometerDevice, points.length, storageBusy]);

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

  const canActivateRecommendedModel = useMemo(() => {
    if (activeModelBusy !== 'idle' || storageBusy !== 'idle') return false;
    if (!activeSpirometerDevice || !savedProfile) return false;
    if (hasUnsavedChanges) return false;
    if (!recommendation || !linearModel || !piecewiseModel) return false;
    if (recommendation.recommendedKind === 'none') return false;
    if (!recommendation.isReadyForTherapy) return false;
    return true;
  }, [
    activeModelBusy,
    activeSpirometerDevice,
    hasUnsavedChanges,
    linearModel,
    piecewiseModel,
    recommendation,
    savedProfile,
    storageBusy,
  ]);

  const canSaveAndActivate =
    storageBusy === 'idle' &&
    activeModelBusy === 'idle' &&
    points.length > 0 &&
    (hasUnsavedChanges || canActivateRecommendedModel);

  const activationBlockReason = useMemo(() => {
    if (canActivateRecommendedModel) return null;
    if (hasUnsavedChanges) {
      return 'Guarda la calibración y completa los criterios antes de activar el modelo.';
    }
    if (!savedProfile) {
      return 'Guarda la calibración y completa los criterios antes de activar el modelo.';
    }
    if (!activeSpirometerDevice) {
      return 'Selecciona un espirómetro antes de activar el modelo.';
    }
    if (!recommendation || recommendation.recommendedKind === 'none') {
      return 'Guarda la calibración y completa los criterios antes de activar el modelo.';
    }
    if (!recommendation.isReadyForTherapy) {
      return recommendation.therapyReadinessReason;
    }
    return 'Guarda la calibración y completa los criterios antes de activar el modelo.';
  }, [
    activeSpirometerDevice,
    canActivateRecommendedModel,
    hasUnsavedChanges,
    recommendation,
    savedProfile,
  ]);

  const activeModelIsStale = useMemo(
    () =>
      isActiveCalibrationModelStale(activeCalibrationModel, savedProfile, hasUnsavedChanges),
    [activeCalibrationModel, hasUnsavedChanges, savedProfile],
  );

  const activeModelCardStatus = useMemo(
    () =>
      resolveActiveModelCardStatus(
        activeCalibrationModel,
        savedProfile,
        hasUnsavedChanges,
        canActivateRecommendedModel,
      ),
    [
      activeCalibrationModel,
      canActivateRecommendedModel,
      hasUnsavedChanges,
      savedProfile,
    ],
  );

  const activeModelStatusLabel = useMemo(
    () => activeModelCardStatusLabel(activeModelCardStatus),
    [activeModelCardStatus],
  );

  const activeTechnicalSummary = useMemo<ActiveCalibrationTechnicalSummary | null>(() => {
    if (!activeCalibrationModel || !activeSpirometerDevice) return null;
    return buildActiveCalibrationTechnicalSummary(
      activeCalibrationModel,
      activeSpirometerDevice.label,
    );
  }, [activeCalibrationModel, activeSpirometerDevice]);

  const {
    refresh: refreshVolumeEstimate,
    context: volumeEstimationContext,
    estimate: liveVolumeEstimate,
    status: volumeEstimateStatus,
    message: volumeEstimateMessage,
    sensorConnected: sensorConnectedForEstimate,
  } = useActiveVolumeEstimate({
    spirometerDeviceId: activeSpirometerDevice?.id,
    hasUnsavedChanges,
    enabled: spirometerReady && !!activeSpirometerDevice?.id,
  });

  const liveEstimateStatusLabel = volumeEstimationCardStatusLabel(volumeEstimateStatus);

  const runActivateWithProfile = useCallback(
    async (profile: CalibrationProfile) => {
      if (activeModelBusy !== 'idle' || storageBusy !== 'idle') return;
      if (!activeSpirometerDevice || !recommendation || !linearModel || !piecewiseModel) return;
      if (recommendation.recommendedKind === 'none' || !recommendation.isReadyForTherapy) return;

      const ok = await confirmActivationDouble(
        'Se guardará este modelo como modelo activo para el espirómetro seleccionado.',
        'Confirma que la calibración cumple el protocolo mínimo antes de activar.',
      );
      if (!ok) return;
      hapticLight();
      setActiveModelBusy('activating');
      setStorageMessage(null);
      try {
        const model = buildActiveCalibrationModel({
          calibrationProfile: profile,
          recommendation,
          linearModel,
          piecewiseModel,
        });
        await saveActiveCalibrationModelForSpirometer(model);
        setActiveCalibrationModel(model);
        setShowActiveModelSummary(true);
        await refreshVolumeEstimate();
        setSaveSuccessVisible(true);
        setStorageMessage(`Modelo activo guardado para ${activeSpirometerDevice.label}.`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudo activar el modelo.';
        setStorageMessage(message);
      } finally {
        setActiveModelBusy('idle');
      }
    },
    [
      activeModelBusy,
      activeSpirometerDevice,
      linearModel,
      piecewiseModel,
      recommendation,
      refreshVolumeEstimate,
      storageBusy,
    ],
  );

  const onSaveAndActivateCalibration = useCallback(async () => {
    if (!activeSpirometerDevice || !activeSpirometerProfile) return;
    if (activeModelBusy !== 'idle' || storageBusy !== 'idle') return;

    let profileForActivation = savedProfile;

    if (points.length > 0 && hasUnsavedChanges) {
      hapticLight();
      setStorageBusy('saving');
      setStorageMessage(null);
      try {
        const profile = buildCalibrationProfile(points, {
          previous: savedProfile,
          spirometerDeviceId: activeSpirometerDevice.id,
          spirometerProfileId: activeSpirometerProfile.id,
          spirometerProfileSnapshot: activeSpirometerProfile,
          deviceIdentification,
        });
        await saveCalibrationProfileForSpirometer(activeSpirometerDevice.id, profile);
        setSavedProfile(profile);
        profileForActivation = profile;
        setHasUnsavedChanges(false);
        setSavedStatus({
          kind: 'saved',
          updatedAt: profile.updatedAt,
          pointsCount: profile.points.length,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al guardar.';
        setStorageMessage(message);
        return;
      } finally {
        setStorageBusy('idle');
      }
    }

    if (!profileForActivation) {
      setStorageMessage('Registra y guarda puntos antes de activar la calibración.');
      return;
    }

    await runActivateWithProfile(profileForActivation);
  }, [
    activeModelBusy,
    activeSpirometerDevice,
    activeSpirometerProfile,
    deviceIdentification,
    hasUnsavedChanges,
    points,
    runActivateWithProfile,
    savedProfile,
    storageBusy,
  ]);

  const onClearActiveModel = useCallback(async () => {
    if (!activeSpirometerDevice || !activeCalibrationModel) return;
    const ok = await confirmActionDouble(
      'Borrar modelo activo',
      `Se eliminará el modelo activo de ${activeSpirometerDevice.label}. La calibración guardada y los puntos no se borran.`,
      'Confirma nuevamente para borrar solo el modelo activo.',
    );
    if (!ok) return;
    hapticLight();
    setActiveModelBusy('clearing');
    setStorageMessage(null);
    try {
      await clearActiveCalibrationModelForSpirometer(activeSpirometerDevice.id);
      setActiveCalibrationModel(null);
      setShowActiveModelSummary(false);
      await refreshVolumeEstimate();
      setStorageMessage(`Modelo activo eliminado para ${activeSpirometerDevice.label}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al borrar el modelo activo.';
      setStorageMessage(message);
    } finally {
      setActiveModelBusy('idle');
    }
  }, [activeCalibrationModel, activeSpirometerDevice, refreshVolumeEstimate]);

  const canClearActiveModel =
    activeCalibrationModel !== null && activeModelBusy === 'idle' && storageBusy === 'idle';

  const isConnecting = status === 'connecting';
  const isOnline = status === 'connected' || status === 'receiving';
  const modeLabel = mode === 'mock' ? 'local' : 'sensor';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/sensor-connection" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.techHeaderRow}>
          <SectionHeader
            title="Configuración técnica"
            subtitle="Identificación, captura de puntos y activación del modelo."
          />
          {onClose ? (
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.backLink, pressed && styles.backLinkPressed]}
              accessibilityRole="button"
              accessibilityLabel="Volver">
              <Text style={styles.backLinkText}>Volver</Text>
            </Pressable>
          ) : null}
        </View>

        <AppCard>
          <View style={styles.calibSummaryHeader}>
            <Text style={styles.calibSummaryTitle}>Calibración actual</Text>
            <StatusPill
              label={
                savedStatus.kind === 'loading'
                  ? 'Cargando…'
                  : savedStatus.kind === 'saved'
                    ? 'Guardada'
                    : savedStatus.kind === 'corrupt'
                      ? 'Revisar'
                      : 'Pendiente'
              }
              tone={
                savedStatus.kind === 'saved'
                  ? 'success'
                  : savedStatus.kind === 'corrupt'
                    ? 'danger'
                    : 'neutral'
              }
              size="sm"
            />
          </View>
          <View style={styles.calibMetricsRow}>
            <MetricTile
              label="Puntos"
              value={savedStatus.kind === 'saved' ? String(savedStatus.pointsCount) : '—'}
              tone={savedStatus.kind === 'saved' ? 'success' : 'default'}
              size="compact"
            />
            <MetricTile
              label="Rango"
              value={
                activeSpirometerProfile
                  ? `${activeSpirometerProfile.operativeMinVolumeMl}–${activeSpirometerProfile.maxVolumeMl}`
                  : '—'
              }
              helper={activeSpirometerProfile ? 'mL' : undefined}
              tone="default"
              size="compact"
            />
            <InfoTile
              label="Calidad"
              value={derivePatientCalibrationQuality(recommendation, linearModel, piecewiseModel)}
              tone={patientQualityTone(derivePatientCalibrationQuality(recommendation, linearModel, piecewiseModel))}
              compact
            />
          </View>
          {savedStatus.kind === 'saved' && savedStatus.updatedAt ? (
            <Text style={styles.calibLastUpdated}>
              Última actualización: {new Date(savedStatus.updatedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          ) : null}
        </AppCard>

        <Text style={styles.sectionEyebrow}>Identificación del dispositivo</Text>

        {spirometerReady && activeSpirometerDevice && activeSpirometerProfile ? (
          <>
          <View style={styles.card}>
            <Text style={styles.cardTitleStrong}>Espirómetro RESPIRA+ 3000 mL</Text>
            <Text style={styles.cardHint}>
              Marcas de 250 mL a 3000 mL · paso 250 mL.
            </Text>
            <View style={styles.resultsGrid}>
              <MetricCell label="Capacidad nominal" value="3000 mL" />
              <MetricCell
                label="Rango"
                value={`${activeSpirometerProfile.operativeMinVolumeMl}–${activeSpirometerProfile.maxVolumeMl} mL`}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitleStrong}>Componentes del sistema</Text>
            <Text style={styles.systemInfoLine}>
              {RESPIRA_SYSTEM_COMPONENTS.microcontrollerDisplay}
            </Text>
            <Text style={styles.systemInfoLine}>{RESPIRA_SYSTEM_COMPONENTS.sensorDisplay}</Text>
            <Text style={styles.systemInfoLine}>
              Firmware: {RESPIRA_SYSTEM_COMPONENTS.firmwareReference}
            </Text>
            <Text style={styles.systemInfoMuted}>
              Comunicación: {RESPIRA_SYSTEM_COMPONENTS.communication}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitleStrong}>Identificación del dispositivo</Text>
            <Text style={styles.cardHint}>
              Datos del espirómetro y de la sesión de calibración. Los componentes ESP32 y sensor son
              fijos del sistema RESPIRA+.
            </Text>
            <Text style={styles.identFieldLabel}>Nombre interno</Text>
            <TextInput
              style={styles.identInput}
              value={deviceIdentification.internalLabel}
              onChangeText={(text) => {
                setDeviceIdentification((prev) => ({ ...prev, internalLabel: text }));
                markDirty();
              }}
              placeholder="RESPIRA+ 3000 mL"
            />
            <Text style={styles.identFieldLabel}>Marca del espirómetro</Text>
            <TextInput
              style={styles.identInput}
              value={deviceIdentification.brand}
              onChangeText={(text) => {
                setDeviceIdentification((prev) => ({ ...prev, brand: text }));
                markDirty();
              }}
              placeholder="MediMetrics Medical Technologies"
            />
            <Text style={styles.identFieldLabel}>Modelo del espirómetro</Text>
            <TextInput
              style={styles.identInput}
              value={deviceIdentification.model}
              onChangeText={(text) => {
                setDeviceIdentification((prev) => ({ ...prev, model: text }));
                markDirty();
              }}
              placeholder="MV1811-3"
            />
            <Text style={styles.identFieldLabel}>Capacidad nominal (mL)</Text>
            <TextInput
              style={styles.identInput}
              value={String(deviceIdentification.nominalCapacityMl)}
              onChangeText={(text) => {
                const parsed = Number(text.replace(',', '.'));
                if (!Number.isFinite(parsed)) return;
                setDeviceIdentification((prev) => ({ ...prev, nominalCapacityMl: parsed }));
                markDirty();
              }}
              keyboardType="number-pad"
              placeholder="3000"
            />
            <Text style={styles.identFieldLabel}>
              Identificador físico del espirómetro (opcional)
            </Text>
            <TextInput
              style={styles.identInput}
              value={deviceIdentification.serialNumber ?? ''}
              onChangeText={(text) => {
                setDeviceIdentification((prev) => ({ ...prev, serialNumber: text || undefined }));
                markDirty();
              }}
              placeholder="N.º de serie o etiqueta"
            />
            <Text style={styles.identFieldLabel}>Operador</Text>
            <TextInput
              style={styles.identInput}
              value={deviceIdentification.calibrationOperator ?? ''}
              onChangeText={(text) => {
                setDeviceIdentification((prev) => ({
                  ...prev,
                  calibrationOperator: text || undefined,
                }));
                markDirty();
              }}
              placeholder="Nombre del operador"
            />
            <Text style={styles.identFieldLabel}>Fecha de calibración (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.identInput}
              value={deviceIdentification.calibrationDateIso}
              onChangeText={(text) => {
                setDeviceIdentification((prev) => ({ ...prev, calibrationDateIso: text }));
                markDirty();
              }}
              placeholder="2026-05-28"
            />
            <Text style={styles.identFieldLabel}>Notas técnicas</Text>
            <TextInput
              style={[styles.identInput, styles.identInputMultiline]}
              value={deviceIdentification.technicalNotes ?? ''}
              onChangeText={(text) => {
                setDeviceIdentification((prev) => ({ ...prev, technicalNotes: text || undefined }));
                markDirty();
              }}
              multiline
              textAlignVertical="top"
              placeholder="Observaciones del procedimiento, montaje, etc."
            />
          </View>
          </>
        ) : (
          <View style={styles.card}>
            <ActivityIndicator size="small" color={wellness.primaryDark} />
            <Text style={styles.cardHint}>Cargando espirómetro…</Text>
          </View>
        )}

        <Text style={styles.sectionEyebrow}>Captura de puntos</Text>

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

        {isRetakeMode && retakeVolumeMl !== null ? (
          <View style={styles.retakeBanner}>
            <Text style={styles.retakeBannerTitle}>Repitiendo {retakeVolumeMl} mL</Text>
            <Text style={styles.retakeBannerBody}>
              Captura {MIN_REPETITIONS_PER_REQUIRED_VOLUME} mediciones válidas para reemplazar el bloque anterior.
            </Text>
            <Text style={styles.retakeBannerProgress}>
              Progreso: {retakeDraftPoints.length} / {MIN_REPETITIONS_PER_REQUIRED_VOLUME}
            </Text>
            {retakeDraftPoints.length === MIN_REPETITIONS_PER_REQUIRED_VOLUME ? (
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed, styles.retakeBtn]}
                onPress={() => {
                  void onConfirmRetakeReplace();
                }}
                accessibilityRole="button"
                accessibilityLabel="Reemplazar mediciones anteriores">
                <Text style={styles.primaryBtnText}>Reemplazar mediciones anteriores</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed, styles.retakeBtn]}
              onPress={() => {
                void onCancelVolumeRetake();
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancelar repetición">
              <Text style={styles.secondaryBtnText}>Cancelar repetición</Text>
            </Pressable>
          </View>
        ) : null}

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
                <Text style={styles.ghostBtnText}>Iniciar lectura de prueba</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.ghostBtnPressed]}
                onPress={() => {
                  hapticLight();
                  stopMock();
                }}>
                <Text style={styles.ghostBtnText}>Detener lectura de prueba</Text>
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
            editable={!isRetakeMode}
            keyboardType="decimal-pad"
            style={[styles.volumeInput, isRetakeMode && styles.volumeInputLocked]}
            placeholder="Ej. 1500"
            placeholderTextColor={wellness.textSecondary}
          />
          {isRetakeMode ? (
            <Text style={styles.cardHint}>
              Volumen fijado durante repetir volumen. Termina o cancela la repetición para editar otro valor.
            </Text>
          ) : null}
          <Text style={styles.chipsGroupLabel}>
            Rango recomendado · {activeSpirometerProfile?.recommendedMinVolumeMl ?? 500}–
            {activeSpirometerProfile?.recommendedMaxVolumeMl ?? 3000} mL
          </Text>
          <View style={styles.chipsRow}>
            {recommendedVolumeChips.map((v) => (
              <Pressable
                key={v}
                style={({ pressed }) => [
                  styles.chip,
                  isRetakeMode && v !== retakeVolumeMl && styles.chipDisabled,
                  pressed && styles.chipPressed,
                ]}
                onPress={() => {
                  if (isRetakeMode && v !== retakeVolumeMl) return;
                  hapticLight();
                  setVolumeInput(String(v));
                }}
                accessibilityRole="button"
                accessibilityLabel={`Volumen objetivo ${v} mililitros (rango recomendado)`}>
                <Text style={styles.chipText}>{v}</Text>
              </Pressable>
            ))}
          </View>
          {extendedVolumeChips.length > 0 && activeSpirometerProfile ? (
            <>
              <Text style={styles.chipsGroupLabelMuted}>
                Rango extendido · {getExtendedRangeMinVolumeMl(activeSpirometerProfile)}–
                {activeSpirometerProfile.extendedMaxVolumeMl} mL
              </Text>
              <View style={styles.chipsRow}>
                {extendedVolumeChips.map((v) => (
                  <Pressable
                    key={v}
                    style={({ pressed }) => [
                      styles.chip,
                      styles.chipExtended,
                      isRetakeMode && styles.chipDisabled,
                      pressed && styles.chipPressed,
                    ]}
                    onPress={() => {
                      if (isRetakeMode) return;
                      hapticLight();
                      setVolumeInput(String(v));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Volumen objetivo ${v} mililitros (rango extendido)`}>
                    <Text style={[styles.chipText, styles.chipTextExtended]}>{v}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          {isSubOperativeInput ? (
            <Text style={styles.warnHint}>
              El rango operativo recomendado inicia en {operativeMinVolumeMl} mL.
            </Text>
          ) : null}
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
              (!canRegister || isRegistering) && styles.btnDisabled,
              pressed && canRegister && !isRegistering && styles.primaryBtnPressed,
            ]}
            onPress={onRegister}
            disabled={!canRegister || isRegistering}>
            <Text
              style={[
                styles.primaryBtnText,
                (!canRegister || isRegistering) && styles.primaryBtnTextDisabled,
              ]}>
              {isRegistering ? 'Registrando…' : 'Registrar punto'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Puntos capturados</Text>
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
          {points.length > 0 || retakeVolumeMl !== null ? (
            <Pressable
              onPress={() => void onCancelCalibrationInProgress()}
              style={({ pressed }) => [
                styles.destructiveTextBtn,
                pressed && styles.destructiveTextBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Borrar calibración en curso">
              <Text style={styles.destructiveTextBtnLabel}>Borrar calibración en curso</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => setAdvancedMetricsExpanded((prev) => !prev)}
          style={({ pressed }) => [styles.techDetailsToggle, pressed && styles.techDetailsTogglePressed]}
          accessibilityRole="button"
          accessibilityLabel={
            advancedMetricsExpanded ? 'Ocultar métricas avanzadas' : 'Ver métricas avanzadas'
          }>
          <Text style={styles.techDetailsToggleText}>
            {advancedMetricsExpanded ? 'Ocultar métricas avanzadas' : 'Ver métricas avanzadas'}
          </Text>
          <Text style={styles.techDetailsToggleChevron}>{advancedMetricsExpanded ? '▾' : '▸'}</Text>
        </Pressable>

        {advancedMetricsExpanded ? (
          <>
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

        <View style={styles.modelSectionHeader}>
          <Text style={styles.modelSectionTitle}>Modelo de calibración</Text>
          <Text style={styles.modelSectionSubtitle}>
            Convierte la distancia del sensor en volumen estimado para{' '}
            {activeSpirometerProfile?.name ?? 'el espirómetro activo'}. Rango recomendado{' '}
            {activeSpirometerProfile?.recommendedMinVolumeMl ?? 500}–
            {activeSpirometerProfile?.recommendedMaxVolumeMl ?? 3000} mL
            {activeSpirometerProfile &&
            activeSpirometerProfile.extendedMaxVolumeMl >
              activeSpirometerProfile.recommendedMaxVolumeMl
              ? `; rango extendido opcional hasta ${activeSpirometerProfile.extendedMaxVolumeMl} mL`
              : ''}
            .
          </Text>
        </View>

        {/* A. Protocolo mínimo */}
        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Protocolo mínimo de calibración</Text>
          <Text style={styles.cardHint}>
            Para considerar la calibración apta para terapia: {requiredVolumesMl.length}{' '}
            volúmenes obligatorios ({requiredVolumesMl.join(', ')} mL), al menos{' '}
            {MIN_REPETITIONS_PER_REQUIRED_VOLUME} mediciones válidas en cada uno y un total de al menos{' '}
            {MIN_VALID_CALIBRATION_POINTS_FOR_THERAPY} puntos válidos en esos volúmenes.
          </Text>
          <View style={styles.resultsGrid}>
            <MetricCell
              label="Progreso (puntos válidos)"
              value={
                recommendation
                  ? `${recommendation.requiredProtocol.totalValidRequiredPoints} / ${recommendation.requiredProtocol.minimumRequiredPoints}`
                  : '—'
              }
            />
            <MetricCell
              label="Protocolo mínimo cumplido"
              value={
                recommendation?.requiredProtocol.meetsRequiredProtocol ? 'Sí' : 'No'
              }
            />
          </View>
          {requiredCoverage.missingRequiredVolumes.length > 0 ? (
            <Text style={styles.warnHint}>
              Volúmenes obligatorios faltantes:{' '}
              {requiredCoverage.missingRequiredVolumes.map((v) => `${v} mL`).join(', ')}.
            </Text>
          ) : (
            <Text style={styles.summaryLine}>
              Volúmenes obligatorios presentes:{' '}
              {requiredCoverage.presentRequiredVolumes.length === 0
                ? '—'
                : requiredCoverage.presentRequiredVolumes.map((v) => `${v} mL`).join(', ')}
            </Text>
          )}
          {requiredCoverage.requiredVolumesWithLowRepetitions.length > 0 ? (
            <Text style={styles.warnHint}>
              Volúmenes obligatorios con pocas repeticiones (menos de {MIN_REPETITIONS_PER_REQUIRED_VOLUME}):{' '}
              {requiredCoverage.requiredVolumesWithLowRepetitions.map((v) => `${v} mL`).join(', ')}.
            </Text>
          ) : null}
          <Text style={styles.cardSubTitleStrong}>Mediciones por volumen obligatorio</Text>
          <View style={styles.summaryTableHead}>
            <Text style={[styles.summaryHeadCell, styles.protocolVolCol]}>Volumen</Text>
            <Text style={[styles.summaryHeadCell, styles.protocolRepCol]}>Mediciones</Text>
          </View>
          {requiredVolumesMl.map((v) => (
            <View key={`req-${v}`} style={styles.summaryTableRow}>
              <Text style={[styles.summaryCell, styles.protocolVolCol]}>{v} mL</Text>
              <Text style={[styles.summaryCell, styles.protocolRepCol]}>
                {requiredCoverage.repetitionsByRequiredVolume[v] ?? 0}
              </Text>
            </View>
          ))}
        </View>

        {/* Validación geométrica (escala física del espirómetro) */}
        {geometricReport ? (
        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Validación geométrica</Text>
          <Text style={styles.cardHint}>
            Verificación geométrica del montaje: compara saltos de distancia entre marcas del
            espirómetro con el desplazamiento físico esperado del perfil activo. No define el volumen
            de referencia.
          </Text>
          {!geometricReport.geometricValidationConfigured ? (
            <Text style={styles.warnHint}>
              La validación geométrica requiere medir la distancia física entre marcas del
              espirómetro.
            </Text>
          ) : null}
          <View style={styles.resultsGrid}>
            <MetricCell
              label="Escala esperada (perfil)"
              value={
                geometricReport.expectedDistanceStepPer500MlMm !== null &&
                activeSpirometerProfile
                  ? `${geometricReport.expectedDistanceStepPer500MlMm} mm / ${activeSpirometerProfile.calibrationStepMl} mL`
                  : 'No configurada'
              }
            />
            <MetricCell
              label="Segmentos correctos"
              value={
                geometricReport.geometricValidationConfigured
                  ? `${geometricReport.okSegments} / ${geometricSegmentCount}`
                  : '—'
              }
            />
            <MetricCell
              label="Estado"
              value={geometricValidationOverallLabel(geometricReport)}
            />
          </View>
          {geometricReport.geometricValidationConfigured ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.geomTable}>
              <View style={[styles.geomTableRow, styles.geomTableHeadRow]}>
                <Text style={[styles.geomCell, styles.geomColRange]}>Tramo</Text>
                <Text style={[styles.geomCell, styles.geomColDelta]}>Δ medido</Text>
                <Text style={[styles.geomCell, styles.geomColExpected]}>Δ esperado</Text>
                <Text style={[styles.geomCell, styles.geomColPct]}>Error %</Text>
                <Text style={[styles.geomCell, styles.geomColState]}>Estado</Text>
              </View>
              {geometricReport.requiredSegments.map((seg) => (
                <View key={`geom-${seg.volumeFromMl}-${seg.volumeToMl}`} style={styles.geomTableRow}>
                  <Text style={[styles.geomCell, styles.geomColRange]}>
                    {seg.volumeFromMl}→{seg.volumeToMl} mL
                  </Text>
                  <Text style={[styles.geomCell, styles.geomColDelta]}>
                    {seg.actualDeltaDistanceMm === null
                      ? '—'
                      : `${seg.actualDeltaDistanceMm >= 0 ? '+' : ''}${seg.actualDeltaDistanceMm.toFixed(1)} mm`}
                  </Text>
                  <Text style={[styles.geomCell, styles.geomColExpected]}>
                    {formatExpectedDeltaMm(seg.expectedDeltaDistanceMm)}
                  </Text>
                  <Text style={[styles.geomCell, styles.geomColPct]}>
                    {seg.percentError === null ? '—' : `${seg.percentError.toFixed(0)} %`}
                  </Text>
                  <Text style={[styles.geomCell, styles.geomColState]}>
                    {geometricSegmentStatusLabel(seg.status)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
          ) : null}
          {geometricReport.geometricValidationConfigured &&
          geometricReport.criticalSegments > 0 ? (
            <Text style={styles.warnHint}>
              Revisa el montaje del sensor o repite las mediciones del tramo afectado.
            </Text>
          ) : null}
        </View>
        ) : null}

          </>
        ) : null}

        <Text style={styles.sectionEyebrow}>Modelo y activación</Text>

        {/* B. Modelo recomendado */}
        {recommendation && uncertaintySummary && coverage && linearModel ? (
        <>
        <View style={styles.card}>
          <View style={styles.modelHeaderRow}>
            <Text style={styles.cardTitleStrong}>Modelo recomendado</Text>
            <View
              style={[
                styles.modelStatusPill,
                recommendationStatusTone(recommendation.status) === 'ok'
                  ? styles.modelStatusPillOk
                  : recommendationStatusTone(recommendation.status) === 'warn'
                    ? styles.modelStatusPillWarn
                    : styles.modelStatusPillMuted,
              ]}>
              <Text
                style={[
                  styles.modelStatusPillText,
                  recommendationStatusTone(recommendation.status) === 'ok'
                    ? styles.modelStatusPillTextOk
                    : recommendationStatusTone(recommendation.status) === 'warn'
                      ? styles.modelStatusPillTextWarn
                      : styles.modelStatusPillTextMuted,
                ]}>
                {recommendationStatusLabel(recommendation.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.cardSubTitleStrong}>Estimación y terapia</Text>
          <View style={styles.resultsGrid}>
            <MetricCell
              label="Estimación en rango calibrado"
              value={recommendation.canEstimateWithinCalibratedRange ? 'Disponible' : 'No disponible'}
            />
            <MetricCell
              label="Listo para terapia"
              value={recommendation.isReadyForTherapy ? 'Sí' : 'No'}
            />
            <MetricCell
              label="Modelo seleccionado"
              value={recommendedKindLabel(recommendation.recommendedKind)}
            />
            <MetricCell
              label="Calidad de calibración"
              value={calibrationQualityLabel(recommendation.calibrationQuality)}
            />
            <MetricCell label="Puntos capturados (total)" value={String(points.length)} />
          </View>
          <Text style={styles.modelSubLabel}>Razón</Text>
          <Text style={styles.modelReason}>{recommendation.therapyReadinessReason}</Text>
          <Text style={styles.modelSubLabel}>Criterio de selección del modelo</Text>
          <Text style={styles.modelSecondaryReason}>{recommendation.reason}</Text>
          {recommendation.warnings.length > 0 ? (
            <View style={styles.modelWarningsBox}>
              {recommendation.warnings.map((warning, idx) => (
                <Text key={`rec-${idx}`} style={styles.modelWarningText}>
                  • {warning}
                </Text>
              ))}
            </View>
          ) : null}
          {uncertaintySummary.reports.some((r) => r.expandedUncertaintyU95Ml !== null) ? (
            <>
              <Text style={styles.modelSubLabel}>Resultado esperado del modelo</Text>
              <Text style={styles.modelReason}>
                Volumen estimado ± U95 (mL), con bandas según volumen calibrado (k ={' '}
                {UNCERTAINTY_COVERAGE_FACTOR_K}).
              </Text>
              <Text style={styles.cardHint}>
                Cuando se active en terapia, el modelo reportará el volumen estimado acompañado de
                una incertidumbre expandida U95.
              </Text>
            </>
          ) : null}
        </View>

        {/* Incertidumbre metrológica */}
        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Incertidumbre metrológica</Text>
          <Text style={styles.cardHint}>
            Referencia primaria de volumen: escala del espirómetro. La regla se usa solo en
            verificación geométrica del montaje y no entra en uc por defecto.
          </Text>
          <View style={styles.resultsGrid}>
            <MetricCell
              label="U95 promedio"
              value={formatUncertaintyMl(uncertaintySummary.averageU95Ml)}
              unit="mL"
            />
            <MetricCell
              label="U95 máximo"
              value={formatUncertaintyMl(uncertaintySummary.maxU95Ml)}
              unit="mL"
            />
            <MetricCell
              label="Volumen con mayor U95"
              value={
                uncertaintySummary.volumeWithMaxU95Ml === null
                  ? '—'
                  : `${uncertaintySummary.volumeWithMaxU95Ml} mL`
              }
            />
            <MetricCell
              label="Factor k"
              value={String(UNCERTAINTY_COVERAGE_FACTOR_K)}
            />
            <MetricCell
              label="Estado"
              value={uncertaintyOverallLabel(
                uncertaintySummary.reports,
                recommendation.uncertainty.hasAcceptableUncertainty,
              )}
            />
          </View>
          {uncertaintySummary.reports.length > 0 ? (
            <>
              <Text style={styles.cardSubTitleStrong}>Por volumen</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.uncertTable}>
                  <View style={[styles.uncertTableRow, styles.uncertTableHeadRow]}>
                    <Text style={[styles.uncertCell, styles.uncertColVol]}>Vol.</Text>
                    <Text style={[styles.uncertCell, styles.uncertColN]}>n</Text>
                    <Text style={[styles.uncertCell, styles.uncertColSd]}>SD rep.</Text>
                    <Text style={[styles.uncertCell, styles.uncertColUa]}>uA</Text>
                    <Text style={[styles.uncertCell, styles.uncertColSens]}>Sens.</Text>
                    <Text style={[styles.uncertCell, styles.uncertColUc]}>uc</Text>
                    <Text style={[styles.uncertCell, styles.uncertColU95]}>U95</Text>
                    <Text style={[styles.uncertCell, styles.uncertColState]}>Estado</Text>
                  </View>
                  {uncertaintySummary.reports.map((row: VolumeUncertaintyReport) => (
                    <View key={`unc-${row.volumeMl}`} style={styles.uncertTableRow}>
                      <Text style={[styles.uncertCell, styles.uncertColVol]}>{row.volumeMl}</Text>
                      <Text style={[styles.uncertCell, styles.uncertColN]}>{row.repetitions}</Text>
                      <Text style={[styles.uncertCell, styles.uncertColSd]}>
                        {row.sdBetweenRepetitionsMm === null
                          ? '—'
                          : `${row.sdBetweenRepetitionsMm.toFixed(2)}`}
                      </Text>
                      <Text style={[styles.uncertCell, styles.uncertColUa]}>
                        {row.uARepeatabilityDistanceMm === null
                          ? '—'
                          : row.uARepeatabilityDistanceMm.toFixed(2)}
                      </Text>
                      <Text style={[styles.uncertCell, styles.uncertColSens]}>
                        {row.localSensitivityMlPerMm === null
                          ? '—'
                          : `${row.localSensitivityMlPerMm.toFixed(0)}`}
                      </Text>
                      <Text style={[styles.uncertCell, styles.uncertColUc]}>
                        {row.uCombinedVolumeMl === null
                          ? '—'
                          : row.uCombinedVolumeMl.toFixed(0)}
                      </Text>
                      <Text style={[styles.uncertCell, styles.uncertColU95]}>
                        {formatUncertaintyMl(row.expandedUncertaintyU95Ml)}
                      </Text>
                      <Text style={[styles.uncertCell, styles.uncertColState]}>
                        {volumeUncertaintyStatusLabel(row.status)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : (
            <Text style={styles.emptyText}>Registra puntos de calibración para calcular incertidumbre.</Text>
          )}
          <Text style={styles.cardSubTitleStrong}>Componentes considerados</Text>
          {uncertaintySummary.components.map((comp) => (
            <View key={comp.label} style={styles.uncertComponentRow}>
              <View style={styles.uncertComponentHeader}>
                <Text style={styles.uncertComponentLabel}>{comp.label}</Text>
                {comp.includedInCombinedUncertainty === false ? (
                  <Text style={styles.uncertComponentBadge}>Solo verificación geométrica</Text>
                ) : comp.includedInCombinedUncertainty === true &&
                  comp.label === 'Lectura marca espirómetro' ? (
                  <Text style={styles.uncertComponentBadgePrimary}>Referencia primaria</Text>
                ) : null}
              </View>
              <Text style={styles.uncertComponentValue}>
                {comp.value === null
                  ? '—'
                  : comp.label === 'Incertidumbre relativa sensor'
                    ? `${comp.value.toFixed(0)} %`
                    : comp.label === 'Factor de cobertura k'
                      ? String(comp.value)
                      : comp.label.startsWith('Regla física')
                        ? `u ≈ ${comp.value.toFixed(1)} mL`
                        : `${comp.value} ${comp.unit}`}
              </Text>
              <Text style={styles.uncertComponentDesc}>{comp.description}</Text>
            </View>
          ))}
          {!uncertaintySummary.includeRuleInCombinedUncertainty ? (
            <Text style={styles.cardHint}>
              La regla no se suma en la incertidumbre combinada del volumen estimado; define solo la
              verificación geométrica del desplazamiento del pistón.
            </Text>
          ) : null}
          {uncertaintySummary.warnings.length > 0 ? (
            <View style={styles.modelWarningsBox}>
              {uncertaintySummary.warnings.map((warning, idx) => (
                <Text key={`unc-w-${idx}`} style={styles.modelWarningText}>
                  • {warning}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* C. Calidad del modelo lineal */}
        <View style={styles.card}>
          <View style={styles.modelHeaderRow}>
            <Text style={styles.cardTitleStrong}>Calidad del modelo lineal</Text>
            <View
              style={[
                styles.modelStatusPill,
                linealQualityTone(recommendation.linealQuality) === 'ok'
                  ? styles.modelStatusPillOk
                  : linealQualityTone(recommendation.linealQuality) === 'warn'
                    ? styles.modelStatusPillWarn
                    : styles.modelStatusPillMuted,
              ]}>
              <Text
                style={[
                  styles.modelStatusPillText,
                  linealQualityTone(recommendation.linealQuality) === 'ok'
                    ? styles.modelStatusPillTextOk
                    : linealQualityTone(recommendation.linealQuality) === 'warn'
                      ? styles.modelStatusPillTextWarn
                      : styles.modelStatusPillTextMuted,
                ]}>
                {linealQualityLabel(recommendation.linealQuality)}
              </Text>
            </View>
          </View>
          {linearModel.status === 'valid' &&
          linearModel.coefficients.slope !== undefined &&
          linearModel.coefficients.intercept !== undefined ? (
            <View style={styles.modelEquationBox}>
              <Text style={styles.modelEquationLabel}>Ecuación</Text>
              <Text style={styles.modelEquationText}>
                estimatedVolumeMl = {formatSlope(linearModel.coefficients.slope)} · distanceMm
                {' '}
                {linearModel.coefficients.intercept >= 0 ? '+' : '−'}{' '}
                {formatIntercept(Math.abs(linearModel.coefficients.intercept))}
              </Text>
            </View>
          ) : (
            <Text style={styles.cardHint}>
              No hay ecuación disponible: {modelStatusLabel(linearModel.status).toLowerCase()}.
            </Text>
          )}
          <View style={styles.resultsGrid}>
            <MetricCell label="R²" value={formatR2(linearModel.metrics.rSquared)} />
            <MetricCell label="RMSE" value={formatMetricMl(linearModel.metrics.rmseMl)} />
            <MetricCell label="MAE" value={formatMetricMl(linearModel.metrics.maeMl)} />
            <MetricCell
              label="Error máximo"
              value={formatMetricMl(linearModel.metrics.maxAbsErrorMl)}
            />
            <MetricCell label="Puntos usados" value={String(linearModel.pointsUsed)} />
            <MetricCell
              label="Rango distancia"
              value={
                linearModel.distanceRangeMm.max - linearModel.distanceRangeMm.min === 0
                  ? '—'
                  : `${linearModel.distanceRangeMm.min.toFixed(1)}–${linearModel.distanceRangeMm.max.toFixed(1)} mm`
              }
            />
          </View>
          {linearModel.warnings.length > 0 ? (
            <View style={styles.modelWarningsBox}>
              {linearModel.warnings.map((warning, idx) => (
                <Text key={`lin-${idx}`} style={styles.modelWarningText}>
                  • {warning}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* D. Cobertura */}
        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Cobertura</Text>
          <View style={styles.resultsGrid}>
            <MetricCell
              label="Rango calibrado"
              value={
                coverage.coveredMinMl === null || coverage.coveredMaxMl === null
                  ? '—'
                  : `${coverage.coveredMinMl}–${coverage.coveredMaxMl} mL`
              }
            />
            <MetricCell
              label="Rango útil (mm)"
              value={globalRange.rangeMm === null ? '—' : `${globalRange.rangeMm.toFixed(1)} mm`}
            />
            <MetricCell
              label={`Cobertura ${activeSpirometerProfile?.recommendedMinVolumeMl ?? 500}–${activeSpirometerProfile?.recommendedMaxVolumeMl ?? 3000}`}
              value={
                coverage.coveredMinMl === null
                  ? '—'
                  : `${coverage.recommendedCoveragePct.toFixed(0)} %`
              }
            />
            <MetricCell
              label={`Cobertura ${activeSpirometerProfile?.operativeMinVolumeMl ?? 250}–${activeSpirometerProfile?.maxVolumeMl ?? 3000}`}
              value={
                coverage.coveredMinMl === null
                  ? '—'
                  : `${coverage.totalCoveragePct.toFixed(0)} %`
              }
            />
          </View>
          {globalRange.rangeMm !== null ? (
            <Text style={styles.summaryLine}>
              Distancia mín: {(globalRange.minDistanceMm ?? 0).toFixed(1)} mm · máx:{' '}
              {(globalRange.maxDistanceMm ?? 0).toFixed(1)} mm
            </Text>
          ) : null}
          {volumeSummaries.length > 0 ? (
            <Text style={styles.modelCoverageHint}>
              {coverage.coversTotal && activeSpirometerProfile
                ? `Cubre el rango total del dispositivo (${activeSpirometerProfile.operativeMinVolumeMl}–${activeSpirometerProfile.maxVolumeMl} mL).`
                : coverage.coversRecommended && activeSpirometerProfile
                  ? `Cubre el rango recomendado (${activeSpirometerProfile.recommendedMinVolumeMl}–${activeSpirometerProfile.recommendedMaxVolumeMl} mL).`
                  : activeSpirometerProfile
                    ? `Aún no cubre el rango recomendado (${activeSpirometerProfile.recommendedMinVolumeMl}–${activeSpirometerProfile.recommendedMaxVolumeMl} mL).`
                    : 'Aún no cubre el rango recomendado.'}
            </Text>
          ) : null}
          {volumeSummaries.length > 0 && !coverage.coversRecommended ? (
            <Text style={styles.warnHint}>
              Completa el rango recomendado antes de usar el modelo en terapia.
            </Text>
          ) : null}
          {coverage.coversRecommended &&
          !coverage.coversTotal &&
          activeSpirometerProfile &&
          activeSpirometerProfile.extendedMaxVolumeMl >
            activeSpirometerProfile.recommendedMaxVolumeMl ? (
            <Text style={styles.cardHint}>
              El rango extendido (
              {getExtendedRangeMinVolumeMl(activeSpirometerProfile)}–
              {activeSpirometerProfile.extendedMaxVolumeMl} mL) es opcional para pacientes con mayor
              capacidad.
            </Text>
          ) : null}
          {hasLegacySubOperative ? (
            <Text style={styles.cardHint}>
              Este perfil contiene puntos por debajo del rango operativo recomendado
              (&lt;{operativeMinVolumeMl} mL). Se mantienen visibles, pero las nuevas capturas
              deberían iniciar en {operativeMinVolumeMl} mL.
            </Text>
          ) : null}
        </View>
        </>
        ) : null}

        {/* E. Repetibilidad */}
        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Repetibilidad</Text>
          <Text style={styles.cardHint}>
            Incluye la variación de cada medición (std por captura) y la dispersión entre mediciones del mismo
            volumen (SD entre repeticiones). Mínimo requerido: {MIN_REPETITIONS_PER_REQUIRED_VOLUME} mediciones
            válidas por volumen obligatorio. Por debajo de {MIN_REPETITIONS_PER_VOLUME} mediciones en cualquier
            volumen se muestra una advertencia técnica adicional.
          </Text>
          {repeatability.hasPoints ? (
            <>
              <View style={styles.resultsGrid}>
                <MetricCell
                  label="Mín. repeticiones / volumen"
                  value={String(repeatability.minRepetitionsPerVolume)}
                />
                <MetricCell
                  label="Variación promedio (std captura)"
                  value={`±${repeatability.averageStdDistanceMm.toFixed(2)} mm`}
                />
                <MetricCell
                  label="Mayor variación (std captura)"
                  value={`±${repeatability.maxStdDistanceMm.toFixed(2)} mm`}
                />
                <MetricCell
                  label="Volumen con mayor variación (std)"
                  value={
                    repeatability.volumeWithMaxStdDistanceMm === null
                      ? '—'
                      : `${repeatability.volumeWithMaxStdDistanceMm} mL`
                  }
                />
              </View>
              <Text style={styles.cardSubTitleStrong}>Por volumen</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.repetTable}>
                  <View style={[styles.repetTableRow, styles.repetTableHeadRow]}>
                    <Text style={[styles.repetCell, styles.repetColVol]}>Volumen</Text>
                    <Text style={[styles.repetCell, styles.repetColN]}>n</Text>
                    <Text style={[styles.repetCell, styles.repetColMean]}>Promedio</Text>
                    <Text style={[styles.repetCell, styles.repetColSd]}>SD rep.</Text>
                    <Text style={[styles.repetCell, styles.repetColRange]}>Rango</Text>
                    <Text style={[styles.repetCell, styles.repetColState]}>Estado</Text>
                    <Text style={[styles.repetCell, styles.repetColAction]}>Acción</Text>
                  </View>
                  {repeatability.perVolume.map((row) => (
                    <View key={`rep-v-${row.volumeMl}`} style={styles.repetTableRow}>
                      <Text style={[styles.repetCell, styles.repetColVol]}>{row.volumeMl} mL</Text>
                      <Text style={[styles.repetCell, styles.repetColN]}>{row.repetitions}</Text>
                      <Text style={[styles.repetCell, styles.repetColMean]}>
                        {row.meanDistanceMm.toFixed(1)} mm
                      </Text>
                      <Text style={[styles.repetCell, styles.repetColSd]}>
                        {row.sdBetweenRepetitionsMm.toFixed(2)} mm
                      </Text>
                      <Text style={[styles.repetCell, styles.repetColRange]}>
                        {row.rangeDistanceMm.toFixed(1)} mm
                      </Text>
                      <View style={styles.repetColState}>
                        <View
                          style={[
                            styles.repetBadge,
                            row.warningLevel === 'ok' && styles.repetBadgeOk,
                            row.warningLevel === 'moderate' && styles.repetBadgeModerate,
                            row.warningLevel === 'high' && styles.repetBadgeHigh,
                          ]}>
                          <Text
                            style={[
                              styles.repetBadgeText,
                              row.warningLevel === 'high' && styles.repetBadgeTextHigh,
                            ]}>
                            {volumeRepeatabilityBadgeLabel(row)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.repetColAction}>
                        {row.warningLevel === 'high' && !isRetakeMode ? (
                          <Pressable
                            style={({ pressed }) => [
                              styles.repetRepeatBtn,
                              pressed && styles.repetRepeatBtnPressed,
                            ]}
                            onPress={() => {
                              void onStartVolumeRetake(row.volumeMl);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Repetir volumen ${row.volumeMl} mililitros`}>
                            <Text style={styles.repetRepeatBtnText}>Repetir {row.volumeMl} mL</Text>
                          </Pressable>
                        ) : row.warningLevel === 'high' &&
                          isRetakeMode &&
                          retakeVolumeMl === row.volumeMl ? (
                          <Text style={styles.repetActionMuted}>En curso</Text>
                        ) : (
                          <Text style={styles.repetActionMuted}>—</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : (
            <Text style={styles.emptyText}>Aún no hay puntos para evaluar repetibilidad.</Text>
          )}
          {repeatability.warnings.length > 0 ? (
            <View style={styles.modelWarningsBox}>
              {repeatability.warnings.map((warning, idx) => (
                <Text key={`rep-${idx}`} style={styles.modelWarningText}>
                  • {warning}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* F. Segmentos */}
        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Segmentos</Text>
          <Text style={styles.cardHint}>
            Pendiente entre volúmenes consecutivos (mL por mm). Variaciones grandes indican
            saltos bruscos o problemas de montaje. Relación actual:{' '}
            {relationLabel(relation).toLowerCase()}.
          </Text>
          {segmentReport.segments.length === 0 ? (
            <Text style={styles.emptyText}>Se necesitan al menos dos volúmenes.</Text>
          ) : (
            <>
              <View style={styles.resultsGrid}>
                <MetricCell
                  label="Pendiente mín."
                  value={
                    segmentReport.minSlopeMlPerMm === null
                      ? '—'
                      : `${segmentReport.minSlopeMlPerMm.toFixed(0)} mL/mm`
                  }
                />
                <MetricCell
                  label="Pendiente máx."
                  value={
                    segmentReport.maxSlopeMlPerMm === null
                      ? '—'
                      : `${segmentReport.maxSlopeMlPerMm.toFixed(0)} mL/mm`
                  }
                />
                <MetricCell
                  label="Variación de pendiente"
                  value={
                    segmentReport.slopeVariationRatio === null
                      ? '—'
                      : `×${segmentReport.slopeVariationRatio.toFixed(1)}`
                  }
                />
                <MetricCell label="Segmentos" value={String(segmentReport.segments.length)} />
              </View>
              <View style={styles.summaryTableHead}>
                <Text style={[styles.summaryHeadCell, styles.segmentColRange]}>Tramo (mL)</Text>
                <Text style={[styles.summaryHeadCell, styles.segmentColDist]}>Δ dist.</Text>
                <Text style={[styles.summaryHeadCell, styles.segmentColSlope]}>Pendiente</Text>
              </View>
              {segmentReport.segments.map((seg, idx) => (
                <View key={`seg-${idx}`} style={styles.summaryTableRow}>
                  <Text style={[styles.summaryCell, styles.segmentColRange]}>
                    {seg.volumeFromMl}→{seg.volumeToMl}
                  </Text>
                  <Text style={[styles.summaryCell, styles.segmentColDist]}>
                    {seg.deltaDistanceMm >= 0 ? '+' : ''}
                    {seg.deltaDistanceMm.toFixed(2)} mm
                  </Text>
                  <Text style={[styles.summaryCell, styles.segmentColSlope]}>
                    {seg.slopeMlPerMm === null
                      ? '—'
                      : `${seg.slopeMlPerMm.toFixed(0)} mL/mm`}
                  </Text>
                </View>
              ))}
            </>
          )}
          {segmentReport.warnings.length > 0 ? (
            <View style={styles.modelWarningsBox}>
              {segmentReport.warnings.map((warning, idx) => (
                <Text key={`seg-w-${idx}`} style={styles.modelWarningText}>
                  • {warning}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={styles.relationHint}>{relationHint(relation)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Activación para terapia</Text>
          <Text style={styles.cardHint}>
            Guarda los puntos y activa el modelo recomendado cuando el protocolo esté completo.
          </Text>
          <View
            style={[
              styles.savedBadge,
              activeModelCardStatus === 'current'
                ? styles.savedBadgeOk
                : activeModelCardStatus === 'stale'
                  ? styles.savedBadgeWarn
                  : activeModelCardStatus === 'not_eligible'
                    ? styles.savedBadgeWarn
                    : styles.savedBadgeMuted,
            ]}>
            {activeModelBusy !== 'idle' ? (
              <ActivityIndicator size="small" color={wellness.primaryDark} />
            ) : null}
            <Text
              style={
                activeModelCardStatus === 'current'
                  ? styles.savedBadgeText
                  : activeModelCardStatus === 'stale' || activeModelCardStatus === 'not_eligible'
                    ? styles.savedBadgeText
                    : styles.savedBadgeTextMuted
              }>
              {activeModelStatusLabel}
            </Text>
          </View>

          {activeCalibrationModel ? (
            <View style={styles.resultsGrid}>
              <MetricCell
                label="Tipo de modelo activo"
                value={activeModelKindUiLabel(activeCalibrationModel.modelKind)}
              />
              <MetricCell
                label="Espirómetro asociado"
                value={activeSpirometerDevice?.label ?? '—'}
              />
              <MetricCell
                label="Activado"
                value={formatTimestamp(activeCalibrationModel.activatedAt)}
              />
              <MetricCell
                label="U95 máximo"
                value={
                  activeCalibrationModel.uncertainty.maxU95Ml !== null
                    ? `${activeCalibrationModel.uncertainty.maxU95Ml.toFixed(0)} mL`
                    : '—'
                }
              />
              <MetricCell
                label="Rango calibrado"
                value={`${activeCalibrationModel.calibratedRangeMl.min}–${activeCalibrationModel.calibratedRangeMl.max} mL`}
              />
            </View>
          ) : (
            <Text style={styles.summaryLine}>
              Aún no hay modelo activo guardado para este espirómetro.
            </Text>
          )}

          {activeModelIsStale && activeCalibrationModel ? (
            <Text style={styles.warnHint}>
              El modelo activo no coincide con la calibración guardada actual. Actívalo de nuevo
              después de guardar si la calibración cumple los criterios.
            </Text>
          ) : null}

          {!canActivateRecommendedModel && activationBlockReason ? (
            <Text style={styles.cardHint}>{activationBlockReason}</Text>
          ) : null}

          <View style={styles.rowGap}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                !canSaveAndActivate && styles.btnDisabled,
                pressed && canSaveAndActivate && styles.primaryBtnPressed,
              ]}
              onPress={() => {
                void onSaveAndActivateCalibration();
              }}
              disabled={!canSaveAndActivate}
              accessibilityRole="button"
              accessibilityLabel="Guardar y activar calibración">
              <Text
                style={[
                  styles.primaryBtnText,
                  !canSaveAndActivate && styles.btnTextDisabled,
                ]}>
                Guardar y activar calibración
              </Text>
            </Pressable>
            {activeCalibrationModel ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    pressed && styles.secondaryBtnPressed,
                  ]}
                  onPress={() => {
                    hapticLight();
                    setShowActiveModelSummary((v) => !v);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Ver resumen técnico">
                  <Text style={styles.secondaryBtnText}>
                    {showActiveModelSummary ? 'Ocultar resumen técnico' : 'Ver resumen técnico'}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.dangerBtn,
                    !canClearActiveModel && styles.btnDisabled,
                    pressed && canClearActiveModel && styles.dangerBtnPressed,
                  ]}
                  onPress={() => {
                    void onClearActiveModel();
                  }}
                  disabled={!canClearActiveModel}
                  accessibilityRole="button"
                  accessibilityLabel="Borrar modelo activo">
                  <Text style={[styles.dangerBtnText, !canClearActiveModel && styles.btnTextDisabled]}>
                    Borrar modelo activo
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>

          {showActiveModelSummary && activeTechnicalSummary ? (
            <View style={styles.activeSummaryBox}>
              <Text style={styles.cardSubTitleStrong}>Resumen técnico</Text>
              <Text style={styles.summaryLine}>
                Espirómetro: {activeTechnicalSummary.spirometerLabel} ·{' '}
                {activeTechnicalSummary.spirometerProfileName}
              </Text>
              <Text style={styles.summaryLine}>Modelo: {activeTechnicalSummary.modelKind}</Text>
              <Text style={styles.summaryLine}>
                Activado: {formatTimestamp(activeTechnicalSummary.activatedAt)}
              </Text>
              <Text style={styles.summaryLine}>
                Rango calibrado: {activeTechnicalSummary.calibratedRangeMl}
              </Text>
              <Text style={styles.summaryLine}>
                Protocolo: {activeTechnicalSummary.requiredProtocolSummary}
              </Text>
              <Text style={styles.summaryLine}>
                Repetibilidad: {activeTechnicalSummary.repeatabilitySummary}
              </Text>
              <Text style={styles.summaryLine}>
                Geometría: {activeTechnicalSummary.geometricSummary}
              </Text>
              <Text style={styles.summaryLine}>
                Incertidumbre: {activeTechnicalSummary.uncertaintySummary}
              </Text>
              <Text style={styles.summaryLine}>
                Estado: {activeTechnicalSummary.isReadyForTherapy ? 'Apto para activación' : 'No apto'} ·{' '}
                {activeTechnicalSummary.therapyReadinessReason}
              </Text>
              {activeTechnicalSummary.warnings.length > 0 ? (
                <View style={styles.modelWarningsBox}>
                  <Text style={styles.modelSubLabel}>Advertencias</Text>
                  {activeTechnicalSummary.warnings.map((warning, idx) => (
                    <Text key={`acm-w-${idx}`} style={styles.modelWarningText}>
                      • {warning}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Prueba de estimación en vivo</Text>
          <Text style={styles.cardHint}>
            Lectura en vivo con el modelo activo del espirómetro seleccionado.
          </Text>
          <View
            style={[
              styles.savedBadge,
              volumeEstimateStatus === 'ready'
                ? styles.savedBadgeOk
                : volumeEstimateStatus === 'no_active_model' ||
                    volumeEstimateStatus === 'sensor_disconnected' ||
                    volumeEstimateStatus === 'loading'
                  ? styles.savedBadgeMuted
                  : styles.savedBadgeWarn,
            ]}>
            <Text
              style={
                volumeEstimateStatus === 'ready'
                  ? styles.savedBadgeText
                  : volumeEstimateStatus === 'no_active_model' ||
                      volumeEstimateStatus === 'sensor_disconnected' ||
                      volumeEstimateStatus === 'loading'
                    ? styles.savedBadgeTextMuted
                    : styles.savedBadgeText
              }>
              {liveEstimateStatusLabel}
            </Text>
          </View>
          <View style={styles.resultsGrid}>
            <MetricCell
              label="Espirómetro activo"
              value={volumeEstimationContext.spirometerLabel ?? activeSpirometerDevice?.label ?? '—'}
            />
            <MetricCell
              label="Estado del sensor"
              value={sensorConnectedForEstimate ? 'Conectado' : 'Desconectado'}
            />
            <MetricCell
              label="Modelo activo"
              value={
                volumeEstimationContext.activeModelKind
                  ? activeModelKindUiLabel(volumeEstimationContext.activeModelKind)
                  : '—'
              }
            />
            <MetricCell
              label="Distancia actual"
              value={formatScalar(liveVolumeEstimate.distanceMm)}
              unit="mm"
            />
            <MetricCell
              label="Volumen estimado"
              value={
                liveVolumeEstimate.roundedVolumeMl !== null
                  ? String(liveVolumeEstimate.roundedVolumeMl)
                  : '—'
              }
              unit="mL"
            />
            <MetricCell
              label="U95"
              value={
                liveVolumeEstimate.u95Ml !== null
                  ? `±${liveVolumeEstimate.u95Ml.toFixed(0)}`
                  : '—'
              }
              unit="mL"
            />
            <MetricCell
              label="Intervalo estimado"
              value={
                liveVolumeEstimate.lowerBoundMl !== null &&
                liveVolumeEstimate.upperBoundMl !== null
                  ? `${Math.round(liveVolumeEstimate.lowerBoundMl)} a ${Math.round(liveVolumeEstimate.upperBoundMl)}`
                  : '—'
              }
              unit="mL"
            />
          </View>
          {volumeEstimateStatus !== 'ready' && volumeEstimateMessage ? (
            <Text style={styles.warnHint}>{volumeEstimateMessage}</Text>
          ) : null}
          <Text style={styles.cardHint}>
            Esta prueba no inicia una sesión terapéutica ni registra desempeño del paciente.
          </Text>
        </View>

        {saveSuccessVisible ? (
          <View style={styles.saveSuccessBanner} accessibilityRole="alert">
            <Text style={styles.saveSuccessTitle}>Calibración guardada y activada correctamente.</Text>
            <Text style={styles.saveSuccessHint}>
              El archivo técnico ya está listo para exportarse.
            </Text>
            <Pressable
              onPress={() => setSaveSuccessVisible(false)}
              style={({ pressed }) => [styles.saveSuccessDismiss, pressed && styles.saveSuccessDismissPressed]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar mensaje de éxito">
              <Text style={styles.saveSuccessDismissText}>Entendido</Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.sectionEyebrow}>Exportación técnica</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Archivo técnico de calibración</Text>
          <Text style={styles.cardHint}>
            Exporta puntos, modelo y metadatos para revisión del equipo RESPIRA+.
          </Text>
          <Pressable
            onPress={() => void handleExportCalibrationTechnical()}
            style={({ pressed }) => [
              styles.secondaryBtn,
              savedStatus.kind !== 'saved' && styles.btnDisabled,
              pressed && savedStatus.kind === 'saved' && styles.secondaryBtnPressed,
            ]}
            disabled={savedStatus.kind !== 'saved'}
            accessibilityRole="button"
            accessibilityLabel="Exportar archivo técnico de calibración">
            <Text
              style={[
                styles.secondaryBtnText,
                savedStatus.kind !== 'saved' && styles.btnTextDisabled,
              ]}>
              Exportar archivo técnico de calibración
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setAdvancedStorageExpanded((prev) => !prev)}
          style={({ pressed }) => [styles.techDetailsToggle, pressed && styles.techDetailsTogglePressed]}
          accessibilityRole="button"
          accessibilityLabel="Opciones avanzadas de almacenamiento">
          <Text style={styles.techDetailsToggleText}>Opciones avanzadas</Text>
          <Text style={styles.techDetailsToggleChevron}>{advancedStorageExpanded ? '▾' : '▸'}</Text>
        </Pressable>

        {advancedStorageExpanded ? (
        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Almacenamiento local</Text>
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
            {canSave ? (
              <Pressable
                onPress={() => void onSaveCalibration()}
                style={({ pressed }) => [styles.textBtn, pressed && styles.textBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Guardar sin activar">
                <Text style={styles.textBtnLabel}>Solo guardar puntos</Text>
              </Pressable>
            ) : null}
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
        ) : null}

        {!onClose ? (
          <Pressable
            style={({ pressed }) => [styles.linkBack, pressed && styles.linkBackPressed]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver a conexión del sensor">
            <Text style={styles.linkBackText}>Volver a conexión del sensor</Text>
          </Pressable>
        ) : null}
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
  techHeaderRow: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  backLink: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.lg,
    marginTop: -spacing.sm,
  },
  backLinkPressed: { opacity: 0.65 },
  backLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: wellness.link,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
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
    fontSize: 30,
    fontWeight: '800',
    color: wellness.primaryDark,
    letterSpacing: -0.5,
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
  primaryBtnPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  primaryBtnTextDisabled: { color: 'rgba(255, 255, 255, 0.55)' },
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
  btnDisabled: { opacity: 0.5 },
  btnTextDisabled: { color: wellness.textSecondary },
  destructiveTextBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  destructiveTextBtnPressed: { opacity: 0.75 },
  destructiveTextBtnLabel: { fontSize: 15, fontWeight: '700', color: wellness.errorText },
  saveSuccessBanner: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellness.successBg,
    borderWidth: 1,
    borderColor: wellness.border,
    gap: spacing.xs,
  },
  saveSuccessTitle: { fontSize: 16, fontWeight: '800', color: wellness.primaryDark },
  saveSuccessHint: { fontSize: 14, lineHeight: 20, color: wellness.textSecondary },
  saveSuccessDismiss: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  saveSuccessDismissPressed: { opacity: 0.8 },
  saveSuccessDismissText: { fontSize: 14, fontWeight: '700', color: wellness.link },
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
  identFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: wellness.textSecondary,
    marginTop: spacing.xs,
  },
  identInput: {
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    backgroundColor: wellness.screenBg,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    color: wellness.text,
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  identInputMultiline: {
    minHeight: 72,
    fontSize: 14,
  },
  systemInfoLine: {
    fontSize: 14,
    lineHeight: 20,
    color: wellness.textSecondary,
  },
  systemInfoMuted: {
    fontSize: 13,
    lineHeight: 18,
    color: wellnessColors.textMuted,
    marginTop: spacing.xs,
  },
  chipsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    marginBottom: spacing.xs,
  },
  chipsGroupLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: wellness.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  chipsGroupLabelMuted: {
    fontSize: 12,
    fontWeight: '800',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  chipExtended: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  chipPressed: { opacity: 0.88 },
  chipText: { fontSize: 15, fontWeight: '700', color: wellness.primaryDark },
  chipTextExtended: { color: wellness.textSecondary },
  spirometerSelectorRow: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  spirometerOption: {
    borderWidth: 1,
    borderColor: wellness.tabBarBorder,
    borderRadius: wellnessRadii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: wellness.card,
  },
  spirometerOptionSelected: {
    borderColor: wellness.primaryDark,
    backgroundColor: wellness.screenBgAlt,
  },
  spirometerOptionPressed: { opacity: 0.9 },
  spirometerOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: wellness.text,
  },
  spirometerOptionLabelSelected: {
    color: wellness.primaryDark,
    fontWeight: '700',
  },
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
  modelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  modelStatusPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1,
  },
  modelStatusPillOk: {
    backgroundColor: wellness.successBg,
    borderColor: wellness.border,
  },
  modelStatusPillWarn: {
    backgroundColor: wellness.errorBg,
    borderColor: wellness.borderStrong,
  },
  modelStatusPillMuted: {
    backgroundColor: wellness.screenBg,
    borderColor: wellness.border,
  },
  modelStatusPillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  modelStatusPillTextOk: { color: wellness.primaryDark },
  modelStatusPillTextWarn: { color: wellness.errorText },
  modelStatusPillTextMuted: { color: wellness.textSecondary },
  modelEquationBox: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    backgroundColor: wellness.screenBg,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  modelEquationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  modelEquationText: {
    fontSize: 14,
    fontWeight: '700',
    color: wellness.text,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  modelWarningsBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: wellness.errorBg,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    gap: 4,
  },
  activeSummaryBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: wellnessRadii.card,
    backgroundColor: wellness.screenBgAlt,
    borderWidth: 1,
    borderColor: wellness.tabBarBorder,
    gap: spacing.xs,
  },
  modelWarningText: {
    fontSize: 13,
    lineHeight: 18,
    color: wellness.errorText,
    fontWeight: '600',
  },
  modelDisclaimer: {
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
    color: wellness.textSecondary,
    fontStyle: 'italic',
  },
  modelCoverageHint: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  modelSectionHeader: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  modelSectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.text,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  modelSectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: wellness.textSecondary,
  },
  modelSubLabel: {
    marginTop: spacing.md,
    fontSize: 11,
    fontWeight: '700',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modelReason: {
    marginTop: 0,
    fontSize: 14,
    lineHeight: 19,
    color: wellness.text,
    fontWeight: '600',
  },
  modelSecondaryReason: {
    marginTop: 0,
    fontSize: 13,
    lineHeight: 18,
    color: wellness.textSecondary,
    fontWeight: '600',
  },
  protocolVolCol: { flex: 1.2 },
  protocolRepCol: { flex: 0.8, textAlign: 'right' },
  chipDisabled: { opacity: 0.4 },
  volumeInputLocked: { opacity: 0.85 },
  retakeBanner: {
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.cardLarge,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: wellness.primary,
    ...wellnessShadows.cardPress,
  },
  retakeBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: wellness.primaryDark,
    marginBottom: spacing.xs,
  },
  retakeBannerBody: {
    fontSize: 14,
    color: wellness.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  retakeBannerProgress: {
    fontSize: 16,
    fontWeight: '800',
    color: wellness.text,
    marginBottom: spacing.md,
  },
  retakeBtn: { marginTop: spacing.sm },
  repetTable: { minWidth: 560, paddingBottom: spacing.xs },
  repetTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: wellness.border,
    gap: 4,
  },
  repetTableHeadRow: {
    borderBottomWidth: 1,
    borderBottomColor: wellness.borderStrong,
    paddingBottom: spacing.sm,
  },
  repetCell: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.text,
  },
  repetColVol: { width: 72 },
  repetColN: { width: 28, textAlign: 'center' },
  repetColMean: { width: 78 },
  repetColSd: { width: 72 },
  repetColRange: { width: 72 },
  repetColState: {
    width: 88,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 28,
  },
  repetColAction: { width: 130, paddingLeft: 4, justifyContent: 'center', minHeight: 28 },
  repetBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: wellnessRadii.pill,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  repetBadgeOk: { backgroundColor: wellness.successBg },
  repetBadgeModerate: { backgroundColor: wellness.screenBg },
  repetBadgeHigh: { backgroundColor: wellness.errorBg, borderColor: wellness.borderStrong },
  repetBadgeText: { fontSize: 11, fontWeight: '800', color: wellness.primaryDark },
  repetBadgeTextHigh: { color: wellness.errorText },
  repetRepeatBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.primary,
    borderWidth: 1,
    borderColor: wellness.borderStrong,
  },
  repetRepeatBtnPressed: { opacity: 0.9 },
  repetRepeatBtnText: { fontSize: 11, fontWeight: '800', color: wellness.primaryDark },
  repetActionMuted: { fontSize: 12, fontWeight: '600', color: wellness.textSecondary },
  uncertTable: { minWidth: 520, paddingBottom: spacing.xs, marginTop: spacing.xs },
  uncertTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: wellness.border,
    gap: 4,
  },
  uncertTableHeadRow: {
    borderBottomWidth: 1,
    borderBottomColor: wellness.borderStrong,
    paddingBottom: spacing.sm,
  },
  uncertCell: {
    fontSize: 11,
    fontWeight: '600',
    color: wellness.text,
  },
  uncertColVol: { width: 44 },
  uncertColN: { width: 24, textAlign: 'center' },
  uncertColSd: { width: 56 },
  uncertColUa: { width: 44 },
  uncertColSens: { width: 48 },
  uncertColUc: { width: 40 },
  uncertColU95: { width: 52 },
  uncertColState: { width: 72 },
  uncertComponentRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: wellness.border,
  },
  uncertComponentHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  uncertComponentBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: wellness.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  uncertComponentBadgePrimary: {
    fontSize: 10,
    fontWeight: '800',
    color: wellness.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  uncertComponentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: wellness.text,
  },
  uncertComponentValue: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.primaryDark,
    marginTop: 2,
  },
  uncertComponentDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: wellness.textSecondary,
    marginTop: 2,
  },
  geomTable: { minWidth: 420, marginTop: spacing.sm },
  geomTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: wellness.border,
    gap: 4,
  },
  geomTableHeadRow: {
    borderBottomWidth: 1,
    borderBottomColor: wellness.borderStrong,
  },
  geomCell: {
    fontSize: 12,
    fontWeight: '600',
    color: wellness.text,
  },
  geomColRange: { width: 108 },
  geomColDelta: { width: 88 },
  geomColExpected: { width: 88 },
  geomColPct: { width: 64 },
  geomColState: { width: 72 },
  segmentColRange: { flex: 1.2 },
  segmentColDist: { flex: 1, textAlign: 'right' },
  segmentColSlope: { flex: 1, textAlign: 'right' },
  calibSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  calibSummaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: wellnessColors.textPrimary,
  },
  calibMetricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  calibLastUpdated: {
    fontSize: 12,
    color: wellnessColors.textMuted,
    marginTop: spacing.xs,
  },
  techDetailsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: wellness.card,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    marginBottom: spacing.md,
  },
  techDetailsTogglePressed: { opacity: 0.94 },
  techDetailsToggleText: { fontSize: 15, fontWeight: '700', color: wellness.primaryDark },
  techDetailsToggleChevron: { fontSize: 16, fontWeight: '800', color: wellness.textSecondary },
  techExportSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  techExportBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: wellnessRadii.card,
    borderWidth: 1,
    borderColor: wellness.border,
    alignItems: 'center',
  },
  techExportBtnPressed: { opacity: 0.85 },
  techExportBtnText: { fontSize: 14, fontWeight: '600', color: wellness.textSecondary },
  techExportHint: {
    fontSize: 12,
    color: wellness.textSecondary,
    textAlign: 'center',
  },
});
