/**
 * Snapshot ligero del perfil de calibración y modelo activo para terapia.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import {
  loadCalibrationProfileDetailed,
  type CalibrationProfile,
} from '@/src/modules/device/calibration';
import {
  resolveTherapyCalibrationReadiness,
  type TherapyCalibrationReadiness,
} from '@/src/modules/device/calibration/therapy-calibration-readiness';

export type CalibrationSnapshot =
  | { kind: 'loading' }
  | { kind: 'none'; therapy: TherapyCalibrationReadiness }
  | { kind: 'corrupt'; errorMessage: string; therapy: TherapyCalibrationReadiness }
  | { kind: 'ready'; profile: CalibrationProfile; therapy: TherapyCalibrationReadiness };

export type UseCalibrationSnapshotResult = {
  snapshot: CalibrationSnapshot;
  refresh: () => Promise<void>;
};

const EMPTY_THERAPY: TherapyCalibrationReadiness = {
  spirometerDeviceId: null,
  spirometerLabel: null,
  profile: null,
  activeModel: null,
  isModelStale: true,
  hasActiveModel: false,
  isReadyForTherapy: false,
  status: 'pending',
  statusLabel: 'Pendiente',
  detailMessage: null,
};

export function useCalibrationSnapshot(): UseCalibrationSnapshotResult {
  const [snapshot, setSnapshot] = useState<CalibrationSnapshot>({ kind: 'loading' });

  const refresh = useCallback(async () => {
    const result = await loadCalibrationProfileDetailed();
    const therapy = await resolveTherapyCalibrationReadiness();
    if (result.kind === 'ok') {
      const therapyForDevice = await resolveTherapyCalibrationReadiness(
        result.profile.spirometerDeviceId,
      );
      setSnapshot({ kind: 'ready', profile: result.profile, therapy: therapyForDevice });
    } else if (result.kind === 'empty') {
      setSnapshot({ kind: 'none', therapy });
    } else {
      setSnapshot({ kind: 'corrupt', errorMessage: result.errorMessage, therapy });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { snapshot, refresh };
}

/** @deprecated Usar `isTherapyReadyForActiveSpirometer` — el perfil solo no basta para terapia. */
export function isCalibrationReady(snapshot: CalibrationSnapshot): boolean {
  return snapshot.kind === 'ready' && snapshot.profile.points.length > 0;
}

export function isTherapyReadyForActiveSpirometer(snapshot: CalibrationSnapshot): boolean {
  if (snapshot.kind === 'loading') return false;
  return snapshot.therapy.isReadyForTherapy;
}

export function getTherapyFromSnapshot(snapshot: CalibrationSnapshot): TherapyCalibrationReadiness {
  if (snapshot.kind === 'loading') return EMPTY_THERAPY;
  return snapshot.therapy;
}
