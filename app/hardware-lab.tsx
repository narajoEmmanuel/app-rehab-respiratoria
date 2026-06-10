import { isSensorRuntimeEnabled } from '@/src/config/sensor-runtime-guards';
import { HardwareLabScreen } from '@/src/modules/device/screens/HardwareLabScreen';
import { SensorUnavailableScreen } from '@/src/modules/device/screens/SensorUnavailableScreen';
import { ConsentStackGuard } from '@/src/modules/legal/ConsentStackGuard';

export default function HardwareLabRoute() {
  if (!isSensorRuntimeEnabled()) {
    return <SensorUnavailableScreen backFallbackHref="/(tabs)" />;
  }

  return (
    <ConsentStackGuard>
      <HardwareLabScreen />
    </ConsentStackGuard>
  );
}
