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

import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { useLevelOneGame } from '@/src/modules/session/engine/level-one/use-level-one-game';
import { useTouchInputAdapter } from '@/src/modules/session/engine/touch/use-touch-input-adapter';
import { LevelOneGameView } from '@/src/modules/session/games/components/LevelOneGameView';
import { getLevelById } from '@/src/modules/session/registry/level-registry';

export function SessionScreen() {
  const router = useRouter();
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

  const levelOneEngine = useLevelOneGame({
    progress: progress.levelOne,
    onProgressChange: updateLevelOne,
  });
  const { restartCurrentSession, startSession } = levelOneEngine;
  const inputPort = useTouchInputAdapter({
    onInhaleStart: levelOneEngine.onInhaleStart,
    onInhaleEnd: levelOneEngine.onInhaleEnd,
  });

  const isLevelOne = useMemo(() => selectedLevelId === 'level-1', [selectedLevelId]);
  const currentSessionData = progress.levelOne.sessions[progress.levelOne.currentSession - 1];
  const sessionCompliance = currentSessionData
    ? Math.round((currentSessionData.validRepetitions / 10) * 100)
    : 0;

  const summaryKind =
    levelOneEngine.phase === 'session-complete'
      ? 'completed'
      : null;

  const [summaryDismissedKind, setSummaryDismissedKind] = useState<'completed' | null>(null);

  useEffect(() => {
    if (!summaryKind) {
      setSummaryDismissedKind(null);
    }
  }, [summaryKind]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6dcf4a" />
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
            <Text style={styles.modalMotivation}>
              {sessionCompliance === 100
                ? 'Excelente trabajo, sesion perfecta.'
                : 'Buen avance. Sigue practicando para mejorar tu precision.'}
            </Text>
            <Pressable
              style={styles.modalPrimaryButton}
              onPress={() => {
                finalizeCurrentLevelOneSession();
                levelOneEngine.stopSession();
                setSummaryDismissedKind('completed');
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

