import type { PatientExportData } from '@/src/modules/export/types/export-record';

export function buildSessionExportJson(data: PatientExportData): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}
