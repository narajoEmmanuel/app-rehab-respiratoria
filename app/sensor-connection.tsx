import { SensorConnectionScreen } from '@/src/modules/device/screens/SensorConnectionScreen';
import { isOfflineSensorTestEnabled } from '@/src/modules/device/offline-sensor-test';
import { ConsentStackGuard } from '@/src/modules/legal/ConsentStackGuard';

export default function SensorConnectionRoute() {
  return (
    <ConsentStackGuard allowOfflineDevBypass={isOfflineSensorTestEnabled}>
      <SensorConnectionScreen />
    </ConsentStackGuard>
  );
}
