/**
 * Persistencia local de unidades físicas de espirómetro y selección activa.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getSpirometerProfileById,
  listSpirometerProfiles,
  LEGACY_SPIROMETER_DEVICE_5000ML_ID,
  LEGACY_SPIROMETER_DEVICE_OTHER_ID,
  SPIROMETER_DEVICE_3000ML_ID,
  SPIROMETER_PROFILE_3000ML_ID,
} from '@/src/modules/device/spirometer/spirometer-profiles';
import type {
  SpirometerContext,
  SpirometerDevice,
  SpirometerProfile,
} from '@/src/modules/device/spirometer/spirometer-types';

export const SPIROMETER_DEVICES_STORAGE_KEY = '@respira_spirometer_devices_v1';
export const SPIROMETER_ACTIVE_DEVICE_ID_KEY = '@respira_active_spirometer_device_id_v1';

const LEGACY_DEVICE_IDS = new Set([
  LEGACY_SPIROMETER_DEVICE_5000ML_ID,
  LEGACY_SPIROMETER_DEVICE_OTHER_ID,
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceSpirometerDevice(value: unknown): SpirometerDevice | null {
  if (!isPlainObject(value)) return null;
  if (typeof value.id !== 'string') return null;
  if (typeof value.profileId !== 'string') return null;
  if (typeof value.label !== 'string') return null;
  if (typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt)) return null;
  if (typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)) return null;
  if (typeof value.isActive !== 'boolean') return null;
  return value as unknown as SpirometerDevice;
}

async function readDevicesRaw(): Promise<SpirometerDevice[]> {
  try {
    const raw = await AsyncStorage.getItem(SPIROMETER_DEVICES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => coerceSpirometerDevice(item))
      .filter((d): d is SpirometerDevice => d !== null);
  } catch {
    return [];
  }
}

async function writeDevices(devices: SpirometerDevice[]): Promise<void> {
  await AsyncStorage.setItem(SPIROMETER_DEVICES_STORAGE_KEY, JSON.stringify(devices));
}

function buildDefault3000Device(now: number): SpirometerDevice {
  return {
    id: SPIROMETER_DEVICE_3000ML_ID,
    profileId: SPIROMETER_PROFILE_3000ML_ID,
    label: 'Espirómetro RESPIRA+ 3000 mL',
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };
}

/** Normaliza instalaciones antiguas con perfiles 5000 mL u «Otro». */
async function migrateToSingle3000Device(devices: SpirometerDevice[]): Promise<SpirometerDevice[]> {
  const now = Date.now();
  const existing3000 = devices.find((d) => d.id === SPIROMETER_DEVICE_3000ML_ID);
  const legacy = devices.find((d) => LEGACY_DEVICE_IDS.has(d.id));
  const base = existing3000 ?? legacy ?? buildDefault3000Device(now);

  const normalized: SpirometerDevice = {
    ...base,
    id: SPIROMETER_DEVICE_3000ML_ID,
    profileId: SPIROMETER_PROFILE_3000ML_ID,
    label: 'Espirómetro RESPIRA+ 3000 mL',
    isActive: true,
    updatedAt: now,
  };

  const activeId = await AsyncStorage.getItem(SPIROMETER_ACTIVE_DEVICE_ID_KEY);
  if (!activeId || activeId !== SPIROMETER_DEVICE_3000ML_ID || devices.length !== 1) {
    await writeDevices([normalized]);
    await AsyncStorage.setItem(SPIROMETER_ACTIVE_DEVICE_ID_KEY, SPIROMETER_DEVICE_3000ML_ID);
    return [normalized];
  }

  if (devices.length === 1 && devices[0].id === SPIROMETER_DEVICE_3000ML_ID) {
    return devices;
  }

  await writeDevices([normalized]);
  await AsyncStorage.setItem(SPIROMETER_ACTIVE_DEVICE_ID_KEY, SPIROMETER_DEVICE_3000ML_ID);
  return [normalized];
}

export { listSpirometerProfiles, getSpirometerProfileById };

export async function listSpirometerDevices(): Promise<SpirometerDevice[]> {
  await createDefaultSpirometerDevicesIfNeeded();
  return readDevicesRaw();
}

export async function createDefaultSpirometerDevicesIfNeeded(): Promise<SpirometerDevice[]> {
  const existing = await readDevicesRaw();
  if (existing.length > 0) {
    const migrated = await migrateToSingle3000Device(existing);
    return migrated;
  }

  const now = Date.now();
  const defaults = [buildDefault3000Device(now)];
  await writeDevices(defaults);
  await AsyncStorage.setItem(SPIROMETER_ACTIVE_DEVICE_ID_KEY, SPIROMETER_DEVICE_3000ML_ID);
  return defaults;
}

export async function getActiveSpirometerDevice(): Promise<SpirometerDevice | null> {
  const devices = await createDefaultSpirometerDevicesIfNeeded();
  const activeId = await AsyncStorage.getItem(SPIROMETER_ACTIVE_DEVICE_ID_KEY);
  if (activeId) {
    const found = devices.find((d) => d.id === activeId);
    if (found) return found;
  }
  return devices.find((d) => d.id === SPIROMETER_DEVICE_3000ML_ID) ?? devices[0] ?? null;
}

export async function setActiveSpirometerDevice(deviceId: string): Promise<void> {
  const devices = await createDefaultSpirometerDevicesIfNeeded();
  const targetId =
    deviceId === SPIROMETER_DEVICE_3000ML_ID || LEGACY_DEVICE_IDS.has(deviceId)
      ? SPIROMETER_DEVICE_3000ML_ID
      : deviceId;
  if (!devices.some((d) => d.id === SPIROMETER_DEVICE_3000ML_ID)) {
    throw new Error(`Espirómetro no registrado: ${targetId}`);
  }
  const now = Date.now();
  const updated = devices.map((d) => ({
    ...d,
    isActive: d.id === SPIROMETER_DEVICE_3000ML_ID,
    updatedAt: d.id === SPIROMETER_DEVICE_3000ML_ID ? now : d.updatedAt,
  }));
  await writeDevices(updated);
  await AsyncStorage.setItem(SPIROMETER_ACTIVE_DEVICE_ID_KEY, SPIROMETER_DEVICE_3000ML_ID);
}

export async function getActiveSpirometerProfile(): Promise<SpirometerProfile | null> {
  const device = await getActiveSpirometerDevice();
  if (!device) return null;
  return getSpirometerProfileById(device.profileId);
}

export async function getActiveSpirometerContext(): Promise<SpirometerContext | null> {
  const device = await getActiveSpirometerDevice();
  if (!device) return null;
  const profile = getSpirometerProfileById(device.profileId);
  if (!profile) return null;
  return { device, profile };
}
