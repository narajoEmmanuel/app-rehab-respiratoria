/**
 * Purpose: Expo Router route — Hardware Lab (dev hub for ESP32 / sensor tests).
 * Module: app routing
 */
import { HardwareLabScreen } from '@/src/modules/device/screens/HardwareLabScreen';
import { ConsentStackGuard } from '@/src/modules/legal/ConsentStackGuard';

export default function HardwareLabRoute() {
  return (
    <ConsentStackGuard>
      <HardwareLabScreen />
    </ConsentStackGuard>
  );
}
