import { useState } from 'react';

import { SensorCalibrationPatientScreen } from '@/src/modules/device/screens/SensorCalibrationPatientScreen';
import { SensorCalibrationTechnicalScreen } from '@/src/modules/device/screens/SensorCalibrationTechnicalScreen';

/**
 * Pantalla de calibración / espirómetro: vista paciente por defecto; modo técnico bajo demanda.
 */
export function SensorCalibrationScreen() {
  const [technicalOpen, setTechnicalOpen] = useState(false);

  if (technicalOpen) {
    return <SensorCalibrationTechnicalScreen onClose={() => setTechnicalOpen(false)} />;
  }

  return <SensorCalibrationPatientScreen onOpenTechnical={() => setTechnicalOpen(true)} />;
}
