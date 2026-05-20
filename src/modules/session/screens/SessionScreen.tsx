/**
 * Purpose: Session screen with playable Level 1 touch simulation.
 * Module: session
 * Dependencies: expo-router, levels persistence, game engine
 * Notes: Touch adapter is isolated so a WebSocket / WiFi-local sensor adapter can replace it later.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentActiveLevel } from '@/src/modules/diagnostics/diagnostic-service';
import { showTherapyReadinessAlert } from '@/src/modules/device/volume-estimation';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { evaluateLevelSensorReadiness } from '@/src/modules/session/sensor/level-sensor-readiness';
import type { VolumeEstimationReadinessStatus } from '@/src/modules/device/volume-estimation/volume-estimation-types';
import { useLevelSensorVolume } from '@/src/modules/session/sensor/use-level-sensor-volume';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import { saveLevelOneActiveRun } from '@/src/modules/levels/storage/level-one-active-run-storage';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
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
import {
  SessionEstimatedVolumeCard,
  type SessionDisplayVolumeSource,
} from '@/src/modules/session/games/components/SessionEstimatedVolumeCard';
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
import { persistSessionResult, TARGET_ATTEMPTS } from '@/src/modules/session/session-progress-service';
import type { SessionAttemptResult } from '@/src/modules/session/types/session-result';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

type SessionSummaryKind = 'completed' | 'interrupted' | null;

const REQUIRED_HOLD_MS = 3000;
/** En práctica, alcanzar la meta antes del countdown de 3 s si mantiene presionado. */
/** A los 2 s de presión el volumen simulado alcanza la meta (antes del sostén 3 s). */
const PRACTICE_VOLUME_RAMP_MS = 2000;
/** Umbral mínimo de volumen (mL) para detectar inicio de inspiración con sensor. */
const SENSOR_INHALE_START_MIN_ML = 60;
const SENSOR_INHALE_START_TARGET_RATIO = 0.07;

function simulatedVolumeForHold(targetVolumeMl: number, holdMs: number): number {
  return Math.round(
    Math.max(0, targetVolumeMl * Math.min(1.18, holdMs / PRACTICE_VOLUME_RAMP_MS)),
  );
}

function attemptFromOfficialValidation(
  valid: boolean,
  holdMs: number,
  validation: OfficialAttemptValidationResult,
  inputMode: ReturnType<typeof parseSessionInputMode>,
  sensorEvaluation?: ReturnType<typeof evaluateSensorAttemptVolume>,
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
  };
}

function sessionSummaryModalTitle(kind: SessionSummaryKind, sessionNumber: number): string {
  return kind === 'interrupted'
    ? `Sesion ${sessionNumber} interrumpida`
    : `Sesion ${sessionNumber} completada`;
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
    updateLevelOne,
    finalizeCurrentLevelOneSession,
    prepareFreshLevelOneSessionRun,
    discardInProgressLevelOneRun,
    clearLevelOneActiveRunMarker,
    repeatCurrentLevelOneSession,
    interruptCurrentLevelOneSession,
  } = useLevelsProgress();
  const selectedLevelId = (levelId ?? progress.selectedLevelId) as LevelId;
  const level = getLevelById(selectedLevelId);

  useEffect(() => {
    if (levelId && levelId !== progress.selectedLevelId) {
      selectLevel(levelId as LevelId);
    }
  }, [levelId, progress.selectedLevelId, selectLevel]);

  const isLevelOne = useMemo(() => selectedLevelId === 'level-1', [selectedLevelId]);
  const currentSessionData = progress.levelOne.sessions[progress.levelOne.currentSession - 1];

  const sensorConnection = useSensorConnection();
  const sensorConnectionRef = useRef(sensorConnection);
  sensorConnectionRef.current = sensorConnection;

  const levelSensor = useLevelSensorVolume({
    enabled: isFocused && isLevelOne && !isTouchPractice,
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
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingInterrupt, setSavingInterrupt] = useState(false);
  const [introAcknowledged, setIntroAcknowledged] = useState(false);
  const sessionCleanExitRef = useRef(false);
  const stopSessionRef = useRef<() => void>(() => {});
  const sensorInhaleArmedRef = useRef(true);

  useEffect(() => {
    if (isTouchPractice || !isLevelOne || !isFocused || !sessionRunId) {
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
    isLevelOne,
    isTouchPractice,
    patient?.paciente_id,
    router,
    sessionInputMode,
    sessionRunId,
  ]);

  const exitToTherapy = () => {
    router.replace('/(tabs)/terapia');
  };

  const markSessionCleanExit = useCallback(() => {
    sessionCleanExitRef.current = true;
    void clearLevelOneActiveRunMarker();
  }, [clearLevelOneActiveRunMarker]);

  const stopSessionRuntimeState = useCallback(() => {
    stopSessionRef.current();
    setSummaryDismissedKind(null);
    setAttemptsRuntime([]);
  }, []);

  const persistInterruptedSessionToHistory = async (
    valid: number,
    failed: number,
    attemptsSnapshot: SessionAttemptResult[],
  ) => {
    if (!patient || !patientLevelId) return;
    const result = buildSessionResult({
      patientId: patient.paciente_id,
      patientLevelId,
      levelId: selectedLevelId,
      status: 'interrupted',
      validAttempts: valid,
      invalidAttempts: failed,
      attemptsRuntime: attemptsSnapshot,
      inputMode: sessionInputMode,
    });
    await persistSessionResult(result);
  };

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
  });

  officialValidationDepsRef.current = {
    sessionInputMode,
    targetVolume,
    isTouchPractice,
  };

  const inspirationInputsRef = useRef({
    displayVolumeMl: 0,
    targetVolume: 1200,
    holdMs: 0,
  });

  const syncSensorInspirationInputs = useCallback(() => {
    if (isTouchPracticeRef.current) return;
    const snap = levelSensorGetSnapshotRef.current();
    inspirationInputsRef.current.displayVolumeMl = snap.estimatedVolumeMl;
    inspirationInputsRef.current.targetVolume = targetVolumeRef.current;
    inspirationInputsRef.current.holdMs = holdMsRef.current;
    if (
      holdMsRef.current > 0 &&
      (snap.estimatedVolumeMl > peakSensorVolumeRef.current)
    ) {
      peakSensorVolumeRef.current = snap.estimatedVolumeMl;
    }
  }, []);

  const getInspirationNorm = useCallback(() => {
    syncSensorInspirationInputs();
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
        estimationStatus: volumeEstimateStatus,
        inCalibratedRange: snap.estimate.inCalibratedRange,
        clamped: snap.estimate.clamped,
      });
    const validation = buildOfficialValidationFromLevelOneRelease({
      release: releaseEval,
      targetVolumeMl: deps.targetVolume,
      officialVolumeMl,
      inputMode: deps.sessionInputMode,
      u95Ml: snap?.estimate.u95Ml ?? null,
      confidenceLabel: sensorEval?.confidenceLabel as
        | OfficialAttemptValidationResult['confidenceLabel']
        | undefined,
    });
    return { valid: releaseEval.valid, failReason: releaseEval.failReason, validation };
  }, []);

  const lastResolvedValidationRef = useRef<OfficialAttemptValidationResult | null>(null);

  const levelOneEngine = useLevelOneGame({
    progress: progress.levelOne,
    engineScopeKey: levelOneEngineScopeKey,
    onProgressChange: updateLevelOne,
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
          estimationStatus: volumeEstimateStatus,
          inCalibratedRange: snap.estimate.inCalibratedRange,
          clamped: snap.estimate.clamped,
        });
      const validation =
        lastResolvedValidationRef.current ??
        evaluateOfficialAttempt({
          inputMode: deps.sessionInputMode,
          targetVolumeMl: deps.targetVolume,
          requiredHoldMs: REQUIRED_HOLD_MS,
          currentHoldMs: holdMs,
          simulatedVolumeMl: simulatedVolumeForHold(deps.targetVolume, holdMs),
          sensorAttemptEvaluation: sensorAttemptEvaluation ?? undefined,
          activeVolumeEstimate: snap?.estimate,
        });
      if (!deps.isTouchPractice) {
        const norm = computeInspirationNorm({
          displayVolumeMl: peakSensorVolumeRef.current,
          targetVolumeMl: deps.targetVolume,
          holdMs,
        });
        console.log('LEVEL HOLD EVALUATION', {
          rep: progress.levelOne.currentRepetition,
          isAboveObstacle: norm >= 1,
          pass: valid,
          failReason: valid ? null : 'obstacle_or_hold',
        });
      }
      setAttemptsRuntime((prev) => [
        ...prev,
        attemptFromOfficialValidation(
          valid,
          holdMs,
          validation,
          deps.sessionInputMode,
          sensorAttemptEvaluation ?? undefined,
        ),
      ]);
      lastResolvedValidationRef.current = null;
    },
  });
  const { restartCurrentSession, stopSession } = levelOneEngine;
  stopSessionRef.current = stopSession;

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

  useEffect(() => {
    if (isTouchPractice || !sensorEntryReady) return;
    if (levelOneEngine.phase === 'ready') {
      sensorInhaleArmedRef.current = true;
      peakSensorVolumeRef.current = 0;
    }
    if (levelOneEngine.phase !== 'ready' || !sensorInhaleArmedRef.current) return;
    const snap = levelSensorGetSnapshotRef.current();
    if (!snap.sensorConnected || snap.distanceMm === null) return;
    if (snap.estimatedVolumeMl < sensorInhaleStartThresholdMl) return;
    sensorInhaleArmedRef.current = false;
    levelOneEngine.onInhaleStart();
  }, [
    isTouchPractice,
    levelOneEngine.onInhaleStart,
    levelOneEngine.phase,
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
      setActiveLevelLoaded(true);
      return;
    }
    const activeLevel = await getCurrentActiveLevel(patient.paciente_id);
    setTargetVolume(activeLevel?.target_volume ?? 1200);
    setPatientLevelId(activeLevel?.patient_level_id ?? null);
    setActiveLevelLoaded(true);
  }, [patient]);

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
    if (isLoading || !isLevelOne) return;
    sessionCleanExitRef.current = false;
    prepareFreshLevelOneSessionRun();
    stopSession();
    setIntroAcknowledged(false);
    setSummaryDismissedKind(null);
    setAttemptsRuntime([]);
  }, [
    sessionEntryScopeKey,
    isLoading,
    isLevelOne,
    prepareFreshLevelOneSessionRun,
    stopSession,
  ]);

  useEffect(() => {
    if (isLoading || !patient || !isLevelOne || !sessionRunId) return;
    void saveLevelOneActiveRun(patient.paciente_id, {
      sessionRunId: String(sessionRunId),
      levelId: selectedLevelId,
      inputMode: sessionInputMode,
      updatedAt: Date.now(),
    });
  }, [sessionEntryScopeKey, isLoading, patient, isLevelOne, sessionRunId, selectedLevelId, sessionInputMode]);

  useEffect(() => {
    return () => {
      stopSessionRef.current();
      if (!sessionCleanExitRef.current) {
        return;
      }
    };
  }, []);

  const handleIntroComplete = useCallback(() => {
    prepareFreshLevelOneSessionRun();
    setAttemptsRuntime([]);
    setIntroAcknowledged(true);
    /** Tras el commit del progreso limpio: `startSession` no hace nada si la fase no es `not-started`. */
    setTimeout(() => {
      restartCurrentSession();
    }, 0);
  }, [prepareFreshLevelOneSessionRun, restartCurrentSession]);

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

      if (markLevelSlotInterrupted) {
        interruptCurrentLevelOneSession();
      } else {
        discardInProgressLevelOneRun();
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
      discardInProgressLevelOneRun,
      exitToTherapy,
      interruptCurrentLevelOneSession,
      markSessionCleanExit,
      persistInterruptedSessionToHistory,
      stopSessionRuntimeState,
    ],
  );

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

  const sessionDisplayVolumeMl = isTouchPractice
    ? simulatedVolume
    : levelSensor.displayVolumeMl;
  const sessionDisplaySource: SessionDisplayVolumeSource = isTouchPractice
    ? 'fallback'
    : levelSensor.modelReady && levelSensor.sensorConnected
      ? 'sensor'
      : 'fallback';
  const sessionDisplayU95Ml = isTouchPractice ? null : levelSensor.displayU95Ml;
  const sessionDisplayStatus = isTouchPractice ? undefined : volumeEstimateStatus;

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
        <Text style={styles.title}>Sesion</Text>
        <Text style={styles.detail}>Nivel no encontrado.</Text>
      </SafeAreaView>
    );
  }

  if (!isLevelOne) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Sesion - {level.title}</Text>
        <Text style={styles.detail}>Este nivel estara disponible proximamente.</Text>
        <Text style={styles.detail}>Por ahora juega el Nivel 1 en modo touch.</Text>
      </SafeAreaView>
    );
  }

  const validAttempts = currentSessionData?.validRepetitions ?? 0;
  const failedAttempts = currentSessionData?.failedRepetitions ?? 0;
  const totalAttempts = validAttempts + failedAttempts;
  const sessionCompliance =
    totalAttempts > 0 ? Math.round((validAttempts / TARGET_ATTEMPTS) * 100) : 0;
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
  const perfectSession =
    validAttempts === TARGET_ATTEMPTS && totalAttempts === TARGET_ATTEMPTS;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {savingInterrupt ? (
        <View style={styles.savingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={wellness.primary} />
          <Text style={styles.savingOverlayText}>Guardando tu sesión…</Text>
        </View>
      ) : null}
      <View style={styles.gameWrap}>
        <LevelOneGameView
          introMode={levelOneEngine.phase === 'not-started' && !introAcknowledged}
          onIntroComplete={handleIntroComplete}
          holdMs={levelOneEngine.holdMs}
          sustainMs={levelOneEngine.sustainMs}
          targetReached={levelOneEngine.targetReached}
          obstacleActive={levelOneEngine.obstacleActive}
          holdPrepSecondsRemaining={levelOneEngine.holdPrepSecondsRemaining}
          liveCrashSignal={levelOneEngine.liveCrashSignal}
          phase={levelOneEngine.phase}
          session={progress.levelOne.currentSession}
          repetition={progress.levelOne.currentRepetition}
          valid={validAttempts}
          failed={failedAttempts}
          holdSecondsRemaining={levelOneEngine.holdSecondsRemaining}
          prepSecondsRemaining={levelOneEngine.prepSecondsRemaining}
          restSecondsRemaining={levelOneEngine.restSecondsRemaining}
          attemptFeedback={levelOneEngine.attemptFeedback}
          levelLabel="Nivel 1"
          touchInputEnabled={isTouchPractice}
          onPressIn={inputPort.onInhaleStart}
          onPressOut={inputPort.onInhaleEnd}
          onPressStop={() => {
            Alert.alert(
              '¿Quieres pausar tu sesión?',
              'Puedes continuar ahora o guardar tu avance parcial y volver a Terapia.',
              [
                {
                  text: 'Continuar sesión',
                  style: 'cancel',
                },
                {
                  text: 'Guardar avance y salir',
                  style: 'destructive',
                  onPress: () => {
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
                  },
                },
              ]
            );
          }}
          simulatedVolume={simulatedVolume}
          displayVolumeMl={sessionDisplayVolumeMl}
          displayVolumeSource={sessionDisplaySource}
          displayU95Ml={sessionDisplayU95Ml}
          displayVolumeStatus={sessionDisplayStatus}
          sessionInputMode={sessionInputMode}
          targetVolume={targetVolume}
          sensorStatusSlot={
            isTouchPractice ? null : (
              <SessionEstimatedVolumeCard
                sessionInputMode={sessionInputMode}
                status={volumeEstimateStatus}
                displaySource={sessionDisplaySource}
              />
            )
          }
        />
      </View>
      <Modal
        visible={summaryKind !== null && summaryDismissedKind !== summaryKind}
        transparent
        animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHero}>
              <View style={styles.modalHeroIcon}>
                <Text style={styles.modalHeroIconText}>✓</Text>
              </View>
              <Text style={styles.modalHeroTitle}>¡Sesión completada!</Text>
              <Text style={styles.modalHeroSubtitle}>¡Buen trabajo!</Text>
            </View>
            <Text style={styles.modalTitle}>
              {sessionSummaryModalTitle(summaryKind, progress.levelOne.currentSession)}
            </Text>
            <View style={styles.modalMetaRow}>
              <Text style={styles.modalMetaChip}>Nivel 1</Text>
              <Text style={styles.modalMetaChip}>Sesión {progress.levelOne.currentSession}/6</Text>
            </View>
            <View style={styles.modalGrid}>
              <View style={styles.modalTile}>
                <Text style={styles.modalTileLabel}>Válidas</Text>
                <Text style={styles.modalTileValue}>{validAttempts}</Text>
              </View>
              <View style={styles.modalTile}>
                <Text style={styles.modalTileLabel}>Fallidas</Text>
                <Text style={styles.modalTileValue}>{failedAttempts}</Text>
              </View>
            </View>
            <View style={styles.modalComplianceBlock}>
              <Text style={styles.modalComplianceLabel}>Cumplimiento</Text>
              <View style={styles.modalComplianceTrack}>
                <View style={[styles.modalComplianceFill, { width: `${sessionCompliance}%` }]} />
              </View>
              <Text style={styles.modalCompliancePct}>{sessionCompliance}%</Text>
            </View>
            {perfectSession ? (
              <View style={styles.modalBadgeRow}>
                <Text style={styles.modalBadgeStar}>★</Text>
                <Text style={styles.modalBadgeText}>Sesión perfecta</Text>
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
                ? 'Excelente trabajo: repetición tras repetición con precisión.'
                : 'Buen avance. Sigue practicando para mejorar tu precisión.'}
            </Text>
            <Pressable
              style={[styles.modalPrimaryButton, savingSummary && { opacity: 0.7 }]}
              disabled={savingSummary}
              onPress={async () => {
                if (!patient || !patientLevelId) return;
                setSavingSummary(true);
                const result = buildSessionResult({
                  patientId: patient.paciente_id,
                  patientLevelId,
                  levelId: selectedLevelId,
                  status: 'completed',
                  validAttempts,
                  invalidAttempts: failedAttempts,
                  attemptsRuntime,
                  inputMode: sessionInputMode,
                });
                const savedSession = await persistSessionResult(result);
                if (!isTouchPractice) {
                  finalizeCurrentLevelOneSession();
                }
                markSessionCleanExit();
                levelOneEngine.stopSession();
                setAttemptsRuntime([]);
                setSummaryDismissedKind('completed');
                setSavingSummary(false);
                router.replace({
                  pathname: '/(tabs)/resumen',
                  params: { sessionId: String(savedSession.session_id) },
                });
              }}>
              <Text style={styles.modalPrimaryButtonText}>Continuar</Text>
            </Pressable>
            <Pressable
              style={styles.modalSecondaryButton}
              onPress={() => {
                if (summaryKind) {
                  setSummaryDismissedKind(summaryKind);
                }
                repeatCurrentLevelOneSession();
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
    fontSize: 28,
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
});

