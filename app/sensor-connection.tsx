/**
 * Purpose: Expo Router route for sensor connection & calibration (simulated).
 * Module: app routing
 * Dependencies: device module screen
 * Notes: Thin wrapper; screen lives in src/modules/device. To make a tab later, add
 * app/(tabs)/sensor.tsx that re-exports the same component.
 */
import { SensorConnectionScreen } from '@/src/modules/device/screens/SensorConnectionScreen';

export default SensorConnectionScreen;
