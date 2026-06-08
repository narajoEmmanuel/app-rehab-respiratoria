/**
 * Purpose: Shared therapy session launch — navigate, sensor readiness, touch vs sensor mode.
 * Module: session/hooks
 */

import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { isSensorRuntimeEnabled } from '@/src/config/sensor-runtime-guards';
import {
  showTherapyReadinessAlert,
  useTherapyReadinessGate,
} from '@/src/modules/device/volume-estimation';
import { isRealSensorTransportConnected } from '@/src/modules/device/sensor-real-connection';
import { useSensorConnection } from '@/src/modules/device/state/SensorConnectionProvider';
import { useLevelsProgress } from '@/src/modules/levels/state/use-levels-progress';
import type { LevelId } from '@/src/modules/levels/types/level-progress';
import { usePatientSession } from '@/src/modules/patient/context/PatientSessionContext';
import { resolveTherapySessionLaunchInputMode } from '@/src/modules/session/hooks/resolve-therapy-session-launch';
import { useTouchPracticeGate } from '@/src/modules/session/hooks/use-touch-practice-gate';
import { logLevelSensorModeSelected } from '@/src/modules/session/sensor/level-sensor-debug';
import { evaluateLevelSensorReadiness } from '@/src/modules/session/sensor/level-sensor-readiness';
import type { SessionInputMode } from '@/src/modules/session/session-input-mode';

export function useTherapySessionLauncher() {
  const router = useRouter();
  const { patient } = usePatientSession();
  const { selectLevel } = useLevelsProgress();
  const {
    lastReading,
    sensorConnected: therapyGateSensorConnected,
    sensorStatus: therapyGateSensorStatus,
  } = useTherapyReadinessGate();
  const {
    lastDataReceivedAt,
    sensorStreamState,
    status: sensorStatus,
    mode: sensorMode,
  } = useSensorConnection();

  const sensorRuntimeEnabled = isSensorRuntimeEnabled();
  const sensorTransportConnected =
    sensorRuntimeEnabled && isRealSensorTransportConnected(sensorStatus, sensorMode);
  const { effectiveTouchPracticeEnabled } = useTouchPracticeGate({
    sensorConnected: sensorTransportConnected,
  });

  const [launchingLevelId, setLaunchingLevelId] = useState<LevelId | null>(null);

  const navigateToSession = useCallback(
    (levelId: LevelId, inputMode: SessionInputMode) => {
      selectLevel(levelId);
      router.push({
        pathname: '/(tabs)/sesion',
        params: {
          levelId,
          sessionRunId: `${levelId}-${Date.now()}`,
          inputMode,
        },
      });
    },
    [router, selectLevel],
  );

  const beginOfficialSensorSession = useCallback(
    async (levelId: LevelId) => {
      if (!sensorRuntimeEnabled) {
        Alert.alert(
          'Terapia con sensor no disponible',
          'En este modo la terapia con espirómetro no está disponible. La práctica táctil se habilitará en una fase posterior.',
          [{ text: 'Entendido', style: 'default' }],
        );
        return;
      }

      setLaunchingLevelId(levelId);
      try {
        const readiness = await evaluateLevelSensorReadiness({
          inputMode: 'sensor',
          sensorConnected: therapyGateSensorConnected,
          sensorStatus: therapyGateSensorStatus,
          lastReading,
          receivedAtMs: lastDataReceivedAt,
          sensorStreamState,
          patientId: patient?.paciente_id ?? null,
        });

        if (!readiness.canStart) {
          if (readiness.blockReason === 'no_live_reading') {
            Alert.alert(
              'Esperando datos del sensor',
              'Conecta el sensor y verifica que esté enviando lecturas antes de comenzar.',
              [{ text: 'Entendido', style: 'default' }],
            );
            return;
          }
          showTherapyReadinessAlert(readiness.gate, (route) => router.push(route));
          return;
        }

        navigateToSession(levelId, 'sensor');
      } finally {
        setLaunchingLevelId(null);
      }
    },
    [
      lastReading,
      lastDataReceivedAt,
      navigateToSession,
      patient?.paciente_id,
      router,
      sensorStreamState,
      sensorRuntimeEnabled,
      therapyGateSensorConnected,
      therapyGateSensorStatus,
    ],
  );

  const launchTherapySession = useCallback(
    (levelId: LevelId) => {
      const launchMode = resolveTherapySessionLaunchInputMode({
        sensorTransportConnected,
        effectiveTouchPracticeEnabled,
      });
      logLevelSensorModeSelected(launchMode);
      if (launchMode === 'touch_practice') {
        navigateToSession(levelId, 'touch_practice');
        return;
      }
      if (!sensorRuntimeEnabled) {
        Alert.alert(
          'Terapia con sensor no disponible',
          'En este modo la terapia con espirómetro no está disponible. La práctica táctil se habilitará en una fase posterior.',
          [{ text: 'Entendido', style: 'default' }],
        );
        return;
      }
      void beginOfficialSensorSession(levelId);
    },
    [
      beginOfficialSensorSession,
      effectiveTouchPracticeEnabled,
      navigateToSession,
      sensorRuntimeEnabled,
      sensorTransportConnected,
    ],
  );

  return {
    launchingLevelId,
    launchTherapySession,
    navigateToSession,
    beginOfficialSensorSession,
  };
}
