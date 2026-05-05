/**
 * Purpose: Persist and query local digital consent (AsyncStorage).
 * Module: legal
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { LEGAL_DOCUMENT_VERSION, LEGAL_STORAGE_KEY } from '@/src/modules/legal/constants';
import type { AcceptedConsentRecord, ConsentStatus } from '@/src/modules/legal/types';

function parseRecord(raw: string | null): AcceptedConsentRecord | null {
  if (raw == null || raw === '') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as AcceptedConsentRecord;
  } catch {
    return null;
  }
}

export async function getAcceptedConsentRecord(): Promise<AcceptedConsentRecord | null> {
  const raw = await AsyncStorage.getItem(LEGAL_STORAGE_KEY);
  return parseRecord(raw);
}

/** Current consent lifecycle status, or `none` if no record. */
export async function getConsentStatus(): Promise<ConsentStatus | 'none'> {
  const r = await getAcceptedConsentRecord();
  if (r == null) return 'none';
  return r.consentStatus;
}

/** True if the user must complete the full acceptance flow (missing record or older document version). */
export async function needsConsent(): Promise<boolean> {
  const r = await getAcceptedConsentRecord();
  if (r == null) return true;
  return r.documentVersion !== LEGAL_DOCUMENT_VERSION;
}

/** True when the current legal document is accepted and consent is active (use Terapia / Plan / Historial / sensor). */
export async function isConsentActive(): Promise<boolean> {
  const r = await getAcceptedConsentRecord();
  if (r == null) return false;
  return r.documentVersion === LEGAL_DOCUMENT_VERSION && r.consentStatus === 'active';
}

/** Payload for a new or renewed in-app acceptance (always active; clears any previous withdrawal). */
export type AcceptConsentInput = Omit<AcceptedConsentRecord, 'withdrawnAt' | 'consentStatus'> & {
  consentStatus: 'active';
};

export async function acceptConsent(record: AcceptConsentInput): Promise<void> {
  const full: AcceptedConsentRecord = { ...record, withdrawnAt: null };
  await AsyncStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify(full));
}

export async function withdrawConsent(): Promise<void> {
  const r = await getAcceptedConsentRecord();
  if (r == null) return;
  const now = new Date().toISOString();
  const updated: AcceptedConsentRecord = {
    ...r,
    consentStatus: 'withdrawn',
    withdrawnAt: now,
  };
  await AsyncStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify(updated));
}
