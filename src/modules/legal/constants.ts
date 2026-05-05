/**
 * Purpose: Legal document version, storage key, and statement identifiers for consent flow.
 * Module: legal
 */

export const LEGAL_DOCUMENT_VERSION = '1.0';

export const LEGAL_DOCUMENT_TITLE = 'RESPIRA+ — Términos, consentimiento, privacidad y descargo (v1)';

export const LEGAL_STORAGE_KEY = '@rehab/legal_consent_v1';

/** Keys stored in `acceptedStatements` for traceability (order matches UI checkboxes). */
export const LEGAL_STATEMENT_IDS = [
  'terms_use',
  'informed_consent',
  'privacy_notice',
  'prototype_academic',
  'not_medical_care',
  'support_indicators',
  'withdraw_any_time',
] as const;

export type LegalStatementId = (typeof LEGAL_STATEMENT_IDS)[number];
