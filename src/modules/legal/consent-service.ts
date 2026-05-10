/**
 * Purpose: Persist and query local digital consent (AsyncStorage).
 * Module: legal
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/src/lib/supabase';
import { isCloudAuthEnabled } from '@/src/modules/app-mode/app-mode-config';
import {
  LEGAL_DOCUMENT_TITLE,
  LEGAL_DOCUMENT_VERSION,
  LEGAL_STATEMENT_IDS,
  LEGAL_STORAGE_KEY,
} from '@/src/modules/legal/constants';
import { getCurrentPatient } from '@/src/modules/patient/patient-service';
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
  if (supabase != null && isCloudAuthEnabled()) {
    const currentPatient = await getCurrentPatient();
    if (!currentPatient) return null;
    const { data, error } = await supabase
      .from('consent_records')
      .select(
        'patient_id, accepted_at, document_version, app_version, consent_accepted, consent_status, accepted_terms, accepted_consent, accepted_privacy, accepted_clinical_disclaimer, accepted_support_indicators_disclaimer, document_title, acceptance_method, accepted_statements, withdrawn_at',
      )
      .eq('patient_id', currentPatient.paciente_id)
      .eq('consent_accepted', true)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      userId: String(data.patient_id),
      acceptedTerms: data.accepted_terms,
      acceptedConsent: data.accepted_consent,
      acceptedPrivacy: data.accepted_privacy,
      acceptedClinicalDisclaimer: data.accepted_clinical_disclaimer,
      acceptedSupportIndicatorsDisclaimer: data.accepted_support_indicators_disclaimer,
      documentVersion: data.document_version,
      documentTitle: data.document_title ?? '',
      appVersion: data.app_version,
      acceptedAt: data.accepted_at,
      consentStatus: data.consent_status as ConsentStatus,
      acceptanceMethod: 'digital_in_app',
      acceptedStatements: Array.isArray(data.accepted_statements) ? data.accepted_statements : [],
      withdrawnAt: data.withdrawn_at ?? null,
    };
  }
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
  if (supabase != null && isCloudAuthEnabled()) {
    const patientId = Number(record.userId);
    const { error } = await supabase.from('consent_records').insert({
      patient_id: Number.isFinite(patientId) ? patientId : null,
      accepted_at: record.acceptedAt,
      document_version: record.documentVersion,
      app_version: record.appVersion,
      consent_accepted: true,
      consent_status: record.consentStatus,
      accepted_terms: record.acceptedTerms,
      accepted_consent: record.acceptedConsent,
      accepted_privacy: record.acceptedPrivacy,
      accepted_clinical_disclaimer: record.acceptedClinicalDisclaimer,
      accepted_support_indicators_disclaimer: record.acceptedSupportIndicatorsDisclaimer,
      document_title: record.documentTitle,
      acceptance_method: record.acceptanceMethod,
      accepted_statements: record.acceptedStatements,
      withdrawn_at: null,
    });
    if (error) throw error;
  }
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
  if (supabase != null && isCloudAuthEnabled()) {
    const patientId = Number(r.userId);
    const { error } = await supabase
      .from('consent_records')
      .update({ consent_status: 'withdrawn', withdrawn_at: now })
      .eq('patient_id', Number.isFinite(patientId) ? patientId : -1)
      .eq('document_version', r.documentVersion);
    if (error) throw error;
  }
  await AsyncStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Seeds a minimal active consent record locally when cloud auth is frozen off, so Terapia/tabs can load offline.
 * Does not write to Supabase.
 */
export async function seedLocalPrototypeConsentForPatient(patientId: number): Promise<void> {
  if (isCloudAuthEnabled()) return;
  const raw = await AsyncStorage.getItem(LEGAL_STORAGE_KEY);
  const existing = parseRecord(raw);
  if (
    existing != null &&
    existing.documentVersion === LEGAL_DOCUMENT_VERSION &&
    existing.consentStatus === 'active'
  ) {
    return;
  }
  const now = new Date().toISOString();
  const full: AcceptedConsentRecord = {
    userId: String(patientId),
    acceptedTerms: true,
    acceptedConsent: true,
    acceptedPrivacy: true,
    acceptedClinicalDisclaimer: true,
    acceptedSupportIndicatorsDisclaimer: true,
    documentVersion: LEGAL_DOCUMENT_VERSION,
    documentTitle: LEGAL_DOCUMENT_TITLE,
    appVersion: null,
    acceptedAt: now,
    consentStatus: 'active',
    acceptanceMethod: 'digital_in_app',
    acceptedStatements: [...LEGAL_STATEMENT_IDS],
    withdrawnAt: null,
  };
  await AsyncStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify(full));
}

export async function saveConsentRecord(record: AcceptConsentInput): Promise<void> {
  await acceptConsent(record);
}
