/**
 * Purpose: Export technical calibration data (points + model metrics) as CSV.
 * Module: export
 * Notes: Not shown to patient as primary export; accessible via secondary button.
 */

import Constants from 'expo-constants';

import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';

export const CALIBRATION_EXPORT_SCHEMA_VERSION = '2.0.0';

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const HEADER: readonly string[] = [
  'calibration_profile_id',
  'calibration_name',
  'calibration_version',
  'calibration_created_at',
  'calibration_updated_at',
  'spirometer_device_id',
  'spirometer_profile_id',
  'active_model_id',
  'model_kind',
  'model_slope',
  'model_intercept',
  'model_r2',
  'model_rmse_ml',
  'model_mae_ml',
  'model_max_abs_error_ml',
  'point_id',
  'target_volume_ml',
  'avg_distance_mm',
  'raw_distance_mm',
  'std_distance_mm',
  'min_distance_mm',
  'max_distance_mm',
  'sample_count',
  'uncertainty_u95_ml',
  'accepted',
  'rejection_reason',
  'source',
] as const;

type CalibrationTechnicalCsvParams = {
  profile: CalibrationProfile;
  activeModel: ActiveCalibrationModel | null;
};

function formatTimestamp(epoch: number | undefined | null): string {
  if (!epoch || !Number.isFinite(epoch)) return '';
  return new Date(epoch).toISOString();
}

function getAppVersion(): string {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '';
}

export function buildCalibrationTechnicalCsv(params: CalibrationTechnicalCsvParams): string {
  const { profile, activeModel } = params;

  const lines: string[] = [];
  lines.push('RESPIRA_CALIBRACION_TECNICA');
  lines.push(`app_version,${escapeCsvCell(getAppVersion())}`);
  lines.push(`calibration_export_schema_version,${CALIBRATION_EXPORT_SCHEMA_VERSION}`);
  lines.push(`firmware_version,`);
  lines.push(`exported_at,${new Date().toISOString()}`);
  lines.push(HEADER.join(','));

  const modelKind = activeModel?.modelKind ?? '';
  const activeModelId = activeModel?.id ?? '';
  const recommendedModel = activeModel?.recommendedModel ?? null;
  const slope = recommendedModel?.coefficients.slope;
  const intercept = recommendedModel?.coefficients.intercept;
  const metrics = recommendedModel?.metrics;

  const baseFields = {
    calibration_profile_id: profile.id,
    calibration_name: profile.name,
    calibration_version: String(profile.version),
    calibration_created_at: formatTimestamp(profile.createdAt),
    calibration_updated_at: formatTimestamp(profile.updatedAt),
    spirometer_device_id: profile.spirometerDeviceId,
    spirometer_profile_id: profile.spirometerProfileId,
    active_model_id: activeModelId,
    model_kind: modelKind,
    model_slope: slope != null ? String(slope) : '',
    model_intercept: intercept != null ? String(intercept) : '',
    model_r2: metrics?.rSquared != null ? String(metrics.rSquared) : '',
    model_rmse_ml: metrics?.rmseMl != null ? String(metrics.rmseMl) : '',
    model_mae_ml: metrics?.maeMl != null ? String(metrics.maeMl) : '',
    model_max_abs_error_ml: metrics?.maxAbsErrorMl != null ? String(metrics.maxAbsErrorMl) : '',
  };

  const uncertaintyByVolume = activeModel?.uncertaintyByVolumeMl ?? {};

  for (const point of profile.points) {
    const u95Entry = uncertaintyByVolume[point.volumeMl];
    const u95Ml = u95Entry?.u95Ml;

    const row: Record<string, string> = {
      ...baseFields,
      point_id: point.id,
      target_volume_ml: String(point.volumeMl),
      avg_distance_mm: String(point.distanceMm),
      raw_distance_mm: String(point.rawDistanceMm),
      std_distance_mm: String(point.stdDistanceMm),
      min_distance_mm: String(point.minSampleDistanceMm),
      max_distance_mm: String(point.maxSampleDistanceMm),
      sample_count: String(point.sampleCount),
      uncertainty_u95_ml: u95Ml != null ? String(u95Ml) : '',
      accepted: point.distanceValid ? 'true' : 'false',
      rejection_reason: point.distanceValid ? '' : 'distance_invalid',
      source: point.source,
    };

    const line = HEADER.map((k) => escapeCsvCell(row[k])).join(',');
    lines.push(line);
  }

  if (profile.points.length === 0) {
    const emptyRow: Record<string, string> = { ...baseFields };
    for (const k of HEADER) {
      if (!(k in emptyRow)) emptyRow[k] = '';
    }
    const line = HEADER.map((k) => escapeCsvCell(emptyRow[k])).join(',');
    lines.push(line);
  }

  const body = `${lines.join('\r\n')}\r\n`;
  return `\uFEFF${body}`;
}

export function buildCalibrationTechnicalFilename(profile: CalibrationProfile): string {
  const safe = profile.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `respira_calibracion_tecnica_${safe}_${stamp}.csv`;
}
