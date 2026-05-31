export type {
  SpirometerContext,
  SpirometerDevice,
  SpirometerGeometrySource,
  SpirometerProfile,
} from '@/src/modules/device/spirometer/spirometer-types';

export {
  buildGeometricSegmentsMl,
  deriveReferenceVolumePerMmMl,
  getExtendedRangeMinVolumeMl,
  getExtendedVolumeChipsMl,
  getRecommendedVolumeChipsMl,
  getSpirometerProfileById,
  listSpirometerProfiles,
  LEGACY_SPIROMETER_DEVICE_5000ML_ID,
  LEGACY_SPIROMETER_DEVICE_OTHER_ID,
  SPIROMETER_DEVICE_3000ML_ID,
  SPIROMETER_DEVICE_5000ML_ID,
  SPIROMETER_PROFILE_3000ML_ID,
  SPIROMETER_PROFILE_5000ML_ID,
  getTechnicalCaptureProfile3000Ml,
  VOLUME_CHIPS_3000ML_ML,
  VOLUME_CHIPS_3000ML_TECHNICAL_ML,
  VOLUME_CHIPS_5000ML_TECHNICAL_ML,
} from '@/src/modules/device/spirometer/spirometer-profiles';

export {
  findTechnicalSpirometerOptionByDeviceId,
  getDefaultTechnicalSpirometerOption,
  listTechnicalCalibrationSpirometerOptions,
  type TechnicalSpirometerOption,
} from '@/src/modules/device/spirometer/technical-spirometer-options';

export {
  createDefaultSpirometerDevicesIfNeeded,
  getActiveSpirometerContext,
  getActiveSpirometerDevice,
  getActiveSpirometerProfile,
  listSpirometerDevices,
  setActiveSpirometerDevice,
  SPIROMETER_ACTIVE_DEVICE_ID_KEY,
  SPIROMETER_DEVICES_STORAGE_KEY,
} from '@/src/modules/device/spirometer/spirometer-storage';
