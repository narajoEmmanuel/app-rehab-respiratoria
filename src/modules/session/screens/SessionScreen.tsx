/**
 * Purpose: Session screen with playable Level 1 touch simulation.
 * Module: session
 * Dependencies: expo-router, levels persistence, game engine
 * Notes: Touch adapter is isolated so a WebSocket / WiFi-local sensor adapter can replace it later.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentActiveLevel } from '@/src/modules/diagnostics/diagnostic-service';
import { useActiveVolumeEstimate } from '@/src/modules/device/volume-estimation';
import type { VolumeEstimationReadinessStatus } from '@/src/modules/device/volume-estimation/volume-estimation-types';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { useLevelOneGame } from '@/src/modules/session/engine/level-one/use-level-one-game';
import { useTouchInputAdapter } from '@/src/modules/session/engine/touch/use-touch-input-adapter';
import { LevelOneGameView } from '@/src/modules/session/games/components/LevelOneGameView';
import {
  SessionEstimatedVolumeCard,
  type SessionDisplayVolumeSource,
} from '@/src/modules/session/games/components/SessionEstimatedVolumeCard';
import { getLevelById } from '@/src/modules/session/registry/level-registry';
import { buildSessionResult } from '@/src/modules/session/session-result-factory';
import { persistSessionResult, TARGET_ATTEMPTS } from '@/src/modules/session/session-progress-service';
import { wellness, wellnessRadii } from '@/src/shared/theme/wellness-theme';

type SessionSummaryKind = 'completed' | 'interrupted' | null;

function sessionSummaryModalTitle(kind: SessionSummaryKind, sessionNumber: number): string {
  return kind === 'interrupted'
    ? `Sesion ${sessionNumber} interrumpida`
    : `Sesion ${sessionNumber} completada`;
}

export function SessionScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { patient } = usePatientSession();
  const { levelId, sessionRunId } = useLocalSearchParams<{ levelId?: string; sessionRunId?: string }>();
  const {
    isLoading,
    progress,
    selectLevel,
    updateLevelOne,
    finalizeCurrentLevelOneSession,
    prepareFreshLevelOneSessionRun,
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

  const { estimate: activeVolumeEstimate, status: volumeEstimateStatus } = useActiveVolumeEstimate({
    enabled: isFocused && isLevelOne,
  });

  const [summaryDismissedKind, setSummaryDismissedKind] = useState<SessionSummaryKind>(null);
  const [activeLevelLoaded, setActiveLevelLoaded] = useState(false);
  const [targetVolume, setTargetVolume] = useState(1200);
  const [patientLevelId, setPatientLevelId] = useState<number | null>(null);
  const [attemptsRuntime, setAttemptsRuntime] = useState<
    { valid: boolean; holdMs: number; peakVolume: number }[]
  >([]);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingInterrupt, setSavingInterrupt] = useState(false);
  const [isExitingSession, setIsExitingSession] = useState(false);
  const [introAcknowledged, setIntroAcknowledged] = useState(false);

  const exitToTherapy = () => {
    router.replace('/(tabs)/terapia');
  };

  const stopSessionRuntimeState = () => {
    levelOneEngine.stopSession();
    setSummaryDismissedKind(null);
    setAttemptsRuntime([]);
  };

  const persistInterruptedSessionToHistory = async (
    valid: number,
    failed: number,
    attemptsSnapshot: { valid: boolean; holdMs: number; peakVolume: number }[],
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
    });
    await persistSessionResult(result);
  };

  const levelOneEngineScopeKey = `${patient?.paciente_id ?? ''}|${String(sessionRunId ?? '')}`;

  const levelOneEngine = useLevelOneGame({
    progress: progress.levelOne,
    engineScopeKey: levelOneEngineScopeKey,
    onProgressChange: updateLevelOne,
    onAttemptResolved: ({ valid, holdMs }) => {
      const peakVolume = Math.round(
        targetVolume * Math.max(0.55, Math.min(1.25, holdMs / 3000)) + Math.random() * 35,
      );
      setAttemptsRuntime((prev) => [...prev, { valid, holdMs, peakVolume }]);
    },
  });
  const { restartCurrentSession, stopSession } = levelOneEngine;
  const summaryKind: SessionSummaryKind =
    levelOneEngine.phase === 'session-complete' ? 'completed' : null;

  useEffect(() => {
    if (!summaryKind) {
      setSummaryDismissedKind(null);
    }
  }, [summaryKind]);

  const inputPort = useTouchInputAdapter({
    onInhaleStart: levelOneEngine.onInhaleStart,
    onInhaleEnd: levelOneEngine.onInhaleEnd,
  });

  useEffect(() => {
    let active = true;
    setActiveLevelLoaded(false);
    const loadActiveLevel = async () => {
      if (!patient) {
        if (active) {
          setPatientLevelId(null);
          setTargetVolume(1200);
          setActiveLevelLoaded(true);
        }
        return;
      }
      const activeLevel = await getCurrentActiveLevel(patient.paciente_id);
      if (active) {
        setTargetVolume(activeLevel?.target_volume ?? 1200);
        setPatientLevelId(activeLevel?.patient_level_id ?? null);
        setActiveLevelLoaded(true);
      }
    };
    void loadActiveLevel();
    return () => {
      active = false;
    };
  }, [patient]);

  useEffect(() => {
    if (isLoading) return;
    prepareFreshLevelOneSessionRun();
    stopSession();
    setIsExitingSession(false);
    setIntroAcknowledged(false);
    setSummaryDismissedKind(null);
    setAttemptsRuntime([]);
  }, [sessionRunId, patient?.paciente_id, isLoading, prepareFreshLevelOneSessionRun, stopSession]);

  const handleIntroComplete = useCallback(() => {
    prepareFreshLevelOneSessionRun();
    setAttemptsRuntime([]);
    setIntroAcknowledged(true);
    /** Tras el commit del progreso limpio: `startSession` no hace nada si la fase no es `not-started`. */
    setTimeout(() => {
      restartCurrentSession();
    }, 0);
  }, [prepareFreshLevelOneSessionRun, restartCurrentSession]);

  const simulatedVolume = useMemo(
    () =>
      Math.round(Math.max(0, targetVolume * Math.min(1.15, levelOneEngine.holdMs / 3000))),
    [targetVolume, levelOneEngine.holdMs],
  );

  // Fase 3A.8: el volumen estimado alimenta solo la visualización. La validación de intentos y persistencia se integrarán en una fase posterior.
  const {
    sessionDisplayVolumeMl,
    sessionDisplaySource,
    sessionDisplayU95Ml,
    sessionDisplayStatus,
  } = useMemo(() => {
    const rounded = activeVolumeEstimate.roundedVolumeMl;
    const hasValidRoundedVolume =
      rounded !== null && Number.isFinite(rounded);
    const sensorVisualStatuses: VolumeEstimationReadinessStatus[] = ['ready', 'out_of_range'];
    const useSensorDisplay =
      hasValidRoundedVolume && sensorVisualStatuses.includes(volumeEstimateStatus);

    if (useSensorDisplay) {
      return {
        sessionDisplayVolumeMl: rounded as number,
        sessionDisplaySource: 'sensor' as SessionDisplayVolumeSource,
        sessionDisplayU95Ml: activeVolumeEstimate.u95Ml,
        sessionDisplayStatus: volumeEstimateStatus,
      };
    }

    return {
      sessionDisplayVolumeMl: simulatedVolume,
      sessionDisplaySource: 'fallback' as SessionDisplayVolumeSource,
      sessionDisplayU95Ml: null,
      sessionDisplayStatus: volumeEstimateStatus,
    };
  }, [activeVolumeEstimate, simulatedVolume, volumeEstimateStatus]);

  if (isLoading || !activeLevelLoaded) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={wellness.primary} />
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
                    const shouldPersistInterrupted = totalAttemptsSnap > 0;

                    if (shouldPersistInterrupted) {
                      interruptCurrentLevelOneSession();
                      setSavingInterrupt(true);
                    }
                    setIsExitingSession(true);
                    stopSessionRuntimeState();
                    void (async () => {
                      try {
                        if (shouldPersistInterrupted) {
                          await persistInterruptedSessionToHistory(validSnap, failedSnap, attemptsSnap);
                        }
                      } catch {
                        /* historial opcional: no bloquear salida */
                      } finally {
                        setSavingInterrupt(false);
                      }
                      exitToTherapy();
                    })();
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
          targetVolume={targetVolume}
          holdSeconds={levelOneEngine.holdMs / 1000}
          sensorStatusSlot={
            <SessionEstimatedVolumeCard
              status={volumeEstimateStatus}
              displaySource={sessionDisplaySource}
            />
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
                });
                const savedSession = await persistSessionResult(result);
                finalizeCurrentLevelOneSession();
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
});

