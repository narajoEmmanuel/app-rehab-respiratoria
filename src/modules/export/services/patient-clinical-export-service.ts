/**
 * Purpose: Export patient clinical data to temporary file and open native share sheet.
 * Module: export
 */

import { buildClinicalReportCsv, buildClinicalReportFilename } from '@/src/modules/export/formatters/clinical-csv-exporter';
import { buildClinicalExportJson } from '@/src/modules/export/formatters/clinical-json-exporter';
import { getClinicalExportSnapshot } from '@/src/modules/export/services/clinical-export-service';
import type { DownloadExportFileResult } from '@/src/modules/export/utils/download-export-file';
import { downloadExportFile } from '@/src/modules/export/utils/download-export-file';

export async function exportPatientCsv(patientId: number): Promise<DownloadExportFileResult> {
  const snapshot = await getClinicalExportSnapshot(patientId);
  const body = buildClinicalReportCsv(snapshot);
  const csvFileName = buildClinicalReportFilename(snapshot, patientId);
  return downloadExportFile(body, 'text/csv', { csvFileName });
}

export async function exportPatientJson(patientId: number): Promise<DownloadExportFileResult> {
  const snapshot = await getClinicalExportSnapshot(patientId);
  const body = buildClinicalExportJson(snapshot);
  return downloadExportFile(body, 'application/json');
}
