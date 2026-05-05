/**
 * Purpose: Persist profile UI preferences per patient (AsyncStorage).
 * Module: patient
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_PROFILE_PREFERENCES,
  type ProfilePreferences,
} from '@/src/modules/patient/types/profile-preferences';

const PROFILE_PREFERENCES_KEY_PREFIX = 'respira_profile_preferences_';
const PROFILE_PREFERENCES_FALLBACK_KEY = `${PROFILE_PREFERENCES_KEY_PREFIX}anonymous`;

function isProfilePreferences(value: unknown): value is ProfilePreferences {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  const avatarOk = o.avatarUri === null || typeof o.avatarUri === 'string';
  const notifOk = typeof o.notificationsEnabled === 'boolean';
  const timeOk = o.preferredReminderTime === null || typeof o.preferredReminderTime === 'string';
  return avatarOk && notifOk && timeOk;
}

function normalizePrefs(raw: unknown): ProfilePreferences {
  if (!isProfilePreferences(raw)) {
    return { ...DEFAULT_PROFILE_PREFERENCES };
  }
  return {
    avatarUri: raw.avatarUri,
    notificationsEnabled: raw.notificationsEnabled,
    preferredReminderTime: raw.preferredReminderTime,
  };
}

function preferencesKeyForPatient(patientId: number | null | undefined): string {
  if (typeof patientId === 'number' && Number.isFinite(patientId) && patientId > 0) {
    return `${PROFILE_PREFERENCES_KEY_PREFIX}${String(patientId)}`;
  }
  return PROFILE_PREFERENCES_FALLBACK_KEY;
}

export async function getProfilePreferences(patientId: number): Promise<ProfilePreferences> {
  const stored = await AsyncStorage.getItem(preferencesKeyForPatient(patientId));
  if (!stored) return { ...DEFAULT_PROFILE_PREFERENCES };
  try {
    const parsed: unknown = JSON.parse(stored);
    return normalizePrefs(parsed);
  } catch {
    return { ...DEFAULT_PROFILE_PREFERENCES };
  }
}

export async function saveProfilePreferences(
  patientId: number,
  prefs: ProfilePreferences,
): Promise<void> {
  await AsyncStorage.setItem(
    preferencesKeyForPatient(patientId),
    JSON.stringify(normalizePrefs(prefs)),
  );
}

export async function updateProfilePreferences(
  patientId: number,
  patch: Partial<ProfilePreferences>,
): Promise<ProfilePreferences> {
  const current = await getProfilePreferences(patientId);
  const next = normalizePrefs({ ...current, ...patch });
  await saveProfilePreferences(patientId, next);
  return next;
}

/** Clears stored preferences for one patient, or the entire store if `patientId` is omitted (tests / reset). */
export async function clearProfilePreferences(patientId?: number): Promise<void> {
  if (patientId == null) {
    const keys = await AsyncStorage.getAllKeys();
    const profileKeys = keys.filter((key) => key.startsWith(PROFILE_PREFERENCES_KEY_PREFIX));
    if (profileKeys.length > 0) {
      await AsyncStorage.multiRemove(profileKeys);
    }
    return;
  }
  await AsyncStorage.removeItem(preferencesKeyForPatient(patientId));
}
