/**
 * Purpose: Export technical calibration data (points + model metrics) as CSV.
 * Module: export
 * Notes: Not shown to patient as primary export; accessible via secondary button.
 */

import Constants from 'expo-constants';

import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import {
  createDefaultCalibratedDeviceIdentification,
  mergeCalibratedDeviceIdentification,
} from '@/src/modules/device/calibration/calibrated-device-identification';
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';
import { volumeFromLinear } from '@/src/modules/device/calibration/imported-calibration-service';

export const CALIBRATION_EXPORT_SCHEMA_VERSION = '2.1.0';

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const HEADER: readonly string[] = [
  'calibration_export_schema_version',
  'app_version',
  'exported_at',
  'calibration_id',
  'calibration_profile_id',
  'calibration_name',
  'calibration_version',
  'calibration_created_at',
  'calibration_updated_at',
  'calibration_source',
  'device_internal_label',
  'device_brand',
  'device_model',
  'device_nominal_capacity_ml',
  'device_serial_number',
  'device_sensor_module_id',
  'calibration_operator',
  'calibration_date',
  'technical_notes',
  'spirometer_model',
  'spirometer_capacity_ml',
  'spirometer_device_id',
  'spirometer_profile_id',
  'active_model_id',
  'model_kind',
  'model_type',
  'slope_ml_per_mm',
  'intercept_ml',
  'model_slope',
  'model_intercept',
  'r_squared',
  'mae_ml',
  'rmse_ml',
  'model_r2',
  'model_rmse_ml',
  'model_mae_ml',
  'model_max_abs_error_ml',
  'activation_status',
  'therapy_ready',
  'firmware_version',
  'device_id',
  'filter_label',
  'sensor_status',
  'notes',
  'point_id',
  'mark_ml',
  'target_volume_ml',
  'repetition_number',
  'filtered_distance_mm',
  'avg_distance_mm',
  'raw_distance_mm',
  'samples_count',
  'std_distance_mm',
  'min_distance_mm',
  'max_distance_mm',
  'sample_count',
  'predicted_volume_ml',
  'residual_ml',
  'absolute_error_ml',
  'uncertainty_u95_ml',
  'accepted',
  'rejection_reason',
  'source',
] as const;

export type CalibrationTechnicalCsvParams = {
  profile: CalibrationProfile;
  activeModel: ActiveCalibrationModel | null;
  firmwareVersion?: string | null;
  deviceId?: string | null;
};

function formatTimestamp(epoch: number | undefined | null): string {
  if (!epoch || !Number.isFinite(epoch)) return '';
  return new Date(epoch).toISOString();
}

function getAppVersion(): string {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '';
}

export function buildCalibrationTechnicalCsv(params: CalibrationTechnicalCsvParams): string {
  const { profile, activeModel, firmwareVersion, deviceId } = params;

  const lines: string[] = [];
  lines.push('RESPIRA_CALIBRACION_TECNICA');
  lines.push(`app_version,${escapeCsvCell(getAppVersion())}`);
  lines.push(`calibration_export_schema_version,${CALIBRATION_EXPORT_SCHEMA_VERSION}`);
  lines.push(`firmware_version,${escapeCsvCell(firmwareVersion ?? '')}`);
  lines.push(`device_id,${escapeCsvCell(deviceId ?? '')}`);
  lines.push(`exported_at,${new Date().toISOString()}`);
  lines.push(HEADER.join(','));

  const deviceIdMeta = mergeCalibratedDeviceIdentification(profile.deviceIdentification);
  const modelKind = activeModel?.modelKind ?? '';
  const activeModelId = activeModel?.id ?? '';
  const recommendedModel = activeModel?.recommendedModel ?? null;
  const slope = recommendedModel?.coefficients.slope;
  const intercept = recommendedModel?.coefficients.intercept;
  const metrics = recommendedModel?.metrics;

  const capacityMl =
    deviceIdMeta.nominalCapacityMl ??
    profile.importedMeta?.capacityMl ??
    profile.spirometerProfileSnapshot.maxVolumeMl ??
    profile.calibrationRangeMl.max;
  const spirometerModel =
    profile.importedMeta?.spirometerModel ??
    `${deviceIdMeta.brand} ${deviceIdMeta.model}`.trim();

  const activationStatus = activeModel
    ? activeModel.isReadyForTherapy
      ? 'active_ready'
      : 'active_not_ready'
    : 'not_activated';

  const baseFields: Record<string, string> = {
    calibration_export_schema_version: CALIBRATION_EXPORT_SCHEMA_VERSION,
    app_version: getAppVersion(),
    exported_at: new Date().toISOString(),
    calibration_id: profile.id,
    calibration_profile_id: profile.id,
    calibration_name: profile.name,
    calibration_version: String(profile.version),
    calibration_created_at: formatTimestamp(profile.createdAt),
    calibration_updated_at: formatTimestamp(profile.updatedAt),
    calibration_source: profile.source,
    device_internal_label: deviceIdMeta.internalLabel,
    device_brand: deviceIdMeta.brand,
    device_model: deviceIdMeta.model,
    device_nominal_capacity_ml: String(deviceIdMeta.nominalCapacityMl),
    device_serial_number: deviceIdMeta.serialNumber ?? '',
    device_sensor_module_id: deviceIdMeta.sensorModuleId ?? '',
    calibration_operator: deviceIdMeta.calibrationOperator ?? '',
    calibration_date: deviceIdMeta.calibrationDateIso,
    technical_notes: deviceIdMeta.technicalNotes ?? profile.notes ?? '',
    spirometer_model: spirometerModel,
    spirometer_capacity_ml: String(capacityMl),
    spirometer_device_id: profile.spirometerDeviceId,
    spirometer_profile_id: profile.spirometerProfileId,
    active_model_id: activeModelId,
    model_kind: modelKind,
    model_type: modelKind,
    slope_ml_per_mm: slope != null ? String(slope) : '',
    intercept_ml: intercept != null ? String(intercept) : '',
    model_slope: slope != null ? String(slope) : '',
    model_intercept: intercept != null ? String(intercept) : '',
    r_squared: metrics?.rSquared != null ? String(metrics.rSquared) : '',
    mae_ml: metrics?.maeMl != null ? String(metrics.maeMl) : '',
    rmse_ml: metrics?.rmseMl != null ? String(metrics.rmseMl) : '',
    model_r2: metrics?.rSquared != null ? String(metrics.rSquared) : '',
    model_rmse_ml: metrics?.rmseMl != null ? String(metrics.rmseMl) : '',
    model_mae_ml: metrics?.maeMl != null ? String(metrics.maeMl) : '',
    model_max_abs_error_ml: metrics?.maxAbsErrorMl != null ? String(metrics.maxAbsErrorMl) : '',
    activation_status: activationStatus,
    therapy_ready: activeModel?.isReadyForTherapy ? 'true' : 'false',
    firmware_version: firmwareVersion ?? '',
    device_id: deviceId ?? '',
    filter_label: '',
    sensor_status: '',
    notes: profile.notes ?? '',
  };

  const uncertaintyByVolume = activeModel?.uncertaintyByVolumeMl ?? {};

  const emitRow = (row: Record<string, string>) => {
    const full: Record<string, string> = { ...baseFields };
    for (const k of HEADER) {
      if (k in row) full[k] = row[k];
      else if (!(k in full)) full[k] = '';
    }
    lines.push(HEADER.map((k) => escapeCsvCell(full[k])).join(','));
  };

  for (const point of profile.points) {
    const u95Entry = uncertaintyByVolume[point.volumeMl];
    const u95Ml = u95Entry?.u95Ml;
    const predicted =
      slope != null && intercept != null
        ? volumeFromLinear(point.distanceMm, slope, intercept)
        : null;
    const residual =
      predicted !== null && Number.isFinite(predicted)
        ? predicted - point.volumeMl
        : null;
    const absErr = residual !== null ? Math.abs(residual) : null;

    emitRow({
      point_id: point.id,
      mark_ml: String(point.volumeMl),
      target_volume_ml: String(point.volumeMl),
      repetition_number: String(point.repetitionNumber),
      filtered_distance_mm: String(point.distanceMm),
      avg_distance_mm: String(point.distanceMm),
      raw_distance_mm: String(point.rawDistanceMm),
      samples_count: String(point.sampleCount),
      std_distance_mm: String(point.stdDistanceMm),
      min_distance_mm: String(point.minSampleDistanceMm),
      max_distance_mm: String(point.maxSampleDistanceMm),
      sample_count: String(point.sampleCount),
      predicted_volume_ml: predicted !== null ? String(predicted) : '',
      residual_ml: residual !== null ? String(residual) : '',
      absolute_error_ml: absErr !== null ? String(absErr) : '',
      uncertainty_u95_ml: u95Ml != null ? String(u95Ml) : '',
      accepted: point.distanceValid ? 'true' : 'false',
      rejection_reason: point.distanceValid ? '' : 'distance_invalid',
      source: point.source,
    });
  }

  if (profile.points.length === 0) {
    emitRow({});
  }

  const body = `${lines.join('\r\n')}\r\n`;
  return `\uFEFF${body}`;
}

export function buildCalibrationTechnicalFilename(profile: CalibrationProfile): string {
  const deviceLabel =
    profile.deviceIdentification?.internalLabel ??
    createDefaultCalibratedDeviceIdentification().internalLabel;
  const safe = deviceLabel.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `respira_calibracion_tecnica_${safe}_${stamp}.csv`;
}
