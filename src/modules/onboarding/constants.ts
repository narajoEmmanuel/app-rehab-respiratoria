/**
 * Purpose: AsyncStorage key prefix for per-patient welcome onboarding.
 * Module: onboarding
 */

export const WELCOME_ONBOARDING_STORAGE_KEY_PREFIX = '@rehab/onboarding_welcome_seen_v1_u';

export function getWelcomeOnboardingStorageKey(patientId: number | string): string {
  return `${WELCOME_ONBOARDING_STORAGE_KEY_PREFIX}${String(patientId)}`;
}
