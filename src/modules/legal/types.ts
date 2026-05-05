/**
 * Purpose: Types for local digital consent record and status.
 * Module: legal
 */

import type { LegalStatementId } from '@/src/modules/legal/constants';

export type ConsentStatus = 'active' | 'withdrawn';

export type AcceptedConsentRecord = {
  userId: string;
  acceptedTerms: boolean;
  acceptedConsent: boolean;
  acceptedPrivacy: boolean;
  acceptedClinicalDisclaimer: boolean;
  acceptedSupportIndicatorsDisclaimer: boolean;
  documentVersion: string;
  documentTitle: string;
  appVersion: string | null;
  acceptedAt: string;
  consentStatus: ConsentStatus;
  acceptanceMethod: 'digital_in_app';
  acceptedStatements: LegalStatementId[];
  /** ISO 8601 when the user withdrew; null while consent is active. */
  withdrawnAt: string | null;
};
