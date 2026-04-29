/**
 * Purpose: Session screen with playable Level 1 touch simulation.
 * Module: session
 * Dependencies: expo-router, levels persistence, game engine
 * Notes: Touch adapter is isolated so BLE can replace it later.
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiagnosticLockedView } from '@/src/modules/diagnostics/components/DiagnosticLockedView';
import { getCurrentActiveLevel, hasDiagnostic } from '@/src/modules/diagnostics/diagnostic-service';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { useLevelOneGame } from '@/src/modules/session/engine/level-one/use-level-one-game';
import { useTouchInputAdapter } from '@/src/modules/session/engine/touch/use-touch-input-adapter';
import { LevelOneGameView } from '@/src/modules/session/games/components/LevelOneGameView';
import { getLevelById } from '@/src/modules/session/registry/level-registry';
import {
  checkAndUnlockNextLevel,
  createAttempt,
  createSession,
  updatePatientLevelProgress,
} from '@/src/modules/session/session-progress-service';

export function SessionScreen() {
  const router = useRouter();
  const { patient } = usePatientSession();
  const { levelId } = useLocalSearchParams<{ levelId?: string }>();
  const {
    isLoading,
    progress,
    selectLevel,
    updateLevelOne,
    finalizeCurrentLevelOneSession,
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

  const [summaryDismissedKind, setSummaryDismissedKind] = useState<'completed' | null>(null);
  const [diagnosticChecked, setDiagnosticChecked] = useState(false);
  const [hasCompletedDiagnostic, setHasCompletedDiagnostic] = useState(false);
  const [targetVolume, setTargetVolume] = useState(1200);
  const [patientLevelId, setPatientLevelId] = useState<number | null>(null);
  const [attemptsRuntime, setAttemptsRuntime] = useState<
    { valid: boolean; holdMs: number; peakVolume: number }[]
  >([]);
  const [savingSummary, setSavingSummary] = useState(false);

  useEffect(() => {
    if (!summaryKind) {
      setSummaryDismissedKind(null);
    }
  }, [summaryKind]);

  const levelOneEngine = useLevelOneGame({
    progress: progress.levelOne,
    onProgressChange: updateLevelOne,
    onAttemptResolved: ({ valid, holdMs }) => {
      const peakVolume = Math.round(
        targetVolume * Math.max(0.55, Math.min(1.25, holdMs / 3000)) + Math.random() * 35,
      );
      setAttemptsRuntime((prev) => [...prev, { valid, holdMs, peakVolume }]);
    },
  });
  const { restartCurrentSession, startSession } = levelOneEngine;
  const inputPort = useTouchInputAdapter({
    onInhaleStart: levelOneEngine.onInhaleStart,
    onInhaleEnd: levelOneEngine.onInhaleEnd,
  });
  const summaryKind = levelOneEngine.phase === 'session-complete' ? 'completed' : null;

  useEffect(() => {
    let active = true;
    const checkDiagnostic = async () => {
      if (!patient) {
        if (active) {
          setHasCompletedDiagnostic(false);
          setDiagnosticChecked(true);
        }
        return;
      }
      const exists = await hasDiagnostic(patient.paciente_id);
      const activeLevel = await getCurrentActiveLevel(patient.paciente_id);
      if (active) {
        setHasCompletedDiagnostic(exists);
        setTargetVolume(activeLevel?.target_volume ?? 1200);
        setPatientLevelId(activeLevel?.patient_level_id ?? null);
        setDiagnosticChecked(true);
      }
    };
    void checkDiagnostic();
    return () => {
      active = false;
    };
  }, [patient]);

  if (isLoading || !diagnosticChecked) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6dcf4a" />
      </SafeAreaView>
    );
  }

  if (!hasCompletedDiagnostic) {
    return (
      <SafeAreaView style={styles.centered}>
        <DiagnosticLockedView />
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

  const simulatedVolume = Math.round(
    Math.max(0, targetVolume * Math.min(1.15, levelOneEngine.holdMs / 3000)),
  );
  const validAttempts = currentSessionData?.validRepetitions ?? 0;
  const failedAttempts = currentSessionData?.failedRepetitions ?? 0;
  const totalAttempts = validAttempts + failedAttempts;
  const sessionCompliance = totalAttempts > 0 ? Math.round((validAttempts / 10) * 100) : 0;
  const maxVolume = attemptsRuntime.length > 0 ? Math.max(...attemptsRuntime.map((item) => item.peakVolume)) : 0;
  const avgVolume =
    attemptsRuntime.length > 0
      ? Math.round(attemptsRuntime.reduce((sum, item) => sum + item.peakVolume, 0) / attemptsRuntime.length)
      : 0;
  const avgHoldSeconds =
    attemptsRuntime.length > 0
      ? attemptsRuntime.reduce((sum, item) => sum + item.holdMs, 0) / attemptsRuntime.length / 1000
      : 0;
  const perfectSession = validAttempts === 10 && totalAttempts >= 10;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.screenTitle}>Nivel 1 - Modo Touch</Text>
      <Text style={styles.screenSubtitle}>Respira, juega y completa tus repeticiones.</Text>

      {levelOneEngine.phase !== 'not-started' ? (
        <LevelOneGameView
          phase={levelOneEngine.phase}
          session={progress.levelOne.currentSession}
          repetition={progress.levelOne.currentRepetition}
          valid={progress.levelOne.totalValid}
          failed={progress.levelOne.totalFailed}
          holdSecondsRemaining={levelOneEngine.holdSecondsRemaining}
          prepSecondsRemaining={levelOneEngine.prepSecondsRemaining}
          restSecondsRemaining={levelOneEngine.restSecondsRemaining}
          attemptFeedback={levelOneEngine.attemptFeedback}
          onPressIn={inputPort.onInhaleStart}
          onPressOut={inputPort.onInhaleEnd}
          onPressStop={() => {
            Alert.alert(
              '¿Desea detener la sesión?',
              'Elige una opción para detener la sesión actual.',
              [
                {
                  text: 'Volver a Niveles',
                  onPress: () => {
                    interruptCurrentLevelOneSession();
                    levelOneEngine.stopSession();
                    setSummaryDismissedKind(null);
                    router.push('/(tabs)/niveles');
                  },
                },
                {
                  text: 'Detener sesión',
                  style: 'destructive',
                  onPress: () => {
                    interruptCurrentLevelOneSession();
                    levelOneEngine.stopSession();
                    setSummaryDismissedKind(null);
                  },
                },
              ]
            );
          }}
          simulatedVolume={simulatedVolume}
          targetVolume={targetVolume}
          holdSeconds={levelOneEngine.holdMs / 1000}
        />
      ) : null}
      {levelOneEngine.phase === 'not-started' ? (
        <View style={styles.startCard}>
          <Text style={styles.startTitle}>Listo para jugar</Text>
          <Text style={styles.startText}>Toca INICIAR para comenzar la sesion.</Text>
          <Pressable
            style={styles.startButton}
            onPress={() => {
              if (currentSessionData?.interrupted && !currentSessionData.completed) {
                repeatCurrentLevelOneSession();
              }
              setAttemptsRuntime([]);
              startSession();
            }}>
            <Text style={styles.startButtonText}>INICIAR</Text>
          </Pressable>
        </View>
      ) : null}
      <Modal
        visible={summaryKind !== null && summaryDismissedKind !== summaryKind}
        transparent
        animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {summaryKind === 'interrupted'
                ? `Sesion ${progress.levelOne.currentSession} interrumpida`
                : `Sesion ${progress.levelOne.currentSession} completada`}
            </Text>
            <Text style={styles.modalLine}>Repeticiones validas: {currentSessionData?.validRepetitions ?? 0}</Text>
            <Text style={styles.modalLine}>
              Repeticiones fallidas: {currentSessionData?.failedRepetitions ?? 0}
            </Text>
            <Text style={styles.modalLine}>Porcentaje de cumplimiento: {sessionCompliance}%</Text>
            <Text style={styles.modalLine}>Volumen maximo: {maxVolume} mL</Text>
            <Text style={styles.modalLine}>Volumen promedio: {avgVolume} mL</Text>
            <Text style={styles.modalLine}>Tiempo promedio sostenido: {avgHoldSeconds.toFixed(1)} s</Text>
            <Text style={styles.modalLine}>Sesion perfecta: {perfectSession ? 'Sí' : 'No'}</Text>
            <Text style={styles.modalMotivation}>
              {sessionCompliance === 100
                ? 'Excelente trabajo, sesion perfecta.'
                : 'Buen avance. Sigue practicando para mejorar tu precision.'}
            </Text>
            <Pressable
              style={[styles.modalPrimaryButton, savingSummary && { opacity: 0.7 }]}
              disabled={savingSummary}
              onPress={async () => {
                if (!patient || !patientLevelId) return;
                setSavingSummary(true);
                const savedSession = await createSession(patient.paciente_id, patientLevelId, {
                  level_id: selectedLevelId,
                  valid_attempts: validAttempts,
                  total_attempts: totalAttempts,
                  invalid_attempts: failedAttempts,
                  compliance_percent: sessionCompliance,
                  max_volume: maxVolume,
                  avg_volume: avgVolume,
                  avg_hold_seconds: avgHoldSeconds,
                  completed: true,
                  perfect: perfectSession,
                });
                for (const attempt of attemptsRuntime) {
                  await createAttempt(savedSession.session_id, {
                    hold_ms: attempt.holdMs,
                    peak_volume: attempt.peakVolume,
                    valid: attempt.valid,
                  });
                }
                await updatePatientLevelProgress(patient.paciente_id, patientLevelId);
                await checkAndUnlockNextLevel(patient.paciente_id);
                finalizeCurrentLevelOneSession();
                levelOneEngine.stopSession();
                setAttemptsRuntime([]);
                setSummaryDismissedKind('completed');
                setSavingSummary(false);
                router.push('/(tabs)/niveles');
              }}>
              <Text style={styles.modalPrimaryButtonText}>
                Finalizar sesion
              </Text>
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
              <Text style={styles.modalSecondaryButtonText}>Repetir sesion</Text>
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
    backgroundColor: '#183911',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#183911',
  },
  container: {
    flex: 1,
    backgroundColor: '#183911',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  detail: {
    marginTop: 10,
    color: '#dbffc8',
    fontSize: 16,
    textAlign: 'center',
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
    marginBottom: 14,
  },
  startCard: {
    marginTop: 10,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#9de765',
    backgroundColor: '#234d16',
    padding: 18,
    alignItems: 'center',
  },
  startTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  startText: {
    marginTop: 8,
    color: '#d7ffc4',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 14,
  },
  startButton: {
    width: '100%',
    backgroundColor: '#9cff54',
    borderRadius: 14,
    paddingVertical: 16,
  },
  startButtonText: {
    textAlign: 'center',
    color: '#17300d',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#234d16',
    borderWidth: 1,
    borderColor: '#9de765',
    padding: 18,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  modalLine: {
    color: '#d7ffc4',
    fontSize: 16,
    marginBottom: 6,
  },
  modalMotivation: {
    color: '#fff6c8',
    fontSize: 15,
    marginTop: 4,
    marginBottom: 14,
    fontWeight: '600',
  },
  modalPrimaryButton: {
    backgroundColor: '#80dd4f',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  modalPrimaryButtonText: {
    color: '#17300d',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderColor: '#b7f58f',
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalSecondaryButtonText: {
    color: '#e6ffd8',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
});

