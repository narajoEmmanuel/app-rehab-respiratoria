import { runtimeEnv } from '@/src/config/runtime-env';
import { isSensorRuntimeEnabled } from '@/src/config/sensor-runtime-guards';
import { SensorConnectionScreen } from '@/src/modules/device/screens/SensorConnectionScreen';
import { SensorUnavailableScreen } from '@/src/modules/device/screens/SensorUnavailableScreen';
import { isOfflineSensorTestEnabled } from '@/src/modules/device/offline-sensor-test';
import { ConsentStackGuard } from '@/src/modules/legal/ConsentStackGuard';

export default function SensorConnectionRoute() {
  if (!isSensorRuntimeEnabled()) {
    // web_touch: misma pantalla normal de sensor, pero en modo demo read-only
    // (conectar deshabilitado, sin WebSocket, visualización técnica integrada).
    if (runtimeEnv.isWebTouch) {
      return (
        <ConsentStackGuard allowOfflineDevBypass={isOfflineSensorTestEnabled}>
          <SensorConnectionScreen readOnlyWebDemo />
        </ConsentStackGuard>
      );
    }
    return <SensorUnavailableScreen backFallbackHref="/(tabs)" />;
  }

  return (
    <ConsentStackGuard allowOfflineDevBypass={isOfflineSensorTestEnabled}>
      <SensorConnectionScreen />
    </ConsentStackGuard>
  );
}
