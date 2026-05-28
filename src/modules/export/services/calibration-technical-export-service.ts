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
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';
import { loadActiveVolumeEstimationContext } from '@/src/modules/device/volume-estimation/volume-estimation-service';

export type CalibrationExportResult =
  | DownloadExportFileResult
  | { ok: false; reason: 'no_calibration'; message: string };

export type CalibrationTechnicalExportOptions = {
  profile?: CalibrationProfile;
  firmwareVersion?: string | null;
  deviceId?: string | null;
};

export async function exportCalibrationTechnicalCsv(
  options?: CalibrationTechnicalExportOptions,
): Promise<CalibrationExportResult> {
  const loaded = await loadActiveVolumeEstimationContext();
  const calibrationProfile = options?.profile ?? loaded.calibrationProfile;
  const activeModel = loaded.activeModel;

  if (!calibrationProfile) {
    return {
      ok: false,
      reason: 'no_calibration',
      message: 'No hay perfil de calibración disponible para exportar.',
    };
  }

  const csv = buildCalibrationTechnicalCsv({
    profile: calibrationProfile,
    activeModel,
    firmwareVersion: options?.firmwareVersion,
    deviceId: options?.deviceId,
  });
  const filename = buildCalibrationTechnicalFilename(calibrationProfile);

  return downloadExportFile(csv, 'text/csv', { csvFileName: filename });
}
