import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { isTechnicalCalibrationEnabled } from '@/src/modules/device/calibration/technical-calibration-flags';
import { SensorCalibrationPatientScreen } from '@/src/modules/device/screens/SensorCalibrationPatientScreen';
import { SensorCalibrationTechnicalCaptureScreen } from '@/src/modules/device/screens/SensorCalibrationTechnicalCaptureScreen';
import { SensorCalibrationTechnicalScreen } from '@/src/modules/device/screens/SensorCalibrationTechnicalScreen';
import { TechnicalCalibrationUnavailableScreen } from '@/src/modules/device/screens/TechnicalCalibrationUnavailableScreen';

/**
 * Calibración: vista paciente → modo técnico simplificado → captura multipunto (bajo demanda).
 * El modo técnico solo está disponible con EXPO_PUBLIC_ENABLE_TECHNICAL_CALIBRATION=true,
 * salvo acceso explícito desde CalibrationTechnicalSummaryScreen (fromTechnicalSummary=1).
 */
export function SensorCalibrationScreen() {
  const { openTechnical, openCapture, fromTechnicalSummary } = useLocalSearchParams<{
    openTechnical?: string;
    openCapture?: string;
    fromTechnicalSummary?: string;
  }>();
  const technicalEnabled = isTechnicalCalibrationEnabled();
  const fromSummary =
    fromTechnicalSummary === '1' || fromTechnicalSummary === 'true';
  const allowTechnicalFlow = technicalEnabled || fromSummary;

  const [technicalOpen, setTechnicalOpen] = useState(openTechnical === '1' || openTechnical === 'true');
  const [captureOpen, setCaptureOpen] = useState(openCapture === '1' || openCapture === 'true');

  if (!allowTechnicalFlow) {
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
      technicalCalibrationEnabled={technicalEnabled}
      onOpenTechnical={() => setTechnicalOpen(true)}
    />
  );
}
