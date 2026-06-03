import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import {
    buildActiveCalibrationModel,
    buildCalibrationProfile,
    buildLinearCalibrationModel,
    buildPiecewiseLinearCalibrationModel,
    CALIBRATION_PROFILE_VERSION,
    clearCalibrationProfileForSpirometer,
    computeCalibrationUncertaintySummary,
    computeGeometricScaleReport,
    computeGlobalDistanceRange,
    computeRepeatabilityReport,
    computeRequiredCalibrationCoverage,
    computeSegmentReport,
    computeVolumeCoverage,
    computeVolumeSummaries,
    createDefaultCalibratedDeviceIdentification,
    determineVolumeDistanceRelation,
    isActiveCalibrationModelStale,
    mergeCalibratedDeviceIdentification,
    MIN_RELIABLE_SENSOR_DISTANCE_MM,
    MIN_REPETITIONS_PER_REQUIRED_VOLUME,
    recommendCalibrationModel,
    saveActiveCalibrationModelForSpirometer,
    saveCalibrationProfileForSpirometer,
    type ActiveCalibrationModel,
    type CalibratedDeviceIdentification,
    type CalibrationCapturePoint,
    type CalibrationModel,
    type CalibrationModelRecommendation,
    type CalibrationModelStatus,
    type CalibrationProfile,
    type CalibrationRepeatabilityReport,
    type CalibrationSegmentReport,
    type CalibrationUncertaintySummary,
    type GlobalDistanceRange,
    type VolumeCalibrationSummary,
    type VolumeCoverage,
    type VolumeDistanceRelation,
} from '@/src/modules/device/calibration';
import {
    useTechnicalCaptureSensorBuffer,
    type BufferStats,
    type SignalStability,
} from '@/src/modules/device/screens/use-technical-capture-sensor-buffer';
import {
    getExtendedRangeMinVolumeMl,
    getExtendedVolumeChipsMl,
    getRecommendedVolumeChipsMl,
    listTechnicalCalibrationSpirometerOptions,
    type SpirometerDevice,
    type SpirometerProfile,
    type TechnicalSpirometerOption,
} from '@/src/modules/device/spirometer';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import type { SensorConnectionStatus } from '@/src/modules/device/types/sensor-reading';
import type { CalibrationTechnicalExportContext } from '@/src/modules/export/formatters/calibration-technical-export-context';
import { exportCalibrationTechnicalCsv } from '@/src/modules/export/services/calibration-technical-export-service';
import { spacing } from '@/src/shared/theme/spacing';
import {
    wellness,
    wellnessColors,
    wellnessRadii,
    wellnessShadows,
} from '@/src/shared/theme/wellness-theme';
import { AppCard } from '@/src/shared/ui/AppCard';
import { AppTopBar } from '@/src/shared/ui/AppTopBar';
import { MetricTile } from '@/src/shared/ui/MetricTile';
import { SectionHeader } from '@/src/shared/ui/SectionHeader';
import { StatusPill } from '@/src/shared/ui/StatusPill';
import { getErrorMessage } from '@/src/shared/utils/get-error-message';

const MIN_SAMPLES_TO_REGISTER = 5;
/** A partir de esta desviación estándar marcamos la señal como variable y avisamos. */
const STABILITY_VARIABLE_STD_MM = 5;
/** Por debajo de esto consideramos la señal estable visualmente. */
const STABILITY_STABLE_STD_MM = 2.5;

function newCaptureId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `cap-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function statusLabel(state: SensorConnectionStatus): string {
  switch (state) {
    case 'idle':
      return 'En espera';
    case 'connecting':
      return 'Conectando';
    case 'connected':
    case 'receiving':
      return 'Conectado';
    case 'error':
      return 'Error';
    case 'disconnected':
      return 'Desconectado';
    default:
      return state;
  }
}

const RESPIRA_SPIROMETER_DISPLAY = 'MediMetrics MV1811-3';
const RESPIRA_SPIROMETER_CAPACITY_ML = 3000;

function parseVolumeMlInput(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function classifyStabilityForUi(stats: BufferStats | null): SignalStability {
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

type SavedStatus =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'saved'; updatedAt: number; pointsCount: number }
  | { kind: 'unsaved' }
  | { kind: 'corrupt'; errorMessage: string };

export type SensorCalibrationTechnicalCaptureScreenProps = {
  onClose?: () => void;
};

export function SensorCalibrationTechnicalCaptureScreen(
  _props: SensorCalibrationTechnicalCaptureScreenProps = {},
) {
  const [volumeInput, setVolumeInput] = useState('');
  const [points, setPoints] = useState<CalibrationCapturePoint[]>([]);
  const [savedProfile, setSavedProfile] = useState<CalibrationProfile | null>(null);
  const [savedStatus, setSavedStatus] = useState<SavedStatus>({ kind: 'none' });
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
  const technicalSpirometerOptions = useMemo(
    () => listTechnicalCalibrationSpirometerOptions(),
    [],
  );
  const [activeCalibrationModel, setActiveCalibrationModel] =
    useState<ActiveCalibrationModel | null>(null);
  const [activeModelBusy, setActiveModelBusy] = useState<'idle' | 'activating' | 'clearing'>(
    'idle',
  );
  const [advancedDetailsExpanded, setAdvancedDetailsExpanded] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);

  const isRetakeMode = retakeVolumeMl !== null;

  const {
    status,
    mode,
    lastReading,
    connect,
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

  const { bufferStats, stability: rawStability, getBufferStatsSnapshot, clearBuffer } =
    useTechnicalCaptureSensorBuffer(lastReading, mode, status);
  const stability = useMemo(
    () => classifyStabilityForUi(bufferStats) ?? rawStability,
    [bufferStats, rawStability],
  );
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
      activeModel: null,
      sensorStatus: status,
      filterLabel: null,
    }),
    [
      coverage,
      geometricReport,
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

  const captureProgressSummary = useMemo(() => {
    const volumesWithPoints = new Set(points.map((p) => p.volumeMl));
    const requiredTotal = requiredVolumesMl.length;
    const requiredRegistered =
      requiredTotal > 0
        ? requiredVolumesMl.filter((v) => volumesWithPoints.has(v)).length
        : volumesWithPoints.size;
    const lastPoint =
      points.length > 0
        ? [...points].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0]
        : null;
    return {
      volumesLabel:
        requiredTotal > 0 ? `${requiredRegistered} de ${requiredTotal}` : String(volumesWithPoints.size),
      totalRepetitions: points.length,
      lastVolumeMl: lastPoint?.volumeMl ?? null,
      hasPoints: points.length > 0,
    };
  }, [points, requiredVolumesMl]);

  const applyTechnicalSpirometerOption = useCallback((option: TechnicalSpirometerOption) => {
    setActiveSpirometerDevice((prev) =>
      prev?.id === option.device.id ? prev : option.device,
    );
    setActiveSpirometerProfile((prev) =>
      prev?.id === option.profile.id ? prev : option.profile,
    );
    setDeviceIdentification((prev) => {
      const next = mergeCalibratedDeviceIdentification({
        ...prev,
        internalLabel: option.device.label,
        nominalCapacityMl: option.profile.maxVolumeMl,
        model: option.profile.maxVolumeMl >= 5000 ? 'MV1811-5' : prev.model,
      });
      if (
        prev.internalLabel === next.internalLabel &&
        prev.nominalCapacityMl === next.nominalCapacityMl &&
        prev.model === next.model
      ) {
        return prev;
      }
      return next;
    });
    setPoints([]);
    setSavedProfile(null);
    setSavedStatus({ kind: 'none' });
    setHasUnsavedChanges(false);
    setActiveCalibrationModel(null);
    setStorageMessage(null);
  }, []);

  const didInitTechnicalRef = useRef(false);
  useEffect(() => {
    if (didInitTechnicalRef.current) return;
    didInitTechnicalRef.current = true;
    const defaultOption = technicalSpirometerOptions[0] ?? null;
    if (defaultOption) {
      applyTechnicalSpirometerOption(defaultOption);
    }
    setSpirometerReady(true);
  }, [applyTechnicalSpirometerOption, technicalSpirometerOptions]);

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setStorageMessage(null);
  }, []);

  const canExportTechnicalCsv = useMemo(() => {
    if (!liveProfile || !linearModel) return false;
    const validPoints = liveProfile.points.filter((p) => p.distanceValid);
    const uniqueVolumes = new Set(validPoints.map((p) => p.volumeMl));
    return (
      uniqueVolumes.size >= 2 &&
      typeof linearModel.coefficients.slope === 'number' &&
      typeof linearModel.coefficients.intercept === 'number'
    );
  }, [liveProfile, linearModel]);

  const handleExportCalibrationTechnical = useCallback(async () => {
    if (!liveProfile || points.length < 2) {
      Alert.alert(
        'Exportación',
        'Se requieren al menos 2 puntos para calcular regresión. Se recomiendan 5 o más.',
      );
      return;
    }
    if (!canExportTechnicalCsv || !linearModel) {
      Alert.alert(
        'Exportación',
        'Aún no hay un modelo lineal válido. Captura más puntos con señal válida.',
      );
      return;
    }
    const profileForExport: CalibrationProfile = {
      ...liveProfile,
      id: `technical-export-${Date.now()}`,
      deviceIdentification,
      updatedAt: Date.now(),
    };
    try {
      const result = await exportCalibrationTechnicalCsv({
        profile: profileForExport,
        firmwareVersion: lastReading?.firmwareVersion,
        deviceId: lastReading?.deviceId,
        filterLabel: lastReading?.filter ?? null,
        sensorStatus: status,
        exportSessionOnly: true,
        technicalContext: {
          ...technicalExportContext,
          linearModel,
          activeModel: null,
        },
      });
      if (!result.ok) {
        Alert.alert(
          'No se pudo exportar el CSV técnico',
          'reason' in result ? result.message : 'Error desconocido',
        );
      }
    } catch (error) {
      console.warn('[TECH_CALIB] export failed', error);
      Alert.alert('No se pudo exportar el CSV técnico', getErrorMessage(error));
    }
  }, [
    canExportTechnicalCsv,
    deviceIdentification,
    lastReading?.deviceId,
    lastReading?.filter,
    lastReading?.firmwareVersion,
    linearModel,
    liveProfile,
    points.length,
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
    const stats = getBufferStatsSnapshot() ?? bufferStats;
    if (!canRegister || volumeMl === null || !stats || isRegistering) return;
    setIsRegistering(true);
    hapticLight();
    if (retakeVolumeMl !== null && volumeMl === retakeVolumeMl) {
      if (retakeDraftPoints.length >= MIN_REPETITIONS_PER_REQUIRED_VOLUME) return;
      setRetakeDraftPoints((prev) => {
        const next: CalibrationCapturePoint = {
          id: newCaptureId(),
          volumeMl,
          distanceMm: stats.avgDistanceMm,
          rawDistanceMm: stats.avgRawDistanceMm,
          distanceValid: true,
          source: stats.latestSource,
          timestamp: stats.latestTimestamp,
          repetitionNumber: prev.length + 1,
          createdAt: Date.now(),
          sampleCount: stats.sampleCount,
          minSampleDistanceMm: stats.minDistanceMm,
          maxSampleDistanceMm: stats.maxDistanceMm,
          stdDistanceMm: stats.stdDistanceMm,
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
        distanceMm: stats.avgDistanceMm,
        rawDistanceMm: stats.avgRawDistanceMm,
        distanceValid: true,
        source: stats.latestSource,
        timestamp: stats.latestTimestamp,
        repetitionNumber: sameVol + 1,
        createdAt: Date.now(),
        sampleCount: stats.sampleCount,
        minSampleDistanceMm: stats.minDistanceMm,
        maxSampleDistanceMm: stats.maxDistanceMm,
        stdDistanceMm: stats.stdDistanceMm,
      };
      return [...prev, next];
    });
    markDirty();
    setTimeout(() => setIsRegistering(false), 280);
  }, [
    bufferStats,
    canRegister,
    getBufferStatsSnapshot,
    isRegistering,
    markDirty,
    retakeDraftPoints.length,
    retakeVolumeMl,
    volumeMl,
  ]);

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
    clearBuffer();
    markDirty();
  }, [clearBuffer, markDirty, points.length, retakeVolumeMl]);

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

  const isConnecting = status === 'connecting';
  const isOnline = status === 'connected' || status === 'receiving';

  const showPreliminaryResult = points.length >= 2 && linearModel !== null;
  const preliminaryReadyLabel = useMemo(() => {
    if (!recommendation) return 'Calculando…';
    if (recommendation.isReadyForTherapy) return 'Listo para activar';
    if (recommendation.requiredProtocol.meetsRequiredProtocol) return 'Revisar criterios';
    return 'Faltan puntos';
  }, [recommendation]);

  const preliminaryReadyTone = useMemo((): 'success' | 'warning' | 'neutral' => {
    if (!recommendation) return 'neutral';
    if (recommendation.isReadyForTherapy) return 'success';
    if (recommendation.requiredProtocol.meetsRequiredProtocol) return 'warning';
    return 'warning';
  }, [recommendation]);

  const protocolVolumesCoveredLabel = useMemo(() => {
    const total = requiredVolumesMl.length;
    if (total === 0) return '—';
    return `${requiredCoverage.presentRequiredVolumes.length} / ${total}`;
  }, [requiredCoverage.presentRequiredVolumes.length, requiredVolumesMl.length]);

  const protocolComplete = recommendation?.requiredProtocol.meetsRequiredProtocol ?? false;

  const repeatabilityConcernVolumes = useMemo(
    () =>
      repeatability.perVolume.filter(
        (row) => row.warningLevel === 'high' || row.warningLevel === 'moderate',
      ),
    [repeatability.perVolume],
  );

  const uncertaintyHasData =
    uncertaintySummary !== null &&
    uncertaintySummary.reports.length > 0 &&
    !uncertaintySummary.reports.every((r) => r.status === 'insufficient_data');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppTopBar showBackButton showProfileButton={false} backFallbackHref="/sensor-connection" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <SectionHeader
          title="Nueva calibración del espirómetro"
          subtitle="Registra las marcas de volumen y la distancia del sensor para ajustar el modelo de medición."
        />

        <AppCard style={styles.sessionCard}>
          <View style={styles.calibSummaryHeader}>
            <Text style={styles.calibSummaryTitle}>Sesión en curso</Text>
            <StatusPill
              label={
                savedStatus.kind === 'loading'
                  ? 'Cargando…'
                  : hasUnsavedChanges
                    ? 'Cambios sin guardar'
                    : savedStatus.kind === 'saved'
                      ? 'Guardada'
                      : savedStatus.kind === 'corrupt'
                        ? 'Revisar'
                        : 'En captura'
              }
              tone={
                savedStatus.kind === 'saved' && !hasUnsavedChanges
                  ? 'success'
                  : savedStatus.kind === 'corrupt'
                    ? 'danger'
                    : hasUnsavedChanges
                      ? 'warning'
                      : 'neutral'
              }
              size="sm"
            />
          </View>
          <View style={styles.calibMetricsRow}>
            <MetricTile
              label="Puntos en sesión"
              value={String(points.length)}
              tone={points.length > 0 ? 'success' : 'default'}
              size="compact"
            />
            <MetricTile
              label="Volúmenes"
              value={captureProgressSummary.volumesLabel}
              helper={requiredVolumesMl.length > 0 ? 'requeridos' : undefined}
              tone="default"
              size="compact"
            />
          </View>
          {savedStatus.kind === 'saved' && savedStatus.updatedAt && !hasUnsavedChanges ? (
            <Text style={styles.calibLastUpdated}>
              Última guardada:{' '}
              {new Date(savedStatus.updatedAt).toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          ) : null}
        </AppCard>

        <Text style={styles.sectionEyebrow}>Identificación</Text>

        {spirometerReady && activeSpirometerProfile ? (
          <View style={styles.card}>
            <Text style={styles.cardTitleStrong}>Espirómetro</Text>
            <Text style={styles.spirometerDisplayLine}>
              {RESPIRA_SPIROMETER_DISPLAY} · {RESPIRA_SPIROMETER_CAPACITY_ML} mL
            </Text>
            <Text style={styles.cardHint}>
              Marcas de {activeSpirometerProfile.operativeMinVolumeMl} mL a{' '}
              {activeSpirometerProfile.maxVolumeMl} mL.
            </Text>
            <Text style={styles.identFieldLabel}>Fecha de calibración (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.identInput}
              value={deviceIdentification.calibrationDateIso}
              onChangeText={(text) => {
                setDeviceIdentification((prev) => ({ ...prev, calibrationDateIso: text }));
                markDirty();
              }}
              placeholder="2026-06-02"
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
            <Text style={styles.identFieldLabel}>Notas</Text>
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
        ) : (
          <View style={styles.card}>
            <ActivityIndicator size="small" color={wellness.primaryDark} />
            <Text style={styles.cardHint}>Preparando sesión…</Text>
          </View>
        )}

        <Text style={styles.sectionEyebrow}>Captura</Text>

        <View style={styles.heroCard}>
          <View style={styles.captureLiveRow}>
            <View style={styles.captureLiveCol}>
              <Text style={styles.heroEyebrow}>Distancia filtrada</Text>
              <Text style={styles.captureDistanceValue}>
                {distanceIsFinite ? `${(distanceMm as number).toFixed(1)}` : '—'}
              </Text>
              <Text style={styles.captureDistanceUnit}>mm</Text>
            </View>
            <View style={styles.captureLiveCol}>
              <Text style={styles.heroEyebrow}>Sensor</Text>
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
                <Text style={styles.captureSensorStatus}>{statusLabel(status)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.pillRow}>
            <View
              style={[
                styles.pill,
                stability === 'stable'
                  ? styles.pillOk
                  : stability === 'variable'
                    ? styles.pillWarn
                    : stability === 'insufficient'
                      ? null
                      : styles.pillOk,
              ]}>
              <Text
                style={
                  stability === 'stable' || stability === 'variable' || stability === 'acceptable'
                    ? styles.pillText
                    : styles.pillTextMuted
                }>
                {stability === 'insufficient' && !inLiveMode
                  ? 'Sin señal'
                  : stabilityLabel(stability)}
              </Text>
            </View>
            <View style={[styles.pill, liveSignalOk ? styles.pillOk : styles.pillWarn]}>
              <Text style={styles.pillText}>{liveSignalOk ? 'Señal válida' : 'Señal no válida'}</Text>
            </View>
          </View>
          {!isOnline && !isConnecting ? (
            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                styles.captureConnectBtn,
                pressed && styles.secondaryBtnPressed,
              ]}
              onPress={() => {
                hapticLight();
                connect();
              }}
              accessibilityRole="button"
              accessibilityLabel="Conectar sensor">
              <Text style={styles.secondaryBtnText}>Conectar sensor</Text>
            </Pressable>
          ) : null}
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
          <Text style={styles.cardTitleStrong}>Volumen objetivo</Text>
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

        <Text style={styles.sectionEyebrow}>Progreso</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitleStrong}>Progreso de la sesión</Text>
          {captureProgressSummary.hasPoints ? (
            <>
              <Text style={styles.captureProgressLine}>
                Volúmenes registrados: {captureProgressSummary.volumesLabel}
              </Text>
              <Text style={styles.captureProgressLine}>
                Repeticiones capturadas: {captureProgressSummary.totalRepetitions}
              </Text>
              {captureProgressSummary.lastVolumeMl !== null ? (
                <Text style={styles.captureProgressLine}>
                  Último volumen registrado: {captureProgressSummary.lastVolumeMl} mL
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptyText}>
              Aún no hay mediciones. Conecta el sensor, valida la señal y registra el primer punto.
            </Text>
          )}
          <Text style={styles.captureProgressFootnote}>
            Los datos completos se incluirán en el archivo técnico de calibración.
          </Text>
        </View>

        {showPreliminaryResult && linearModel ? (
          <>
            <Text style={styles.sectionEyebrow}>Resultado preliminar</Text>
            <View style={styles.card}>
              <View style={styles.preliminaryHeader}>
                <Text style={styles.cardTitleStrong}>Modelo lineal</Text>
                <StatusPill
                  label={preliminaryReadyLabel}
                  tone={preliminaryReadyTone}
                  size="sm"
                />
              </View>
              {linearModel.status === 'valid' &&
              linearModel.coefficients.slope !== undefined &&
              linearModel.coefficients.intercept !== undefined ? (
                <Text style={styles.preliminaryEquation}>
                  V = {formatSlope(linearModel.coefficients.slope)} × distancia −{' '}
                  {formatIntercept(Math.abs(linearModel.coefficients.intercept))} mL
                </Text>
              ) : (
                <Text style={styles.cardHint}>{modelStatusLabel(linearModel.status)}</Text>
              )}
              <View style={styles.preliminaryStatsRow}>
                <MetricTile
                  label="R²"
                  value={formatR2(linearModel.metrics.rSquared)}
                  tone="default"
                  size="compact"
                />
                <MetricTile
                  label="MAE"
                  value={formatMetricMl(linearModel.metrics.maeMl)}
                  helper="mL"
                  tone="default"
                  size="compact"
                />
                <MetricTile
                  label="RMSE"
                  value={formatMetricMl(linearModel.metrics.rmseMl)}
                  helper="mL"
                  tone="default"
                  size="compact"
                />
              </View>
              <View style={styles.preliminaryStatsRow}>
                <MetricTile
                  label="Pendiente"
                  value={formatSlope(linearModel.coefficients.slope)}
                  helper="mL/mm"
                  tone="default"
                  size="compact"
                />
                <MetricTile
                  label="Intercepto"
                  value={formatIntercept(linearModel.coefficients.intercept)}
                  helper="mL"
                  tone="default"
                  size="compact"
                />
                <MetricTile
                  label="Err. máx."
                  value={formatMetricMl(linearModel.metrics.maxAbsErrorMl)}
                  helper="mL"
                  tone="default"
                  size="compact"
                />
              </View>
              {!canActivateRecommendedModel && activationBlockReason ? (
                <Text style={styles.cardHint}>{activationBlockReason}</Text>
              ) : null}
              {activeModelIsStale && activeCalibrationModel ? (
                <Text style={styles.cardHint}>
                  El modelo activo no coincide con la calibración guardada. Usa «Guardar y activar» para
                  actualizarlo.
                </Text>
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionEyebrow}>Finalizar</Text>

        <View style={styles.card}>
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
                style={[styles.primaryBtnText, !canSaveAndActivate && styles.btnTextDisabled]}>
                Guardar y activar calibración
              </Text>
            </Pressable>
            {!canSaveAndActivate && activationBlockReason && !showPreliminaryResult ? (
              <Text style={styles.cardHint}>{activationBlockReason}</Text>
            ) : null}
            <Pressable
              onPress={() => void handleExportCalibrationTechnical()}
              style={({ pressed }) => [
                styles.secondaryBtn,
                !canExportTechnicalCsv && styles.btnDisabled,
                pressed && canExportTechnicalCsv && styles.secondaryBtnPressed,
              ]}
              disabled={!canExportTechnicalCsv}
              accessibilityRole="button"
              accessibilityLabel="Descargar CSV técnico de calibración">
              <Text
                style={[styles.secondaryBtnText, !canExportTechnicalCsv && styles.btnTextDisabled]}>
                Descargar CSV técnico
              </Text>
            </Pressable>
            {!canExportTechnicalCsv ? (
              <Text style={styles.cardHint}>
                Captura al menos 2 volúmenes distintos con señal válida para habilitar la exportación.
              </Text>
            ) : null}
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
                Borrar calibración
              </Text>
            </Pressable>
            {storageMessage ? <Text style={styles.cardHint}>{storageMessage}</Text> : null}
            {points.length > 0 || retakeVolumeMl !== null ? (
              <>
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
                <Pressable
                  onPress={() => void onCancelCalibrationInProgress()}
                  style={({ pressed }) => [
                    styles.destructiveTextBtn,
                    pressed && styles.destructiveTextBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar calibración">
                  <Text style={styles.destructiveTextBtnLabel}>Cancelar calibración</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>

        {saveSuccessVisible ? (
          <View style={styles.saveSuccessBanner} accessibilityRole="alert">
            <Text style={styles.saveSuccessTitle}>Calibración guardada y activada correctamente.</Text>
            <Text style={styles.saveSuccessHint}>
              Puedes descargar el CSV técnico cuando quieras; no es necesario guardar antes.
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

        <Pressable
          onPress={() => setAdvancedDetailsExpanded((prev) => !prev)}
          style={({ pressed }) => [styles.techDetailsToggle, pressed && styles.techDetailsTogglePressed]}
          accessibilityRole="button"
          accessibilityLabel={
            advancedDetailsExpanded
              ? 'Ocultar detalles avanzados de calibración'
              : 'Detalles avanzados de calibración'
          }>
          <Text style={styles.techDetailsToggleText}>
            {advancedDetailsExpanded
              ? 'Ocultar detalles avanzados de calibración'
              : 'Detalles avanzados de calibración'}
          </Text>
          <Text style={styles.techDetailsToggleChevron}>{advancedDetailsExpanded ? '▾' : '▸'}</Text>
        </Pressable>

        {advancedDetailsExpanded ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitleStrong}>Protocolo de calibración</Text>
              <Text style={styles.cardHint}>
                Revisión rápida de los puntos necesarios para activar.
              </Text>
              <View style={styles.preliminaryStatsRow}>
                <MetricTile
                  label="Puntos válidos"
                  value={
                    recommendation
                      ? `${recommendation.requiredProtocol.totalValidRequiredPoints} / ${recommendation.requiredProtocol.minimumRequiredPoints}`
                      : '—'
                  }
                  tone="default"
                  size="compact"
                />
                <MetricTile
                  label="Volúmenes cubiertos"
                  value={protocolVolumesCoveredLabel}
                  tone="default"
                  size="compact"
                />
                <MetricTile
                  label="Estado"
                  value={protocolComplete ? 'Completo' : 'Incompleto'}
                  tone={protocolComplete ? 'success' : 'warning'}
                  size="compact"
                />
              </View>
              {coverage?.coveredMinMl != null && coverage.coveredMaxMl != null ? (
                <Text style={styles.summaryLine}>
                  Rango calibrado: {coverage.coveredMinMl}–{coverage.coveredMaxMl} mL · Recomendado
                  cubierto: {coverage.coversRecommended ? 'Sí' : 'No'}
                </Text>
              ) : null}
              {requiredCoverage.missingRequiredVolumes.length > 0 ? (
                <Text style={styles.warnHint}>
                  Faltan mediciones en:{' '}
                  {requiredCoverage.missingRequiredVolumes.map((v) => `${v}`).join(', ')} mL.
                </Text>
              ) : null}
              {requiredCoverage.requiredVolumesWithLowRepetitions.length > 0 ? (
                <Text style={styles.warnHint}>
                  Repeticiones insuficientes en:{' '}
                  {requiredCoverage.requiredVolumesWithLowRepetitions.map((v) => `${v}`).join(', ')}{' '}
                  mL.
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitleStrong}>Incertidumbre resumida</Text>
              {uncertaintyHasData && uncertaintySummary && recommendation ? (
                <>
                  <View style={styles.preliminaryStatsRow}>
                    <MetricTile
                      label="U95 promedio"
                      value={formatUncertaintyMl(uncertaintySummary.averageU95Ml)}
                      helper="mL"
                      tone="default"
                      size="compact"
                    />
                    <MetricTile
                      label="U95 máximo"
                      value={formatUncertaintyMl(uncertaintySummary.maxU95Ml)}
                      helper="mL"
                      tone="default"
                      size="compact"
                    />
                    <MetricTile
                      label="Estado"
                      value={uncertaintyOverallLabel(
                        uncertaintySummary.reports,
                        recommendation.uncertainty.hasAcceptableUncertainty,
                      )}
                      tone={
                        uncertaintyOverallLabel(
                          uncertaintySummary.reports,
                          recommendation.uncertainty.hasAcceptableUncertainty,
                        ) === 'Aceptable'
                          ? 'success'
                          : 'warning'
                      }
                      size="compact"
                    />
                  </View>
                  <Text style={styles.cardHint}>
                    El detalle por volumen se conserva en el CSV técnico.
                  </Text>
                </>
              ) : (
                <Text style={styles.cardHint}>
                  La incertidumbre se calcula cuando hay suficientes puntos.
                </Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitleStrong}>Repetibilidad</Text>
              {!repeatability.hasPoints ? (
                <Text style={styles.cardHint}>
                  La repetibilidad se evaluará conforme captures más puntos.
                </Text>
              ) : repeatabilityConcernVolumes.length === 0 ? (
                <Text style={styles.cardHint}>
                  Las mediciones capturadas son consistentes.
                </Text>
              ) : (
                <View style={styles.rowGap}>
                  {repeatabilityConcernVolumes.map((row) => (
                    <View key={`rep-concern-${row.volumeMl}`} style={styles.repeatabilityActionRow}>
                      <View style={styles.repeatabilityActionInfo}>
                        <Text style={styles.repeatabilityActionVolume}>{row.volumeMl} mL</Text>
                        <Text style={styles.repeatabilityActionLabel}>
                          {row.warningLevel === 'high' ? 'Variación alta' : 'Variación moderada'}
                        </Text>
                      </View>
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
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>

        </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
    gap: spacing.sm,
  },
  sessionCard: {
    gap: spacing.sm,
  },
  spirometerDisplayLine: {
    fontSize: 17,
    fontWeight: '700',
    color: wellness.text,
    letterSpacing: -0.2,
    marginBottom: spacing.xs,
  },
  captureLiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  captureLiveCol: {
    flex: 1,
  },
  captureDistanceValue: {
    fontSize: 36,
    fontWeight: '800',
    color: wellness.primaryDark,
    letterSpacing: -1,
    lineHeight: 40,
  },
  captureDistanceUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: wellness.textSecondary,
    marginTop: 2,
  },
  captureSensorStatus: {
    fontSize: 18,
    fontWeight: '700',
    color: wellness.primaryDark,
  },
  captureConnectBtn: {
    marginTop: spacing.md,
  },
  preliminaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  preliminaryEquation: {
    fontSize: 14,
    fontWeight: '600',
    color: wellness.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  preliminaryStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
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
  captureProgressLine: {
    fontSize: 15,
    lineHeight: 22,
    color: wellness.text,
    marginTop: spacing.xs,
  },
  captureProgressFootnote: {
    fontSize: 13,
    lineHeight: 19,
    color: wellness.textSecondary,
    marginTop: spacing.md,
  },
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
  repeatabilityActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: wellness.border,
  },
  repeatabilityActionInfo: { flex: 1, gap: 2 },
  repeatabilityActionVolume: { fontSize: 15, fontWeight: '800', color: wellness.text },
  repeatabilityActionLabel: { fontSize: 13, fontWeight: '600', color: wellness.textSecondary },
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
