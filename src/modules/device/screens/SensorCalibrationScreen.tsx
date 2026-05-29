import { useState } from 'react';

import { SensorCalibrationPatientScreen } from '@/src/modules/device/screens/SensorCalibrationPatientScreen';
import { SensorCalibrationTechnicalCaptureScreen } from '@/src/modules/device/screens/SensorCalibrationTechnicalCaptureScreen';
import { SensorCalibrationTechnicalScreen } from '@/src/modules/device/screens/SensorCalibrationTechnicalScreen';

/**
 * Calibración: vista paciente → modo técnico simplificado → captura multipunto (bajo demanda).
 */
export function SensorCalibrationScreen() {
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);

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

  return <SensorCalibrationPatientScreen onOpenTechnical={() => setTechnicalOpen(true)} />;
}
