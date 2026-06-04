/**
 * Purpose: Persist welcome onboarding seen state per patient (AsyncStorage).
 * Module: onboarding
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getWelcomeOnboardingStorageKey } from '@/src/modules/onboarding/constants';

export type WelcomeOnboardingSeenRecord = {
  seenAt: string;
};

function isWelcomeOnboardingSeenRecord(value: unknown): value is WelcomeOnboardingSeenRecord {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return typeof o.seenAt === 'string' && o.seenAt.length > 0;
}

export async function hasSeenWelcomeOnboarding(patientId: number | string): Promise<boolean> {
  const key = getWelcomeOnboardingStorageKey(patientId);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null || raw === '') return false;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isWelcomeOnboardingSeenRecord(parsed)) return true;
      // Valor no vacío con JSON inválido o forma distinta: no volver a mostrar por corrupción menor.
      return true;
    } catch {
      return true;
    }
  } catch {
    // Error de lectura: false para no bloquear la bienvenida si el storage falla de forma transitoria.
    return false;
  }
}

export async function markWelcomeOnboardingSeen(patientId: number | string): Promise<void> {
  const key = getWelcomeOnboardingStorageKey(patientId);
  const record: WelcomeOnboardingSeenRecord = { seenAt: new Date().toISOString() };
  await AsyncStorage.setItem(key, JSON.stringify(record));
}

export async function clearWelcomeOnboardingSeen(patientId: number | string): Promise<void> {
  await AsyncStorage.removeItem(getWelcomeOnboardingStorageKey(patientId));
}
