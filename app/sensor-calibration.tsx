import { SensorCalibrationScreen } from '@/src/modules/device/screens/SensorCalibrationScreen';
import { isOfflineSensorTestEnabled } from '@/src/modules/device/offline-sensor-test';
import { ConsentStackGuard } from '@/src/modules/legal/ConsentStackGuard';

export default function SensorCalibrationRoute() {
  return (
    <ConsentStackGuard allowOfflineDevBypass={isOfflineSensorTestEnabled}>
      <SensorCalibrationScreen />
    </ConsentStackGuard>
  );
}
