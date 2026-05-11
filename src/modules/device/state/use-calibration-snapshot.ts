/**
 * Snapshot ligero del perfil de calibración guardado.
 * Lo consumen pantallas que solo necesitan saber si hay calibración local lista:
 * HomeScreen, LevelsScreen (precondición de Terapia), SensorConnectionScreen.
 *
 * No abre el WebSocket ni toca el sensor; solo lee AsyncStorage.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import {
  loadCalibrationProfileDetailed,
  type CalibrationProfile,
} from '@/src/modules/device/calibration';

export type CalibrationSnapshot =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'corrupt'; errorMessage: string }
  | { kind: 'ready'; profile: CalibrationProfile };

export type UseCalibrationSnapshotResult = {
  snapshot: CalibrationSnapshot;
  refresh: () => Promise<void>;
};

export function useCalibrationSnapshot(): UseCalibrationSnapshotResult {
  const [snapshot, setSnapshot] = useState<CalibrationSnapshot>({ kind: 'loading' });

  const refresh = useCallback(async () => {
    const result = await loadCalibrationProfileDetailed();
    if (result.kind === 'ok') {
      setSnapshot({ kind: 'ready', profile: result.profile });
    } else if (result.kind === 'empty') {
      setSnapshot({ kind: 'none' });
    } else {
      setSnapshot({ kind: 'corrupt', errorMessage: result.errorMessage });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { snapshot, refresh };
}

export function isCalibrationReady(snapshot: CalibrationSnapshot): boolean {
  return snapshot.kind === 'ready' && snapshot.profile.points.length > 0;
}
