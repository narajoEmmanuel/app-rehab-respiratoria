/**
 * Perfiles y dispositivos virtuales solo para captura técnica (no alteran el flujo paciente).
 */
import {
  getSpirometerProfileById,
  getTechnicalCaptureProfile3000Ml,
  SPIROMETER_DEVICE_3000ML_ID,
  SPIROMETER_DEVICE_5000ML_ID,
  SPIROMETER_PROFILE_5000ML_ID,
} from '@/src/modules/device/spirometer/spirometer-profiles';
import type { SpirometerDevice, SpirometerProfile } from '@/src/modules/device/spirometer/spirometer-types';

export type TechnicalSpirometerOption = {
  device: SpirometerDevice;
  profile: SpirometerProfile;
  spirometerTypeLabel: '3000mL' | '5000mL';
};

function buildVirtualDevice(profile: SpirometerProfile, label: string): SpirometerDevice {
  const now = Date.now();
  const deviceId =
    profile.maxVolumeMl >= 5000 ? SPIROMETER_DEVICE_5000ML_ID : SPIROMETER_DEVICE_3000ML_ID;
  return {
    id: deviceId,
    profileId: profile.id,
    label,
    createdAt: now,
    updatedAt: now,
    isActive: false,
  };
}

export function listTechnicalCalibrationSpirometerOptions(): TechnicalSpirometerOption[] {
  const p3000 = getTechnicalCaptureProfile3000Ml();
  const p5000 = getSpirometerProfileById(SPIROMETER_PROFILE_5000ML_ID);
  const options: TechnicalSpirometerOption[] = [];
  if (p3000) {
    options.push({
      profile: p3000,
      device: buildVirtualDevice(p3000, 'Espirómetro RESPIRA+ 3000 mL'),
      spirometerTypeLabel: '3000mL',
    });
  }
  if (p5000) {
    options.push({
      profile: p5000,
      device: buildVirtualDevice(p5000, 'Espirómetro RESPIRA+ 5000 mL'),
      spirometerTypeLabel: '5000mL',
    });
  }
  return options;
}

export function getDefaultTechnicalSpirometerOption(): TechnicalSpirometerOption | null {
  return listTechnicalCalibrationSpirometerOptions()[0] ?? null;
}

export function findTechnicalSpirometerOptionByDeviceId(
  deviceId: string,
): TechnicalSpirometerOption | null {
  return (
    listTechnicalCalibrationSpirometerOptions().find((o) => o.device.id === deviceId) ?? null
  );
}
