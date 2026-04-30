/**
 * Purpose: Demo sequence for sensor data when ESP32 is unavailable.
 * Module: device
 * Dependencies: device/types/sensor-reading
 */
import type { SensorReading } from '@/src/modules/device/types/sensor-reading';

export const mockSensorReadings: SensorReading[] = [
  {
    timestamp: 0,
    volumeMl: 120,
    sustainedTimeMs: 400,
    validRepetitions: 0,
    distanceMm: 180,
    flowState: 'inhaling',
    isValidAttempt: true,
    source: 'mock',
  },
  {
    timestamp: 1,
    volumeMl: 360,
    sustainedTimeMs: 900,
    validRepetitions: 0,
    distanceMm: 160,
    flowState: 'inhaling',
    isValidAttempt: true,
    source: 'mock',
  },
  {
    timestamp: 2,
    volumeMl: 720,
    sustainedTimeMs: 1700,
    validRepetitions: 1,
    distanceMm: 140,
    flowState: 'holding',
    isValidAttempt: true,
    source: 'mock',
  },
  {
    timestamp: 3,
    volumeMl: 860,
    sustainedTimeMs: 2300,
    validRepetitions: 1,
    distanceMm: 130,
    flowState: 'holding',
    isValidAttempt: true,
    source: 'mock',
  },
  {
    timestamp: 4,
    volumeMl: 680,
    sustainedTimeMs: 2400,
    validRepetitions: 1,
    distanceMm: 135,
    flowState: 'exhaling',
    isValidAttempt: true,
    source: 'mock',
  },
  {
    timestamp: 5,
    volumeMl: 410,
    sustainedTimeMs: 2500,
    validRepetitions: 2,
    distanceMm: 150,
    flowState: 'exhaling',
    isValidAttempt: true,
    source: 'mock',
  },
  {
    timestamp: 6,
    volumeMl: 180,
    sustainedTimeMs: 2600,
    validRepetitions: 3,
    distanceMm: 175,
    flowState: 'idle',
    isValidAttempt: true,
    source: 'mock',
  },
];

export function getMockSensorReading(index: number): SensorReading {
  if (mockSensorReadings.length === 0) {
    return {
      timestamp: Date.now(),
      volumeMl: 0,
      sustainedTimeMs: 0,
      validRepetitions: 0,
      flowState: 'idle',
      source: 'mock',
    };
  }

  const safeIndex = Number.isFinite(index) ? Math.abs(Math.trunc(index)) : 0;
  const base = mockSensorReadings[safeIndex % mockSensorReadings.length];
  return { ...base, timestamp: Date.now(), source: 'mock' };
}
