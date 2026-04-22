/**
 * Purpose: Placeholder export contract.
 * Module: clinician
 * Dependencies: clinician/reports
 * Notes: Keeps export concern isolated from dashboard views.
 */
export function exportClinicianReportPlaceholder(content: string): string {
  return `EXPORT_READY:${content}`;
}

