import { CalibrationTechnicalSummaryScreen } from '@/src/modules/device/screens/CalibrationTechnicalSummaryScreen';
import { ConsentStackGuard } from '@/src/modules/legal/ConsentStackGuard';
import { isOfflineSensorTestEnabled } from '@/src/modules/device/offline-sensor-test';

export default function CalibrationTechnicalSummaryRoute() {
  return (
    <ConsentStackGuard allowOfflineDevBypass={isOfflineSensorTestEnabled}>
      <CalibrationTechnicalSummaryScreen />
    </ConsentStackGuard>
  );
}
