/**
 * Purpose: Full nested JSON backup for clinical export.
 * Module: export
 */

import type { ClinicalExportSnapshot } from '@/src/modules/export/types/export-record';

export function buildClinicalExportJson(snapshot: ClinicalExportSnapshot): string {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}
