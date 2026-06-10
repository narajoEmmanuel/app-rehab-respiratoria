import { isSensorRuntimeEnabled } from '@/src/config/sensor-runtime-guards';
import { SensorConnectionScreen } from '@/src/modules/device/screens/SensorConnectionScreen';
import { SensorUnavailableScreen } from '@/src/modules/device/screens/SensorUnavailableScreen';
import { isOfflineSensorTestEnabled } from '@/src/modules/device/offline-sensor-test';
import { ConsentStackGuard } from '@/src/modules/legal/ConsentStackGuard';

export default function SensorConnectionRoute() {
  if (!isSensorRuntimeEnabled()) {
    return <SensorUnavailableScreen backFallbackHref="/(tabs)" />;
  }

  return (
    <ConsentStackGuard allowOfflineDevBypass={isOfflineSensorTestEnabled}>
      <SensorConnectionScreen />
    </ConsentStackGuard>
  );
}
