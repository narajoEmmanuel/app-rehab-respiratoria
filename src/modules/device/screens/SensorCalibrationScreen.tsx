import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { isTechnicalCalibrationEnabled } from '@/src/modules/device/calibration/technical-calibration-flags';
import { SensorCalibrationPatientScreen } from '@/src/modules/device/screens/SensorCalibrationPatientScreen';
import { SensorCalibrationTechnicalCaptureScreen } from '@/src/modules/device/screens/SensorCalibrationTechnicalCaptureScreen';
import { SensorCalibrationTechnicalScreen } from '@/src/modules/device/screens/SensorCalibrationTechnicalScreen';
import { TechnicalCalibrationUnavailableScreen } from '@/src/modules/device/screens/TechnicalCalibrationUnavailableScreen';

/**
 * Calibración: vista paciente → modo técnico simplificado → captura multipunto (bajo demanda).
 * El modo técnico solo está disponible con EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=true.
 */
export function SensorCalibrationScreen() {
  const { openTechnical, openCapture } = useLocalSearchParams<{
    openTechnical?: string;
    openCapture?: string;
  }>();
  const technicalEnabled = isTechnicalCalibrationEnabled();
  const [technicalOpen, setTechnicalOpen] = useState(openTechnical === '1' || openTechnical === 'true');
  const [captureOpen, setCaptureOpen] = useState(openCapture === '1' || openCapture === 'true');

  if (!technicalEnabled) {
    if (technicalOpen || captureOpen) {
      return (
        <TechnicalCalibrationUnavailableScreen
          onClose={() => {
            setTechnicalOpen(false);
            setCaptureOpen(false);
          }}
        />
      );
    }

    return <SensorCalibrationPatientScreen technicalCalibrationEnabled={false} />;
  }

  if (captureOpen) {
    return (
      <SensorCalibrationTechnicalCaptureScreen
        onClose={() => {
          setCaptureOpen(false);
        }}
      />
    );
  }

  if (technicalOpen) {
    return (
      <SensorCalibrationTechnicalScreen
        onClose={() => setTechnicalOpen(false)}
        onOpenCapture={() => setCaptureOpen(true)}
      />
    );
  }

  return (
    <SensorCalibrationPatientScreen
      technicalCalibrationEnabled
      onOpenTechnical={() => setTechnicalOpen(true)}
    />
  );
}
