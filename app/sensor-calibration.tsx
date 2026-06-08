import { isSensorRuntimeEnabled } from '@/src/config/sensor-runtime-guards';
import { SensorCalibrationScreen } from '@/src/modules/device/screens/SensorCalibrationScreen';
import { SensorUnavailableScreen } from '@/src/modules/device/screens/SensorUnavailableScreen';
import { isOfflineSensorTestEnabled } from '@/src/modules/device/offline-sensor-test';
import { ConsentStackGuard } from '@/src/modules/legal/ConsentStackGuard';

export default function SensorCalibrationRoute() {
  if (!isSensorRuntimeEnabled()) {
    return <SensorUnavailableScreen backFallbackHref="/(tabs)/index" />;
  }

  return (
    <ConsentStackGuard allowOfflineDevBypass={isOfflineSensorTestEnabled}>
      <SensorCalibrationScreen />
    </ConsentStackGuard>
  );
}
