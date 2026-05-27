/**
 * Purpose: Load active calibration profile + model and export as technical CSV.
 * Module: export
 */

import {
  buildCalibrationTechnicalCsv,
  buildCalibrationTechnicalFilename,
} from '@/src/modules/export/formatters/calibration-technical-csv-exporter';
import type { DownloadExportFileResult } from '@/src/modules/export/utils/download-export-file';
import { downloadExportFile } from '@/src/modules/export/utils/download-export-file';
import { loadActiveVolumeEstimationContext } from '@/src/modules/device/volume-estimation/volume-estimation-service';

export type CalibrationExportResult =
  | DownloadExportFileResult
  | { ok: false; reason: 'no_calibration'; message: string };

export async function exportCalibrationTechnicalCsv(): Promise<CalibrationExportResult> {
  const loaded = await loadActiveVolumeEstimationContext();
  const { calibrationProfile, activeModel } = loaded;

  if (!calibrationProfile) {
    return {
      ok: false,
      reason: 'no_calibration',
      message: 'No hay perfil de calibración disponible para exportar.',
    };
  }

  const csv = buildCalibrationTechnicalCsv({ profile: calibrationProfile, activeModel });
  const filename = buildCalibrationTechnicalFilename(calibrationProfile);

  return downloadExportFile(csv, 'text/csv', { csvFileName: filename });
}
