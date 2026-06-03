/**
 * Purpose: Session screen with playable Level 1 touch simulation.
 * Module: session
 * Dependencies: expo-router, levels persistence, game engine
 * Notes: Touch adapter is isolated so a WebSocket / WiFi-local sensor adapter can replace it later.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPatientLevels } from '@/src/modules/diagnostics/diagnostic-service';
import { loadActiveVolumeEstimationContext, showTherapyReadinessAlert } from '@/src/modules/device/volume-estimation';
import { isSensorDebugEnabled } from '@/src/modules/app-mode';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import type { SensorConnectionStatus } from '@/src/modules/device/types/sensor-reading';
import { evaluateLevelSensorReadiness } from '@/src/modules/session/sensor/level-sensor-readiness';
import {
  therapyHudShowsEstimatedVolume,
  therapyVolumeHudMessage,
} from '@/src/modules/session/sensor/level-sensor-volume-status';
import { useLevelSensorVolume } from '@/src/modules/session/sensor/use-level-sensor-volume';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import { saveLevelOneActiveRun } from '@/src/modules/levels/storage/level-one-active-run-storage';
import {
  getRunnerLevelProgress,
  isRunnerGameLevel,
  type LevelId,
} from '@/src/modules/levels/types/level-progress';
import { getLevelDifficultyConfig, getLevelDisplayMeta } from '@/src/modules/session/levels/level-difficulty-config';
import { getLevelGameplayConfig } from '@/src/modules/session/levels/level-gameplay-config';
import { resolveSafeLevelTargetVolume } from '@/src/modules/session/levels/level-target-safety';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import {
  computeInspirationNorm,
  evaluateLevelOneAttemptRelease,
} from '@/src/modules/session/engine/level-one/level-one-repetition-rules';
import {
  useLevelOneGame,
  type OfficialAttemptReleasePayload,
} from '@/src/modules/session/engine/level-one/use-level-one-game';
import { useTouchInputAdapter } from '@/src/modules/session/engine/touch/use-touch-input-adapter';
import { LevelOneGameView } from '@/src/modules/session/games/components/LevelOneGameView';
import { LevelAdvanceCelebrationModal } from '@/src/modules/session/games/components/LevelAdvanceCelebrationModal';
import { AllLevelsCompleteCelebrationModal } from '@/src/modules/session/games/components/AllLevelsCompleteCelebrationModal';
import type { SessionDisplayVolumeSource } from '@/src/modules/session/games/components/SessionEstimatedVolumeCard';
import { getLevelById } from '@/src/modules/session/registry/level-registry';
import {
  buildOfficialValidationFromLevelOneRelease,
  evaluateOfficialAttempt,
  evaluateSensorAttemptVolume,
  type OfficialAttemptValidationResult,
} from '@/src/modules/session/sensor-evaluation';
import {
  isTouchPracticeSession,
  parseSessionInputMode,
} from '@/src/modules/session/session-input-mode';
import { buildSessionResult } from '@/src/modules/session/session-result-factory';
import { persistSessionResult, TARGET_ATTEMPTS, type LevelUnlockResult } from '@/src/modules/session/session-progress-service';
import { navigateToInitialEvaluation } from '@/src/modules/diagnostics/navigate-to-initial-evaluation';
import { getLevelVisualIdentity } from '@/src/theme/level-colors';
import { describeSessionProgress } from '@/src/modules/session/patient-ui/session-progress-copy';
import type { SessionAttemptResult } from '@/src/modules/session/types/session-result';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

type SessionSummaryKind = 'completed' | 'interrupted' | null;
/** Ramp de volumen simulado en práctica táctil (sin límite de fallo por tiempo). */
const PRACTICE_VOLUME_RAMP_MS = 4500;
/** Umbral mínimo de volumen (mL) para detectar inicio de inspiración con sensor. */
const SENSOR_INHALE_START_MIN_ML = 60;
const SENSOR_INHALE_START_TARGET_RATIO = 0.07;

function simulatedVolumeForHold(targetVolumeMl: number, holdMs: number): number {
  return Math.round(
    Math.max(0, targetVolumeMl * Math.min(1.18, holdMs / PRACTICE_VOLUME_RAMP_MS)),
  );
}

type AttemptTraceMeta = {
  distanceMm?: number | null;
  rawDistanceMm?: number | null;
  inCalibratedRange?: boolean | null;
  clamped?: boolean | null;
  calibrationProfileId?: string | null;
  activeModelId?: string | null;
  modelKind?: string | null;
};

function attemptFromOfficialValidation(
  valid: boolean,
  holdMs: number,
  validation: OfficialAttemptValidationResult,
  inputMode: ReturnType<typeof parseSessionInputMode>,
  sensorEvaluation?: ReturnType<typeof evaluateSensorAttemptVolume>,
  traceMeta?: AttemptTraceMeta,
): SessionAttemptResult {
  const peakVolume = Math.round(
    validation.officialVolumeMl ??
      simulatedVolumeForHold(validation.targetVolumeMl, holdMs),
  );
  const base: SessionAttemptResult = {
    valid,
    holdMs,
    peakVolume,
    inputMode,
    dataSource: validation.source,
    officialVolumeMl: validation.officialVolumeMl,
  };
  if (validation.source !== 'sensor_model' || !sensorEvaluation) {
    return base;
  }
  return {
    ...base,
    sensorEstimatedVolumeMl: sensorEvaluation.estimatedVolumeMl,
    sensorU95Ml: sensorEvaluation.u95Ml,
    sensorConfidenceLabel: sensorEvaluation.confidenceLabel,
    sensorVolumeReachedConservatively: sensorEvaluation.reachesTargetConservatively,
    sensorAttemptStatus: sensorEvaluation.status,
    distanceMm: traceMeta?.distanceMm,
    rawDistanceMm: traceMeta?.rawDistanceMm,
    inCalibratedRange: traceMeta?.inCalibratedRange,
    clamped: traceMeta?.clamped,
    calibrationProfileId: traceMeta?.calibrationProfileId,
    activeModelId: traceMeta?.activeModelId,
    modelKind: traceMeta?.modelKind,
  };
}

function sessionSummaryModalTitle(kind: SessionSummaryKind, sessionNumber: number): string {
  return kind === 'interrupted'
    ? `Sesión ${sessionNumber} detenida`
    : `Sesión ${sessionNumber} completada`;
}

export function SessionScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { patient } = usePatientSession();
  const { levelId, sessionRunId, inputMode: inputModeParam } = useLocalSearchParams<{
    levelId?: string;
    sessionRunId?: string;
    inputMode?: string;
  }>();
  const sessionInputMode = useMemo(() => parseSessionInputMode(inputModeParam), [inputModeParam]);
  const isTouchPractice = isTouchPracticeSession(sessionInputMode);
  const {
    isLoading,
    progress,
    selectLevel,
    updateRunnerLevel,
    finalizeRunnerLevelSession,
    prepareFreshRunnerLevelSessionRun,
    discardInProgressRunnerLevelRun,
    clearLevelOneActiveRunMarker,
    repeatCurrentRunnerLevelSession,
    interruptCurrentRunnerLevelSession,
  } = useLevelsProgress();
  const selectedLevelId = (levelId ?? progress.selectedLevelId) as LevelId;
  const level = getLevelById(selectedLevelId);
  const isRunnerLevel = isRunnerGameLevel(selectedLevelId);
  const runnerLevelId = isRunnerLevel ? selectedLevelId : null;
  const levelGameplay = runnerLevelId ? getLevelGameplayConfig(runnerLevelId) : undefined;
  const levelDifficulty = getLevelDifficultyConfig(selectedLevelId);
  const currentLevelProgress = runnerLevelId
    ? getRunnerLevelProgress(progress, runnerLevelId)
    : progress.levelOne;
  const currentSessionData =
    currentLevelProgress.sessions[currentLevelProgress.currentSession - 1];

  useEffect(() => {
    if (levelId && levelId !== progress.selectedLevelId) {
      selectLevel(levelId as LevelId);
    }
  }, [levelId, progress.selectedLevelId, selectLevel]);

  const sensorConnection = useSensorConnection();
  const sensorConnectionRef = useRef(sensorConnection);
  sensorConnectionRef.current = sensorConnection;

  const levelSensor = useLevelSensorVolume({
    enabled: isFocused && isRunnerLevel && !isTouchPractice,
    levelId: selectedLevelId,
    inputMode: sessionInputMode,
    sessionRunId: sessionRunId ? String(sessionRunId) : undefined,
  });

  const volumeEstimateStatus = levelSensor.volumeEstimateStatus;
  const levelSensorGetSnapshotRef = useRef(levelSensor.getSnapshot);
  levelSensorGetSnapshotRef.current = levelSensor.getSnapshot;

  const [sensorEntryReady, setSensorEntryReady] = useState(isTouchPractice);
  const sensorReadinessDoneKeyRef = useRef<string | null>(null);
  const peakSensorVolumeRef = useRef(0);
  const targetVolumeRef = useRef(1200);
  const holdMsRef = useRef(0);
  const isTouchPracticeRef = useRef(isTouchPractice);
  isTouchPracticeRef.current = isTouchPractice;

  const [summaryDismissedKind, setSummaryDismissedKind] = useState<SessionSummaryKind>(null);
  const [activeLevelLoaded, setActiveLevelLoaded] = useState(false);
  const [targetVolume, setTargetVolume] = useState(1200);
  targetVolumeRef.current = targetVolume;
  const [patientLevelId, setPatientLevelId] = useState<number | null>(null);
  const [attemptsRuntime, setAttemptsRuntime] = useState<SessionAttemptResult[]>([]);
  const [targetWasAdjusted, setTargetWasAdjusted] = useState(false);
  const [targetAdjustmentReason, setTargetAdjustmentReason] = useState<string | null>(null);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingInterrupt, setSavingInterrupt] = useState(false);
  const [introAcknowledged, setIntroAcknowledged] = useState(false);
  const [celebrationKind, setCelebrationKind] = useState<'advance' | 'journey' | null>(null);
  const [pendingSummarySessionId, setPendingSummarySessionId] = useState<number | null>(null);
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const sessionCleanExitRef = useRef(false);
  const stopSessionRef = useRef<() => void>(() => {});
  const sensorInhaleArmedRef = useRef(true);
  const calibrationTraceRef = useRef<{
    calibrationProfileId: string | null;
    activeModelId: string | null;
    modelKind: string | null;
    spirometerDeviceId: string | null;
    calibrationCreatedAt: number | null;
    calibrationUpdatedAt: number | null;
  }>({
    calibrationProfileId: null,
    activeModelId: null,
    modelKind: null,
    spirometerDeviceId: null,
    calibrationCreatedAt: null,
    calibrationUpdatedAt: null,
  });
  const firmwareTraceRef = useRef<{
    firmwareVersion: string | null;
    deviceId: string | null;
    sensorStatus: string | null;
    sensorFilter: string | null;
  }>({
    firmwareVersion: null,
    deviceId: null,
    sensorStatus: null,
    sensorFilter: null,
  });

  useEffect(() => {
    if (isTouchPractice || !isRunnerLevel || !isFocused || !sessionRunId) {
      if (isTouchPractice) setSensorEntryReady(true);
      return;
    }

    const readinessKey = String(sessionRunId);
    if (sensorReadinessDoneKeyRef.current === readinessKey) {
      setSensorEntryReady(true);
      return;
    }

    let cancelled = false;
    const conn = sensorConnectionRef.current;
    const sensorConnected =
      conn.status === 'connected' || conn.status === 'receiving' || conn.mode === 'mock';

    void (async () => {
      const readiness = await evaluateLevelSensorReadiness({
        inputMode: sessionInputMode,
        sensorConnected,
        sensorStatus: conn.status,
        lastReading: conn.lastReading,
        receivedAtMs: conn.lastReading ? Date.now() : null,
        patientId: patient?.paciente_id ?? null,
        requireLiveReading: false,
      });
      if (cancelled) return;
      sensorReadinessDoneKeyRef.current = readinessKey;
      if (!readiness.canStart) {
        showTherapyReadinessAlert(readiness.gate, (route) => router.replace(route));
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)/terapia');
        }
        return;
      }
      setSensorEntryReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isFocused,
    isRunnerLevel,
    isTouchPractice,
    patient?.paciente_id,
    router,
    sessionInputMode,
    sessionRunId,
  ]);

  const exitToTherapy = useCallback(() => {
    router.replace('/(tabs)/terapia');
  }, [router]);

  const markSessionCleanExit = useCallback(() => {
    sessionCleanExitRef.current = true;
    void clearLevelOneActiveRunMarker();
  }, [clearLevelOneActiveRunMarker]);

  const stopSessionRuntimeState = useCallback(() => {
    stopSessionRef.current();
    setSummaryDismissedKind(null);
    setAttemptsRuntime([]);
  }, []);

  const persistInterruptedSessionToHistory = useCallback(
    async (
      valid: number,
      failed: number,
      attemptsSnapshot: SessionAttemptResult[],
    ) => {
      if (!patient || !patientLevelId) return;
      const trace = calibrationTraceRef.current;
      const fwTrace = firmwareTraceRef.current;
      const result = buildSessionResult({
        patientId: patient.paciente_id,
        patientLevelId,
        levelId: selectedLevelId,
        status: 'interrupted',
        validAttempts: valid,
        invalidAttempts: failed,
        attemptsRuntime: attemptsSnapshot,
        inputMode: sessionInputMode,
        calibrationProfileId: trace.calibrationProfileId,
        activeModelId: trace.activeModelId,
        modelKind: trace.modelKind,
        spirometerDeviceId: trace.spirometerDeviceId,
        calibrationCreatedAt: trace.calibrationCreatedAt,
        calibrationUpdatedAt: trace.calibrationUpdatedAt,
        firmwareVersion: fwTrace.firmwareVersion,
        deviceId: fwTrace.deviceId,
        sensorStatus: fwTrace.sensorStatus,
        sensorFilter: fwTrace.sensorFilter,
      });
      await persistSessionResult(result);
    },
    [patient, patientLevelId, selectedLevelId, sessionInputMode],
  );

  const levelOneEngineScopeKey = [
    patient?.paciente_id ?? '',
    selectedLevelId,
    sessionInputMode,
    String(sessionRunId ?? ''),
    String(targetVolume),
  ].join('|');

  const officialValidationDepsRef = useRef({
    sessionInputMode,
    targetVolume,
    isTouchPractice,
    volumeEstimateStatus,
  });

  officialValidationDepsRef.current = {
    sessionInputMode,
    targetVolume,
    isTouchPractice,
    volumeEstimateStatus,
  };

  const inspirationInputsRef = useRef({
    displayVolumeMl: 0,
    targetVolume: 1200,
    holdMs: 0,
  });

  const syncSensorInspirationInputs = useCallback(() => {
    if (isTouchPracticeRef.current) return;
    const snap = levelSensorGetSnapshotRef.current();
    inspirationInputsRef.current.targetVolume = targetVolumeRef.current;
    inspirationInputsRef.current.holdMs = holdMsRef.current;
    if (!snap.hasLiveReading) {
      inspirationInputsRef.current.displayVolumeMl = 0;
      return;
    }
    inspirationInputsRef.current.displayVolumeMl = snap.estimatedVolumeMl;
    if (
      holdMsRef.current > 0 &&
      snap.estimatedVolumeMl > peakSensorVolumeRef.current
    ) {
      peakSensorVolumeRef.current = snap.estimatedVolumeMl;
    }
  }, []);

  const getInspirationNorm = useCallback(() => {
    syncSensorInspirationInputs();
    if (!isTouchPracticeRef.current) {
      const snap = levelSensorGetSnapshotRef.current();
      if (!snap.hasLiveReading) return 0;
    }
    return computeInspirationNorm({
      displayVolumeMl: inspirationInputsRef.current.displayVolumeMl,
      targetVolumeMl: inspirationInputsRef.current.targetVolume,
      holdMs: inspirationInputsRef.current.holdMs,
    });
  }, [syncSensorInspirationInputs]);

  const resolveOfficialAttemptOnRelease = useCallback((payload: OfficialAttemptReleasePayload) => {
    const deps = officialValidationDepsRef.current;
    const simulatedAtRelease = simulatedVolumeForHold(deps.targetVolume, payload.heldMs);
    const releaseEval = evaluateLevelOneAttemptRelease({
      runtime: {
        subPhase: payload.targetReached ? 'official_eval' : 'ascending',
        totalElapsedMs: payload.heldMs,
        subPhaseElapsedMs: payload.sustainMs,
        clearMs: payload.sustainMs,
        belowClearMs: 0,
        peakNorm: payload.peakNorm,
        everClearedObstacle: payload.targetReached,
      },
      liveFail: payload.liveFail,
      inputMode: deps.sessionInputMode,
      releasedDuringEval:
        payload.liveFail === 'released_during_eval' || payload.liveFail === 'hit_obstacle',
    });
    const peakSensorMl = peakSensorVolumeRef.current;
    const snap = isTouchPracticeSession(deps.sessionInputMode)
      ? null
      : levelSensorGetSnapshotRef.current();
    const officialVolumeMl = isTouchPracticeSession(deps.sessionInputMode)
      ? simulatedAtRelease
      : peakSensorMl > 0
        ? peakSensorMl
        : (snap?.estimate.roundedVolumeMl ?? simulatedAtRelease);
    const sensorEval =
      snap &&
      evaluateSensorAttemptVolume({
        estimatedVolumeMl: snap.estimate.roundedVolumeMl,
        u95Ml: snap.estimate.u95Ml,
        lowerBoundMl: snap.estimate.lowerBoundMl,
        upperBoundMl: snap.estimate.upperBoundMl,
        targetVolumeMl: deps.targetVolume,
        estimationStatus: deps.volumeEstimateStatus,
        inCalibratedRange: snap.estimate.inCalibratedRange,
        clamped: snap.estimate.clamped,
      });
    const sensorSignalLive = snap?.hasLiveReading ?? false;
    const attemptValid =
      releaseEval.valid &&
      (isTouchPracticeSession(deps.sessionInputMode) || sensorSignalLive);

    const validation = buildOfficialValidationFromLevelOneRelease({
      release: { ...releaseEval, valid: attemptValid },
      targetVolumeMl: deps.targetVolume,
      officialVolumeMl,
      inputMode: deps.sessionInputMode,
      u95Ml: snap?.estimate.u95Ml ?? null,
      confidenceLabel: sensorEval?.confidenceLabel as
        | OfficialAttemptValidationResult['confidenceLabel']
        | undefined,
    });
    return { valid: attemptValid, failReason: releaseEval.failReason, validation };
  }, []);

  const lastResolvedValidationRef = useRef<OfficialAttemptValidationResult | null>(null);

  const levelOneEngine = useLevelOneGame({
    progress: currentLevelProgress,
    engineScopeKey: levelOneEngineScopeKey,
    officialEvalMs: levelDifficulty.requiredHoldMs,
    restMs: levelDifficulty.restMs,
    onProgressChange: (updater) => {
      if (!runnerLevelId) return;
      updateRunnerLevel(runnerLevelId, updater);
    },
    sessionInputMode,
    getInspirationNorm,
    resolveOfficialAttemptOnRelease: (payload) => {
      const { valid, failReason, validation } = resolveOfficialAttemptOnRelease(payload);
      lastResolvedValidationRef.current = validation;
      return { valid, failReason };
    },
    onAttemptResolved: ({ valid, holdMs }) => {
      const deps = officialValidationDepsRef.current;
      const snap = deps.isTouchPractice ? null : levelSensorGetSnapshotRef.current();
      const sensorAttemptEvaluation =
        snap &&
        evaluateSensorAttemptVolume({
          estimatedVolumeMl: snap.estimate.roundedVolumeMl,
          u95Ml: snap.estimate.u95Ml,
          lowerBoundMl: snap.estimate.lowerBoundMl,
          upperBoundMl: snap.estimate.upperBoundMl,
          targetVolumeMl: deps.targetVolume,
          estimationStatus: deps.volumeEstimateStatus,
          inCalibratedRange: snap.estimate.inCalibratedRange,
          clamped: snap.estimate.clamped,
        });
      const validation =
        lastResolvedValidationRef.current ??
        evaluateOfficialAttempt({
          inputMode: deps.sessionInputMode,
          targetVolumeMl: deps.targetVolume,
          requiredHoldMs: levelDifficulty.requiredHoldMs,
          currentHoldMs: holdMs,
          simulatedVolumeMl: simulatedVolumeForHold(deps.targetVolume, holdMs),
          sensorAttemptEvaluation: sensorAttemptEvaluation ?? undefined,
          activeVolumeEstimate: snap?.estimate,
        });
      const traceMeta: AttemptTraceMeta | undefined = snap
        ? {
            distanceMm: snap.estimate.distanceMm,
            rawDistanceMm: snap.distanceMm,
            inCalibratedRange: snap.estimate.inCalibratedRange,
            clamped: snap.estimate.clamped,
            calibrationProfileId: calibrationTraceRef.current.calibrationProfileId,
            activeModelId: calibrationTraceRef.current.activeModelId,
            modelKind: snap.estimate.modelKind,
          }
        : undefined;
      setAttemptsRuntime((prev) => [
        ...prev,
        attemptFromOfficialValidation(
          valid,
          holdMs,
          validation,
          deps.sessionInputMode,
          sensorAttemptEvaluation ?? undefined,
          traceMeta,
        ),
      ]);
      lastResolvedValidationRef.current = null;
    },
  });
  const { restartCurrentSession, stopSession, pauseSession, resumeSession } = levelOneEngine;
  stopSessionRef.current = stopSession;

  const dismissSessionOverlays = useCallback(() => {
    setCelebrationKind(null);
    setPauseModalVisible(false);
    setSummaryDismissedKind('completed');
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        dismissSessionOverlays();
      };
    }, [dismissSessionOverlays]),
  );

  const summaryKind: SessionSummaryKind =
    levelOneEngine.phase === 'session-complete' ? 'completed' : null;

  useEffect(() => {
    if (!summaryKind) {
      setSummaryDismissedKind(null);
    }
  }, [summaryKind]);

  const inputPort = useTouchInputAdapter({
    onInhaleStart: isTouchPractice ? levelOneEngine.onInhaleStart : () => {},
    onInhaleEnd: isTouchPractice ? levelOneEngine.onInhaleEnd : () => {},
  });

  const sensorInhaleStartThresholdMl = useMemo(
    () =>
      Math.max(
        SENSOR_INHALE_START_MIN_ML,
        Math.round(targetVolume * SENSOR_INHALE_START_TARGET_RATIO),
      ),
    [targetVolume],
  );

  useEffect(() => {
    holdMsRef.current = levelOneEngine.holdMs;
  }, [levelOneEngine.holdMs]);

  const sensorEffectPhase = levelOneEngine.phase;
  const sensorEffectOnInhaleStart = levelOneEngine.onInhaleStart;
  useEffect(() => {
    if (isTouchPractice || !sensorEntryReady) return;
    if (sensorEffectPhase === 'ready') {
      sensorInhaleArmedRef.current = true;
      peakSensorVolumeRef.current = 0;
    }
    if (sensorEffectPhase !== 'ready' || !sensorInhaleArmedRef.current) return;
    const snap = levelSensorGetSnapshotRef.current();
    if (!snap.hasLiveReading || !snap.sensorConnected || snap.distanceMm === null) return;
    if (snap.estimatedVolumeMl < sensorInhaleStartThresholdMl) return;
    sensorInhaleArmedRef.current = false;
    sensorEffectOnInhaleStart();
  }, [
    isTouchPractice,
    sensorEffectOnInhaleStart,
    sensorEffectPhase,
    sensorEntryReady,
    sensorInhaleStartThresholdMl,
    levelSensor.displayVolumeMl,
  ]);

  useEffect(() => {
    if (isTouchPractice) return;
    const phase = levelOneEngine.phase;
    if (
      phase === 'ready' ||
      phase === 'resting' ||
      phase === 'preparing' ||
      phase === 'not-started'
    ) {
      peakSensorVolumeRef.current = 0;
    }
  }, [isTouchPractice, levelOneEngine.phase]);

  const reloadActiveLevelTargets = useCallback(async () => {
    if (!patient) {
      setPatientLevelId(null);
      setTargetVolume(1200);
      setTargetWasAdjusted(false);
      setTargetAdjustmentReason(null);
      setActiveLevelLoaded(true);
      return;
    }
    if (!isRunnerGameLevel(selectedLevelId)) {
      setPatientLevelId(null);
      setTargetVolume(1200);
      setTargetWasAdjusted(false);
      setTargetAdjustmentReason(null);
      setActiveLevelLoaded(true);
      return;
    }
    const patientLevels = await getPatientLevels(patient.paciente_id);
    const row = patientLevels.find((item) => item.level_id === selectedLevelId);
    const baseVolume = row?.target_volume ?? 1200;

    let calibratedRangeMl: { min: number; max: number } | null = null;
    if (!isTouchPractice) {
      try {
        const loaded = await loadActiveVolumeEstimationContext();
        calibratedRangeMl = loaded.context.calibratedRangeMl;
        calibrationTraceRef.current = {
          calibrationProfileId: loaded.calibrationProfile?.id ?? null,
          activeModelId: loaded.activeModel?.id ?? null,
          modelKind: loaded.activeModel?.modelKind ?? null,
          spirometerDeviceId: loaded.activeModel?.spirometerDeviceId ?? null,
          calibrationCreatedAt: loaded.calibrationProfile?.createdAt ?? null,
          calibrationUpdatedAt: loaded.calibrationProfile?.updatedAt ?? null,
        };
        const reading = sensorConnectionRef.current.lastReading;
        firmwareTraceRef.current = {
          firmwareVersion: reading?.firmwareVersion ?? null,
          deviceId: reading?.deviceId ?? null,
          sensorStatus: reading?.sensorStatus ?? null,
          sensorFilter: reading?.filter ?? null,
        };
      } catch {
        /* readiness gate handles missing calibration */
      }
    }

    const safeTarget = resolveSafeLevelTargetVolume({
      baseTargetVolumeMl: baseVolume,
      targetVolumeMultiplier: levelDifficulty.targetVolumeMultiplier,
      calibratedRangeMl,
      inputMode: sessionInputMode,
    });

    setTargetVolume(safeTarget.effectiveTargetVolumeMl);
    setTargetWasAdjusted(safeTarget.wasAdjusted);
    setTargetAdjustmentReason(safeTarget.reason);
    setPatientLevelId(row?.patient_level_id ?? null);
    setActiveLevelLoaded(true);
  }, [isTouchPractice, levelDifficulty.targetVolumeMultiplier, patient, selectedLevelId, sessionInputMode]);

  useEffect(() => {
    setActiveLevelLoaded(false);
    void reloadActiveLevelTargets();
  }, [reloadActiveLevelTargets]);

  useFocusEffect(
    useCallback(() => {
      void reloadActiveLevelTargets();
    }, [reloadActiveLevelTargets]),
  );

  const sessionEntryScopeKey = [
    patient?.paciente_id ?? '',
    selectedLevelId,
    sessionInputMode,
    String(sessionRunId ?? ''),
  ].join('|');

  useLayoutEffect(() => {
    if (isLoading || !runnerLevelId) return;
    sessionCleanExitRef.current = false;
    prepareFreshRunnerLevelSessionRun(runnerLevelId);
    stopSession();
    setIntroAcknowledged(false);
    setSummaryDismissedKind(null);
    setAttemptsRuntime([]);
  }, [
    sessionEntryScopeKey,
    isLoading,
    runnerLevelId,
    prepareFreshRunnerLevelSessionRun,
    stopSession,
  ]);

  useEffect(() => {
    if (isLoading || !patient || !runnerLevelId || !sessionRunId) return;
    void saveLevelOneActiveRun(patient.paciente_id, {
      sessionRunId: String(sessionRunId),
      levelId: selectedLevelId,
      inputMode: sessionInputMode,
      updatedAt: Date.now(),
    });
  }, [sessionEntryScopeKey, isLoading, patient, runnerLevelId, sessionRunId, selectedLevelId, sessionInputMode]);

  useEffect(() => {
    return () => {
      stopSessionRef.current();
      if (!sessionCleanExitRef.current) {
        return;
      }
    };
  }, []);

  const handleIntroComplete = useCallback(() => {
    if (!runnerLevelId) return;
    prepareFreshRunnerLevelSessionRun(runnerLevelId);
    setAttemptsRuntime([]);
    setIntroAcknowledged(true);
    /** Tras el commit del progreso limpio: `startSession` no hace nada si la fase no es `not-started`. */
    setTimeout(() => {
      restartCurrentSession();
    }, 0);
  }, [prepareFreshRunnerLevelSessionRun, restartCurrentSession, runnerLevelId]);

  const abandonSessionAndExit = useCallback(
    (options: {
      persistInterruptedToHistory: boolean;
      markLevelSlotInterrupted: boolean;
      valid: number;
      failed: number;
      attempts: SessionAttemptResult[];
    }) => {
      const { persistInterruptedToHistory, markLevelSlotInterrupted, valid, failed, attempts } = options;
      stopSessionRuntimeState();

      if (runnerLevelId) {
        if (markLevelSlotInterrupted) {
          interruptCurrentRunnerLevelSession(runnerLevelId);
        } else {
          discardInProgressRunnerLevelRun(runnerLevelId);
        }
      }

      markSessionCleanExit();

      if (!persistInterruptedToHistory) {
        exitToTherapy();
        return;
      }

      setSavingInterrupt(true);
      void (async () => {
        try {
          await persistInterruptedSessionToHistory(valid, failed, attempts);
        } catch {
          /* historial opcional: no bloquear salida */
        } finally {
          setSavingInterrupt(false);
          exitToTherapy();
        }
      })();
    },
    [
      discardInProgressRunnerLevelRun,
      exitToTherapy,
      interruptCurrentRunnerLevelSession,
      markSessionCleanExit,
      runnerLevelId,
      persistInterruptedSessionToHistory,
      stopSessionRuntimeState,
    ],
  );

  const navigateToSessionSummary = useCallback(
    (sessionId: number) => {
      dismissSessionOverlays();
      markSessionCleanExit();
      requestAnimationFrame(() => {
        router.replace({
          pathname: '/(tabs)/resumen',
          params: { sessionId: String(sessionId) },
        });
      });
    },
    [dismissSessionOverlays, markSessionCleanExit, router],
  );

  const handlePausePress = useCallback(() => {
    if (pauseSession()) {
      setPauseModalVisible(true);
    }
  }, [pauseSession]);

  const handlePauseContinue = useCallback(() => {
    setPauseModalVisible(false);
    resumeSession();
  }, [resumeSession]);

  const handlePauseSaveAndExit = useCallback(() => {
    setPauseModalVisible(false);
    const validSnap = currentSessionData?.validRepetitions ?? 0;
    const failedSnap = currentSessionData?.failedRepetitions ?? 0;
    const attemptsSnap = [...attemptsRuntime];
    const totalAttemptsSnap = validSnap + failedSnap;
    const hadAttempts = totalAttemptsSnap > 0;
    abandonSessionAndExit({
      persistInterruptedToHistory: hadAttempts,
      markLevelSlotInterrupted: hadAttempts && !isTouchPractice,
      valid: validSnap,
      failed: failedSnap,
      attempts: attemptsSnap,
    });
  }, [
    abandonSessionAndExit,
    attemptsRuntime,
    currentSessionData?.failedRepetitions,
    currentSessionData?.validRepetitions,
    isTouchPractice,
  ]);

  const simulatedVolume = useMemo(
    () => simulatedVolumeForHold(targetVolume, levelOneEngine.holdMs),
    [targetVolume, levelOneEngine.holdMs],
  );

  const inspirationDisplayMl = isTouchPractice
    ? simulatedVolume
    : levelSensor.displayVolumeMl;

  if (isTouchPractice) {
    inspirationInputsRef.current = {
      displayVolumeMl: inspirationDisplayMl,
      targetVolume,
      holdMs: levelOneEngine.holdMs,
    };
  }

  const sessionShowsSensorVolume =
    !isTouchPractice &&
    therapyHudShowsEstimatedVolume(volumeEstimateStatus, levelSensor.hasLiveReading);

  const sessionDisplayVolumeMl = isTouchPractice
    ? simulatedVolume
    : sessionShowsSensorVolume
      ? levelSensor.displayVolumeMl
      : 0;
  const sessionDisplaySource: SessionDisplayVolumeSource = isTouchPractice
    ? 'fallback'
    : sessionShowsSensorVolume
      ? 'sensor'
      : 'fallback';
  const sessionDisplayU95Ml =
    isTouchPractice || !sessionShowsSensorVolume || !isSensorDebugEnabled()
      ? null
      : levelSensor.displayU95Ml;
  const sessionDisplayStatus = isTouchPractice ? undefined : volumeEstimateStatus;
  const sessionVolumeHudMessage = isTouchPractice
    ? null
    : sessionShowsSensorVolume
      ? null
      : therapyVolumeHudMessage(
          volumeEstimateStatus,
          levelSensor.sensorStatus as SensorConnectionStatus,
        );

  if (isLoading || !activeLevelLoaded || (!isTouchPractice && !sensorEntryReady)) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={wellness.primary} />
        {!isTouchPractice && !sensorEntryReady ? (
          <Text style={styles.loadingHint}>Verificando sensor y calibración…</Text>
        ) : null}
      </SafeAreaView>
    );
  }

  if (!level) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Sesión guiada</Text>
        <Text style={styles.detail}>Nivel no encontrado.</Text>
      </SafeAreaView>
    );
  }

  if (!isRunnerLevel) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Sesión guiada: {level.title}</Text>
        <Text style={styles.detail}>Este nivel estará disponible próximamente.</Text>
      </SafeAreaView>
    );
  }

  const validAttempts = currentSessionData?.validRepetitions ?? 0;
  const failedAttempts = currentSessionData?.failedRepetitions ?? 0;
  const totalAttempts = validAttempts + failedAttempts;
  const perfectSession =
    validAttempts === TARGET_ATTEMPTS && totalAttempts === TARGET_ATTEMPTS;
  const sessionProgress = describeSessionProgress({
    validAttempts,
    targetAttempts: TARGET_ATTEMPTS,
    perfect: perfectSession,
    completed: summaryKind === 'completed',
  });
  const maxVolume = attemptsRuntime.length > 0 ? Math.max(...attemptsRuntime.map((item) => item.peakVolume)) : 0;
  const avgVolume =
    attemptsRuntime.length > 0
      ? Math.round(attemptsRuntime.reduce((sum, item) => sum + item.peakVolume, 0) / attemptsRuntime.length)
      : 0;
  const avgHoldSeconds =
    attemptsRuntime.length > 0
      ? attemptsRuntime.reduce((sum, item) => sum + item.holdMs, 0) / attemptsRuntime.length / 1000
      : 0;
  const maxHoldSeconds =
    attemptsRuntime.length > 0 ? Math.max(...attemptsRuntime.map((item) => item.holdMs)) / 1000 : 0;

  const levelVisual = getLevelVisualIdentity(selectedLevelId);
  const levelDisplayMeta = getLevelDisplayMeta(selectedLevelId);

  const applyUnlockCelebration = (unlock: LevelUnlockResult) => {
    if (!unlock.unlocked) {
      setCelebrationKind(null);
      return;
    }
    setCelebrationKind(unlock.journeyComplete ? 'journey' : 'advance');
  };

  const handleCompleteSessionContinue = async () => {
    if (!patient || !patientLevelId || savingSummary) return;
    setSavingSummary(true);
    try {
      const trace = calibrationTraceRef.current;
      const fwTrace = firmwareTraceRef.current;
      const result = buildSessionResult({
        patientId: patient.paciente_id,
        patientLevelId,
        levelId: selectedLevelId,
        status: 'completed',
        validAttempts,
        invalidAttempts: failedAttempts,
        attemptsRuntime,
        inputMode: sessionInputMode,
        calibrationProfileId: trace.calibrationProfileId,
        activeModelId: trace.activeModelId,
        modelKind: trace.modelKind,
        spirometerDeviceId: trace.spirometerDeviceId,
        calibrationCreatedAt: trace.calibrationCreatedAt,
        calibrationUpdatedAt: trace.calibrationUpdatedAt,
        firmwareVersion: fwTrace.firmwareVersion,
        deviceId: fwTrace.deviceId,
        sensorStatus: fwTrace.sensorStatus,
        sensorFilter: fwTrace.sensorFilter,
      });
      const { session: savedSession, unlock } = await persistSessionResult(result);
      if (!isTouchPractice && runnerLevelId) {
        finalizeRunnerLevelSession(runnerLevelId);
      }
      markSessionCleanExit();
      levelOneEngine.stopSession();
      setAttemptsRuntime([]);
      setSummaryDismissedKind('completed');
      setPendingSummarySessionId(savedSession.session_id);
      applyUnlockCelebration(unlock);
      if (!unlock.unlocked) {
        navigateToSessionSummary(savedSession.session_id);
      }
    } finally {
      setSavingSummary(false);
    }
  };

  const handleCelebrationViewSummary = () => {
    const sessionId = pendingSummarySessionId;
    if (sessionId != null) {
      navigateToSessionSummary(sessionId);
    } else {
      dismissSessionOverlays();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {savingInterrupt ? (
        <View style={styles.savingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={wellness.primary} />
          <Text style={styles.savingOverlayText}>Guardando tu sesión…</Text>
        </View>
      ) : null}
      {targetWasAdjusted && targetAdjustmentReason ? (
        <View style={styles.adjustmentNote}>
          <Text style={styles.adjustmentNoteText}>{targetAdjustmentReason}</Text>
        </View>
      ) : null}
      <View style={styles.gameWrap}>
        <LevelOneGameView
          introMode={levelOneEngine.phase === 'not-started' && !introAcknowledged}
          onIntroComplete={handleIntroComplete}
          onIntroExit={() => {
            abandonSessionAndExit({
              persistInterruptedToHistory: false,
              markLevelSlotInterrupted: false,
              valid: 0,
              failed: 0,
              attempts: [],
            });
          }}
          holdMs={levelOneEngine.holdMs}
          sustainMs={levelOneEngine.sustainMs}
          targetReached={levelOneEngine.targetReached}
          obstacleActive={levelOneEngine.obstacleActive}
          metaJustReached={levelOneEngine.metaJustReached}
          inhaleSoftHintVisible={levelOneEngine.inhaleSoftHintVisible}
          liveCrashSignal={levelOneEngine.liveCrashSignal}
          phase={levelOneEngine.phase}
          session={currentLevelProgress.currentSession}
          repetition={currentLevelProgress.currentRepetition}
          valid={validAttempts}
          failed={failedAttempts}
          holdSecondsRemaining={levelOneEngine.holdSecondsRemaining}
          prepSecondsRemaining={levelOneEngine.prepSecondsRemaining}
          restSecondsRemaining={levelOneEngine.restSecondsRemaining}
          attemptFeedback={levelOneEngine.attemptFeedback}
          levelLabel={levelGameplay?.title ?? level.title}
          levelDisplayName={levelDisplayMeta.humanName}
          accentColor={levelVisual.accent}
          theme={levelGameplay?.theme ?? level.theme ?? 'forest'}
          obstacleType={levelGameplay?.obstacleType ?? level.obstacleType ?? 'mountain'}
          touchInputEnabled={isTouchPractice}
          onPressIn={inputPort.onInhaleStart}
          onPressOut={inputPort.onInhaleEnd}
          onPressPause={handlePausePress}
          simulatedVolume={simulatedVolume}
          displayVolumeMl={sessionDisplayVolumeMl}
          displayVolumeSource={sessionDisplaySource}
          displayU95Ml={sessionDisplayU95Ml}
          displayVolumeStatus={sessionDisplayStatus}
          volumeHudMessage={sessionVolumeHudMessage}
          showSensorDebugMetrics={isSensorDebugEnabled()}
          sessionInputMode={sessionInputMode}
          targetVolume={targetVolume}
        />
      </View>
      <LevelAdvanceCelebrationModal
        visible={celebrationKind === 'advance' && isFocused}
        theme={levelGameplay?.theme ?? level.theme ?? 'forest'}
        accentColor={levelVisual.accent}
        onContinue={handleCelebrationViewSummary}
      />
      <AllLevelsCompleteCelebrationModal
        visible={celebrationKind === 'journey' && isFocused}
        onGoHome={() => {
          dismissSessionOverlays();
          router.replace('/(tabs)');
        }}
        onRedoDiagnostic={() => {
          dismissSessionOverlays();
          navigateToInitialEvaluation(router);
        }}
        onViewSummary={
          pendingSummarySessionId != null ? handleCelebrationViewSummary : undefined
        }
      />
      <Modal
        visible={pauseModalVisible && isFocused}
        transparent
        animationType="fade"
        onRequestClose={handlePauseContinue}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pauseModalCard}>
            <Text style={styles.pauseModalTitle}>Sesión en pausa</Text>
            <Text style={styles.pauseModalSubtitle}>
              Tómate un momento. Tu progreso de esta repetición queda en espera.
            </Text>
            <Pressable style={styles.modalPrimaryButton} onPress={handlePauseContinue}>
              <Text style={styles.modalPrimaryButtonText}>Continuar</Text>
            </Pressable>
            <Pressable style={styles.modalSecondaryButton} onPress={handlePauseSaveAndExit}>
              <Text style={styles.modalSecondaryButtonText}>Guardar y salir</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={isFocused && summaryKind !== null && summaryDismissedKind !== summaryKind}
        transparent
        animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHero}>
              <View style={styles.modalHeroIcon}>
                <Text style={styles.modalHeroIconText}>✓</Text>
              </View>
              <Text style={styles.modalHeroTitle}>Sesión completada</Text>
              <Text style={styles.modalHeroSubtitle}>Buen control durante la sesión</Text>
            </View>
            <Text style={styles.modalTitle}>
              {sessionSummaryModalTitle(summaryKind, currentLevelProgress.currentSession)}
            </Text>
            <View style={styles.modalMetaRow}>
              <Text style={styles.modalMetaChip}>{levelGameplay?.title ?? level.title}</Text>
              <Text style={styles.modalMetaChip}>Sesión {currentLevelProgress.currentSession}/6</Text>
            </View>
            <View style={styles.modalGrid}>
              <View style={styles.modalTile}>
                <Text style={styles.modalTileLabel}>Repeticiones válidas</Text>
                <Text style={styles.modalTileValue}>{validAttempts}</Text>
              </View>
              <View style={styles.modalTile}>
                <Text style={styles.modalTileLabel}>No completadas</Text>
                <Text style={styles.modalTileValue}>{failedAttempts}</Text>
              </View>
            </View>
            <View style={styles.modalComplianceBlock}>
              <Text style={styles.modalComplianceLabel}>Progreso de sesión</Text>
              <Text style={styles.modalProgressHeadline}>{sessionProgress.headline}</Text>
              {sessionProgress.support ? (
                <Text style={styles.modalProgressSupport}>{sessionProgress.support}</Text>
              ) : null}
              <View style={styles.modalComplianceTrack}>
                <View
                  style={[
                    styles.modalComplianceFill,
                    { width: `${Math.round(sessionProgress.progressRatio * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.modalProgressMeta}>
                {validAttempts} repeticiones válidas de {TARGET_ATTEMPTS}
              </Text>
            </View>
            {perfectSession ? (
              <View style={styles.modalBadgeRow}>
                <Text style={styles.modalBadgeStar}>★</Text>
                <Text style={styles.modalBadgeText}>Sesión completada con buen control</Text>
              </View>
            ) : null}
            <View style={styles.modalGrid}>
              <View style={styles.modalTileWide}>
                <Text style={styles.modalTileLabel}>Volumen máx. / prom.</Text>
                <Text style={styles.modalTileValueSmall}>
                  {maxVolume} mL · {avgVolume} mL
                </Text>
              </View>
              <View style={styles.modalTileWide}>
                <Text style={styles.modalTileLabel}>Tiempo máx. / prom. sostenido</Text>
                <Text style={styles.modalTileValueSmall}>
                  {maxHoldSeconds.toFixed(1)} s · {avgHoldSeconds.toFixed(1)} s
                </Text>
              </View>
            </View>
            <Text style={styles.modalMotivation}>
              {perfectSession
                ? 'Tu progreso se construye sesión a sesión. Buen control.'
                : 'Sigue a tu ritmo. Cada sesión cuenta para tu avance.'}
            </Text>
            <Pressable
              style={[styles.modalPrimaryButton, savingSummary && { opacity: 0.7 }]}
              disabled={savingSummary}
              onPress={() => {
                void handleCompleteSessionContinue();
              }}>
              <Text style={styles.modalPrimaryButtonText}>Continuar</Text>
            </Pressable>
            <Pressable
              style={styles.modalSecondaryButton}
              onPress={() => {
                if (summaryKind) {
                  setSummaryDismissedKind(summaryKind);
                }
                if (runnerLevelId) {
                  repeatCurrentRunnerLevelSession(runnerLevelId);
                }
                setAttemptsRuntime([]);
                restartCurrentSession();
              }}>
              <Text style={styles.modalSecondaryButtonText}>Repetir sesión</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: wellness.screenBg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: wellness.screenBg,
  },
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: wellness.screenBg,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  gameWrap: {
    flex: 1,
    minHeight: 400,
  },
  title: {
    color: wellness.text,
    fontSize: 26,
    fontWeight: '800',
  },
  detail: {
    marginTop: 10,
    color: wellness.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(46, 74, 62, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: wellnessRadii.cardLarge,
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: wellness.border,
    padding: 20,
  },
  modalHero: {
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: wellness.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalHeroIconText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  modalHeroTitle: {
    color: wellness.text,
    fontSize: 20,
    fontWeight: '800',
  },
  modalHeroSubtitle: {
    marginTop: 4,
    color: wellness.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalTitle: {
    color: wellness.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  modalMetaChip: {
    backgroundColor: wellness.softGreen,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
    color: wellness.primaryDark,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  modalTile: {
    flex: 1,
    minWidth: '42%',
    backgroundColor: wellness.softGreen,
    borderRadius: wellnessRadii.card,
    padding: 12,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  modalTileWide: {
    flex: 1,
    minWidth: '100%',
    backgroundColor: wellness.softGreen,
    borderRadius: wellnessRadii.card,
    padding: 12,
    borderWidth: 1,
    borderColor: wellness.border,
  },
  modalTileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    marginBottom: 4,
  },
  modalTileValue: {
    fontSize: 22,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  modalTileValueSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: wellness.text,
  },
  modalComplianceBlock: {
    marginBottom: 12,
  },
  modalComplianceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: wellness.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  modalProgressHeadline: {
    fontSize: 17,
    fontWeight: '800',
    color: wellness.primaryDark,
    marginBottom: 4,
  },
  modalProgressSupport: {
    fontSize: 14,
    fontWeight: '600',
    color: wellness.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  modalProgressMeta: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: wellness.textSecondary,
  },
  modalComplianceTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: wellness.border,
    overflow: 'hidden',
  },
  modalComplianceFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: wellness.primary,
  },
  modalCompliancePct: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  modalBadgeStar: {
    fontSize: 18,
    color: '#C9A227',
  },
  modalBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: wellness.primaryDark,
  },
  modalMotivation: {
    color: wellness.text,
    fontSize: 15,
    marginTop: 6,
    marginBottom: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  modalPrimaryButton: {
    backgroundColor: wellness.primary,
    paddingVertical: 14,
    borderRadius: wellnessRadii.pill,
    marginBottom: 10,
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderColor: wellness.borderStrong,
    paddingVertical: 12,
    borderRadius: wellnessRadii.pill,
    backgroundColor: wellness.softGreen,
  },
  modalSecondaryButtonText: {
    color: wellness.primaryDark,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  savingOverlayText: {
    marginTop: 12,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  savingOverlaySubtext: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  loadingHint: {
    marginTop: 12,
    color: wellness.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  adjustmentNote: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  adjustmentNoteText: {
    color: '#9A7B1A',
    fontSize: 13,
    fontWeight: '600',
  },
  pauseModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: wellnessRadii.cardLarge,
    backgroundColor: wellness.card,
    borderWidth: 1,
    borderColor: wellness.border,
    padding: 22,
  },
  pauseModalTitle: {
    color: wellness.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  pauseModalSubtitle: {
    color: wellness.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
});

