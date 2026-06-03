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
import type { CalibrationModel } from '@/src/modules/device/calibration/calibration-model-types';
import type { CalibrationProfile } from '@/src/modules/device/calibration/calibration-types';
import { volumeFromLinear } from '@/src/modules/device/calibration/imported-calibration-service';
import { respiraSystemComponentsCsvFields } from '@/src/modules/device/calibration/respira-system-components';
import {
  RESPIRA_3000_DISPLAY_CALIBRATION_ID,
  RESPIRA_3000_PREDEFINED_CALIBRATION_ID,
  RESPIRA_3000_PREDEFINED_CAPTURE_POINTS_COUNT,
  RESPIRA_3000_PREDEFINED_EXPORTED_AT_UTC,
  RESPIRA_3000_PREDEFINED_SOURCE,
} from '@/src/modules/device/calibration/predefined-calibration-models';
import {
    buildTechnicalMetricsCsvFields,
    CALIBRATION_TECHNICAL_METRICS_COLUMNS,
    type CalibrationTechnicalExportContext,
} from '@/src/modules/export/formatters/calibration-technical-export-context';

export const CALIBRATION_EXPORT_SCHEMA_VERSION = '2.4.0';

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
  'system_microcontroller',
  'system_sensor',
  'system_firmware_reference',
  'system_communication',
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

const FULL_HEADER: readonly string[] = [...HEADER, ...CALIBRATION_TECHNICAL_METRICS_COLUMNS];

export type CalibrationTechnicalCsvParams = {
  profile: CalibrationProfile;
  activeModel: ActiveCalibrationModel | null;
  firmwareVersion?: string | null;
  deviceId?: string | null;
  filterLabel?: string | null;
  sensorStatus?: string | null;
  technicalContext?: CalibrationTechnicalExportContext;
};

function formatTimestamp(epoch: number | undefined | null): string {
  if (!epoch || !Number.isFinite(epoch)) return '';
  return new Date(epoch).toISOString();
}

function getAppVersion(): string {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '';
}

function spirometerTypeLabelFromProfile(profile: CalibrationProfile): string {
  const cap = profile.spirometerProfileSnapshot?.maxVolumeMl ?? profile.calibrationRangeMl.max;
  return cap >= 5000 ? '5000mL' : '3000mL';
}

function resolveLinearModelForExport(
  params: CalibrationTechnicalCsvParams,
): CalibrationModel | null {
  const { technicalContext, activeModel } = params;
  if (technicalContext?.linearModel) return technicalContext.linearModel;
  if (activeModel?.linearModel) return activeModel.linearModel;
  const recommended = activeModel?.recommendedModel;
  if (recommended?.kind === 'linear_regression') return recommended;
  return null;
}

/** Sección compacta metadata_key + tabla de puntos (copiar a predefined-calibration-models). */
function buildCompactMetadataAndPointsSections(
  profile: CalibrationProfile,
  linearModel: CalibrationModel | null,
  predefinedExport?: {
    calibrationId: string;
    displayCalibrationId: string;
    exportedAtUtcSource: string;
    pointsCount: number;
  },
): string[] {
  const lines: string[] = [];
  const slope = linearModel?.coefficients.slope;
  const intercept = linearModel?.coefficients.intercept;
  const metrics = linearModel?.metrics;
  const exportedAt = predefinedExport?.exportedAtUtcSource ?? new Date().toISOString();
  const notes = profile.deviceIdentification?.technicalNotes ?? profile.notes ?? '';
  const pointsCount =
    predefinedExport?.pointsCount ??
    (profile.points.length > 0 ? profile.points.length : profile.summaries?.length ?? 0);

  lines.push('# RESPIRA_METADATA_COMPACT');
  lines.push('metadata_key,metadata_value');
  lines.push('calibration_type,technical');
  if (predefinedExport) {
    lines.push(`calibration_id,${predefinedExport.calibrationId}`);
    lines.push(`display_calibration_id,${predefinedExport.displayCalibrationId}`);
    lines.push(`exported_at_utc_source,${predefinedExport.exportedAtUtcSource}`);
  }
  lines.push(`spirometer_type,${spirometerTypeLabelFromProfile(profile)}`);
  lines.push(`created_at,${exportedAt}`);
  lines.push('model_type,linear');
  lines.push(`slope,${slope != null ? slope : ''}`);
  lines.push(`intercept,${intercept != null ? intercept : ''}`);
  lines.push(`r_squared,${metrics?.rSquared != null ? metrics.rSquared : ''}`);
  lines.push(`mae_ml,${metrics?.maeMl != null ? metrics.maeMl : ''}`);
  lines.push(`rmse_ml,${metrics?.rmseMl != null ? metrics.rmseMl : ''}`);
  lines.push(`max_abs_error_ml,${metrics?.maxAbsErrorMl != null ? metrics.maxAbsErrorMl : ''}`);
  lines.push(`points_count,${pointsCount}`);
  if (notes) {
    lines.push(`technical_notes,${escapeCsvCell(notes)}`);
  }
  lines.push('');
  lines.push(
    'point_index,reference_volume_ml,distance_mm,filtered_distance_mm,estimated_volume_ml,error_ml,abs_error_ml,timestamp',
  );

  const curveSummaries =
    profile.points.length > 0
      ? null
      : (profile.summaries?.length ? profile.summaries : null);

  const exportCurvePoints =
    profile.points.length > 0
      ? profile.points.map((point) => ({
          volumeMl: point.volumeMl,
          distanceMm: point.distanceMm,
          timestamp: point.timestamp ?? point.createdAt,
        }))
      : curveSummaries
        ? curveSummaries.map((summary) => ({
            volumeMl: summary.volumeMl,
            distanceMm: summary.avgDistanceMm,
            timestamp: profile.updatedAt,
          }))
        : [];

  const sorted = [...exportCurvePoints].sort(
    (a, b) => a.volumeMl - b.volumeMl || a.timestamp - b.timestamp,
  );
  sorted.forEach((point, index) => {
    const predicted =
      slope != null && intercept != null
        ? volumeFromLinear(point.distanceMm, slope, intercept)
        : null;
    const errorMl =
      predicted !== null && Number.isFinite(predicted) ? predicted - point.volumeMl : null;
    const absError = errorMl !== null ? Math.abs(errorMl) : null;
    lines.push(
      [
        index + 1,
        point.volumeMl,
        point.distanceMm,
        point.distanceMm,
        predicted !== null ? predicted.toFixed(4) : '',
        errorMl !== null ? errorMl.toFixed(4) : '',
        absError !== null ? absError.toFixed(4) : '',
        formatTimestamp(point.timestamp),
      ]
        .map((cell) => escapeCsvCell(cell))
        .join(','),
    );
  });
  lines.push('');
  lines.push('# RESPIRA_LEGACY_WIDE_FORMAT');
  return lines;
}

function summariesJson(profile: CalibrationProfile): string {
  if (!profile.summaries?.length) return '';
  try {
    return JSON.stringify(profile.summaries);
  } catch {
    return '';
  }
}

export function buildCalibrationTechnicalCsv(params: CalibrationTechnicalCsvParams): string {
  const { profile, activeModel, firmwareVersion, deviceId, filterLabel, sensorStatus, technicalContext } =
    params;

  const linearForExport = resolveLinearModelForExport(params);
  const predefined = activeModel?.predefinedCalibration;
  const isOfficialPredefined =
    predefined?.source === RESPIRA_3000_PREDEFINED_SOURCE &&
    predefined.predefinedId === RESPIRA_3000_PREDEFINED_CALIBRATION_ID;
  const predefinedExport = isOfficialPredefined
    ? {
        calibrationId: RESPIRA_3000_PREDEFINED_CALIBRATION_ID,
        displayCalibrationId: RESPIRA_3000_DISPLAY_CALIBRATION_ID,
        exportedAtUtcSource: RESPIRA_3000_PREDEFINED_EXPORTED_AT_UTC,
        pointsCount: RESPIRA_3000_PREDEFINED_CAPTURE_POINTS_COUNT,
      }
    : undefined;

  const lines: string[] = [];
  lines.push('RESPIRA_CALIBRACION_TECNICA');
  lines.push(`app_version,${escapeCsvCell(getAppVersion())}`);
  lines.push(`calibration_export_schema_version,${CALIBRATION_EXPORT_SCHEMA_VERSION}`);
  lines.push(`firmware_version,${escapeCsvCell(firmwareVersion ?? '')}`);
  lines.push(`device_id,${escapeCsvCell(deviceId ?? '')}`);
  lines.push(
    `exported_at,${predefinedExport?.exportedAtUtcSource ?? new Date().toISOString()}`,
  );
  lines.push(
    ...buildCompactMetadataAndPointsSections(profile, linearForExport, predefinedExport),
  );
  lines.push(FULL_HEADER.join(','));

  const deviceIdMeta = mergeCalibratedDeviceIdentification(profile.deviceIdentification);
  const modelKind = activeModel?.modelKind ?? technicalContext?.linearModel?.kind ?? '';
  const activeModelId = activeModel?.id ?? '';
  const recommendedModel = activeModel?.recommendedModel ?? null;
  const slope = linearForExport?.coefficients.slope;
  const intercept = linearForExport?.coefficients.intercept;
  const metrics = linearForExport?.metrics ?? recommendedModel?.metrics;

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
    exported_at: predefinedExport?.exportedAtUtcSource ?? new Date().toISOString(),
    calibration_id: isOfficialPredefined
      ? RESPIRA_3000_PREDEFINED_CALIBRATION_ID
      : profile.id,
    calibration_profile_id: isOfficialPredefined
      ? RESPIRA_3000_PREDEFINED_CALIBRATION_ID
      : profile.id,
    calibration_name: profile.name,
    calibration_version: String(profile.version),
    calibration_created_at: formatTimestamp(profile.createdAt),
    calibration_updated_at: formatTimestamp(profile.updatedAt),
    calibration_source: predefined?.source ?? profile.source,
    active_model_kind: modelKind,
    clamp_min_ml: predefined ? String(predefined.clampMinMl) : '0',
    clamp_max_ml: predefined ? String(predefined.clampMaxMl) : String(capacityMl),
    device_internal_label: deviceIdMeta.internalLabel,
    device_brand: deviceIdMeta.brand,
    device_model: deviceIdMeta.model,
    device_nominal_capacity_ml: String(deviceIdMeta.nominalCapacityMl),
    device_serial_number: deviceIdMeta.serialNumber ?? '',
    ...respiraSystemComponentsCsvFields(),
    calibration_operator: deviceIdMeta.calibrationOperator ?? '',
    calibration_date: predefined?.calibrationDateIso ?? deviceIdMeta.calibrationDateIso,
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
    filter_label: filterLabel ?? technicalContext?.filterLabel ?? '',
    sensor_status: sensorStatus ?? technicalContext?.sensorStatus ?? '',
    notes: profile.notes ?? '',
    ...buildTechnicalMetricsCsvFields({
      ...technicalContext,
      activeModel: technicalContext?.activeModel ?? activeModel,
      filterLabel: filterLabel ?? technicalContext?.filterLabel,
      sensorStatus: sensorStatus ?? technicalContext?.sensorStatus,
    }),
    volume_summaries_json: summariesJson(profile),
    global_distance_min_mm:
      profile.globalRange.minDistanceMm != null
        ? String(profile.globalRange.minDistanceMm)
        : '',
    global_distance_max_mm:
      profile.globalRange.maxDistanceMm != null
        ? String(profile.globalRange.maxDistanceMm)
        : '',
    global_distance_range_mm:
      profile.globalRange.rangeMm != null ? String(profile.globalRange.rangeMm) : '',
  };

  const uncertaintyByVolume = activeModel?.uncertaintyByVolumeMl ?? {};

  const emitRow = (row: Record<string, string>) => {
    const full: Record<string, string> = { ...baseFields };
    for (const k of FULL_HEADER) {
      if (k in row) full[k] = row[k];
      else if (!(k in full)) full[k] = '';
    }
    lines.push(FULL_HEADER.map((k) => escapeCsvCell(full[k])).join(','));
  };

  const curvePointsForExport =
    profile.points.length > 0
      ? null
      : (activeModel?.calibrationCurve?.points ?? []).map((p) => ({
          id: `curve-${p.volumeMl}`,
          volumeMl: p.volumeMl,
          distanceMm: p.avgDistanceMm,
          estimated: p.estimated === true,
        }));

  const exportPointRows =
    profile.points.length > 0
      ? profile.points.map((point) => ({ point, fromCurve: false as const }))
      : (curvePointsForExport ?? []).map((curve) => ({
          point: {
            id: curve.id,
            volumeMl: curve.volumeMl,
            distanceMm: curve.distanceMm,
            rawDistanceMm: curve.distanceMm,
            distanceValid: true,
            source: profile.source,
            timestamp: profile.updatedAt,
            repetitionNumber: 0,
            createdAt: profile.updatedAt,
            sampleCount: 0,
            minSampleDistanceMm: curve.distanceMm,
            maxSampleDistanceMm: curve.distanceMm,
            stdDistanceMm: 0,
          },
          fromCurve: true as const,
          estimated: curve.estimated,
        }));

  for (const row of exportPointRows) {
    const point = row.point;
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
      calibration_point_estimated:
        'estimated' in row && row.estimated ? 'true' : 'false',
    });
  }

  if (exportPointRows.length === 0) {
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
