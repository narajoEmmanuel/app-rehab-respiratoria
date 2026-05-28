/**
 * Métricas técnicas visibles en modo calibración que se serializan al CSV.
 * Opcional: si no se pasa, el exportador usa solo perfil + modelo activo.
 */

import type { ActiveCalibrationModel } from '@/src/modules/device/calibration/active-calibration-types';
import type {
  CalibrationModel,
  CalibrationModelRecommendation,
} from '@/src/modules/device/calibration/calibration-model-types';
import type {
  CalibrationRepeatabilityReport,
  CalibrationSegmentReport,
  GeometricScaleReport,
  RequiredCalibrationCoverage,
  VolumeCoverage,
} from '@/src/modules/device/calibration/calibration-math';
import type { CalibrationUncertaintySummary } from '@/src/modules/device/calibration/calibration-uncertainty-types';
import type { VolumeDistanceRelation } from '@/src/modules/device/calibration/calibration-types';

export type CalibrationTechnicalExportContext = {
  relation?: VolumeDistanceRelation;
  recommendation?: CalibrationModelRecommendation | null;
  linearModel?: CalibrationModel | null;
  piecewiseModel?: CalibrationModel | null;
  coverage?: VolumeCoverage | null;
  repeatability?: CalibrationRepeatabilityReport | null;
  segmentReport?: CalibrationSegmentReport | null;
  geometricReport?: GeometricScaleReport | null;
  requiredCoverage?: RequiredCalibrationCoverage | null;
  uncertaintySummary?: CalibrationUncertaintySummary | null;
  activeModel?: ActiveCalibrationModel | null;
  sensorStatus?: string | null;
  filterLabel?: string | null;
};

function jsonCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function modelMetricsFields(
  prefix: string,
  model: CalibrationModel | null | undefined,
): Record<string, string> {
  if (!model) return {};
  const m = model.metrics;
  return {
    [`${prefix}_kind`]: model.kind,
    [`${prefix}_status`]: model.status,
    [`${prefix}_slope`]: model.coefficients.slope != null ? String(model.coefficients.slope) : '',
    [`${prefix}_intercept`]:
      model.coefficients.intercept != null ? String(model.coefficients.intercept) : '',
    [`${prefix}_r2`]: m.rSquared != null ? String(m.rSquared) : '',
    [`${prefix}_rmse_ml`]: m.rmseMl != null ? String(m.rmseMl) : '',
    [`${prefix}_mae_ml`]: m.maeMl != null ? String(m.maeMl) : '',
    [`${prefix}_max_abs_error_ml`]: m.maxAbsErrorMl != null ? String(m.maxAbsErrorMl) : '',
    [`${prefix}_volume_range_ml`]: `${model.volumeRangeMl.min}-${model.volumeRangeMl.max}`,
    [`${prefix}_distance_range_mm`]: `${model.distanceRangeMm.min}-${model.distanceRangeMm.max}`,
    [`${prefix}_warnings_json`]: jsonCell(model.warnings),
  };
}

/** Columnas de métricas técnicas (orden estable en el CSV). */
export const CALIBRATION_TECHNICAL_METRICS_COLUMNS = [
  'volume_summaries_json',
  'volume_distance_relation',
  'recommended_model_kind',
  'recommended_model_status',
  'recommended_calibration_quality',
  'recommended_lineal_quality',
  'recommended_can_estimate_in_range',
  'recommended_is_ready_for_therapy',
  'therapy_readiness_reason',
  'model_recommendation_reason',
  'model_warnings_json',
  'coverage_recommended_pct',
  'coverage_total_pct',
  'coverage_covered_min_ml',
  'coverage_covered_max_ml',
  'covers_recommended',
  'covers_total',
  'global_distance_min_mm',
  'global_distance_max_mm',
  'global_distance_range_mm',
  'repeatability_per_volume_json',
  'repeatability_volume_max_std_ml',
  'calibrated_range_min_ml',
  'calibrated_range_max_ml',
  'activated_at',
  'active_model_therapy_ready',
  'protocol_meets_required',
  'protocol_total_valid_points',
  'missing_required_volumes_json',
  'repeatability_min_repetitions',
  'repeatability_avg_std_mm',
  'repeatability_max_std_mm',
  'segment_count',
  'segment_slope_min_ml_per_mm',
  'segment_slope_max_ml_per_mm',
  'segment_slope_variation_ratio',
  'segments_json',
  'geometric_validation_configured',
  'geometric_validation_passed',
  'geometric_ok_segments',
  'geometric_review_segments',
  'geometric_critical_segments',
  'uncertainty_avg_u95_ml',
  'uncertainty_max_u95_ml',
  'linear_model_kind',
  'linear_model_status',
  'linear_model_slope',
  'linear_model_intercept',
  'linear_model_r2',
  'linear_model_rmse_ml',
  'linear_model_mae_ml',
  'linear_model_max_abs_error_ml',
  'linear_model_volume_range_ml',
  'linear_model_distance_range_mm',
  'linear_model_warnings_json',
  'piecewise_model_kind',
  'piecewise_model_status',
  'piecewise_model_slope',
  'piecewise_model_intercept',
  'piecewise_model_r2',
  'piecewise_model_rmse_ml',
  'piecewise_model_mae_ml',
  'piecewise_model_max_abs_error_ml',
  'piecewise_model_volume_range_ml',
  'piecewise_model_distance_range_mm',
  'piecewise_model_warnings_json',
  'piecewise_segments_json',
] as const;

export function buildTechnicalMetricsCsvFields(
  ctx: CalibrationTechnicalExportContext | undefined,
): Record<string, string> {
  if (!ctx) return {};

  const rec = ctx.recommendation;
  const active = ctx.activeModel;
  const fields: Record<string, string> = {
    volume_summaries_json: '',
    volume_distance_relation: ctx.relation ?? '',
    recommended_model_kind: rec?.recommendedKind ?? '',
    recommended_model_status: rec?.status ?? '',
    recommended_calibration_quality: rec?.calibrationQuality ?? '',
    recommended_lineal_quality: rec?.linealQuality ?? '',
    recommended_can_estimate_in_range: rec?.canEstimateWithinCalibratedRange ? 'true' : 'false',
    recommended_is_ready_for_therapy: rec?.isReadyForTherapy ? 'true' : 'false',
    therapy_readiness_reason: rec?.therapyReadinessReason ?? active?.therapyReadinessReason ?? '',
    model_recommendation_reason: rec?.reason ?? '',
    model_warnings_json: jsonCell(rec?.warnings ?? []),
    coverage_recommended_pct:
      rec?.coverage.recommendedCoveragePct != null
        ? String(rec.coverage.recommendedCoveragePct)
        : ctx.coverage?.recommendedCoveragePct != null
          ? String(ctx.coverage.recommendedCoveragePct)
          : '',
    coverage_total_pct:
      rec?.coverage.totalCoveragePct != null
        ? String(rec.coverage.totalCoveragePct)
        : ctx.coverage?.totalCoveragePct != null
          ? String(ctx.coverage.totalCoveragePct)
          : '',
    coverage_covered_min_ml:
      ctx.coverage?.coveredMinMl != null ? String(ctx.coverage.coveredMinMl) : '',
    coverage_covered_max_ml:
      ctx.coverage?.coveredMaxMl != null ? String(ctx.coverage.coveredMaxMl) : '',
    covers_recommended: String(
      rec?.coverage.coversRecommended ?? ctx.coverage?.coversRecommended ?? false,
    ),
    covers_total: String(rec?.coverage.coversTotal ?? ctx.coverage?.coversTotal ?? false),
    calibrated_range_min_ml:
      active?.calibratedRangeMl.min != null ? String(active.calibratedRangeMl.min) : '',
    calibrated_range_max_ml:
      active?.calibratedRangeMl.max != null ? String(active.calibratedRangeMl.max) : '',
    activated_at: active?.activatedAt != null ? String(active.activatedAt) : '',
    active_model_therapy_ready: active?.isReadyForTherapy ? 'true' : 'false',
    protocol_meets_required: rec?.requiredProtocol.meetsRequiredProtocol ? 'true' : 'false',
    protocol_total_valid_points: String(
      rec?.requiredProtocol.totalValidRequiredPoints ??
        ctx.requiredCoverage?.totalValidRequiredPoints ??
        '',
    ),
    missing_required_volumes_json: jsonCell(
      rec?.requiredProtocol.missingRequiredVolumes ??
        ctx.requiredCoverage?.missingRequiredVolumes ??
        [],
    ),
    repeatability_min_repetitions:
      ctx.repeatability?.minRepetitionsPerVolume != null
        ? String(ctx.repeatability.minRepetitionsPerVolume)
        : '',
    repeatability_avg_std_mm:
      ctx.repeatability?.averageStdDistanceMm != null
        ? String(ctx.repeatability.averageStdDistanceMm)
        : '',
    repeatability_max_std_mm:
      ctx.repeatability?.maxStdDistanceMm != null
        ? String(ctx.repeatability.maxStdDistanceMm)
        : '',
    repeatability_per_volume_json: jsonCell(ctx.repeatability?.perVolume ?? []),
    repeatability_volume_max_std_ml:
      ctx.repeatability?.volumeWithMaxStdDistanceMm != null
        ? String(ctx.repeatability.volumeWithMaxStdDistanceMm)
        : '',
    global_distance_min_mm: '',
    global_distance_max_mm: '',
    global_distance_range_mm: '',
    segment_count: ctx.segmentReport ? String(ctx.segmentReport.segments.length) : '',
    segment_slope_min_ml_per_mm:
      ctx.segmentReport?.minSlopeMlPerMm != null
        ? String(ctx.segmentReport.minSlopeMlPerMm)
        : '',
    segment_slope_max_ml_per_mm:
      ctx.segmentReport?.maxSlopeMlPerMm != null
        ? String(ctx.segmentReport.maxSlopeMlPerMm)
        : '',
    segment_slope_variation_ratio:
      ctx.segmentReport?.slopeVariationRatio != null
        ? String(ctx.segmentReport.slopeVariationRatio)
        : '',
    segments_json: jsonCell(ctx.segmentReport?.segments ?? []),
    geometric_validation_configured: ctx.geometricReport?.geometricValidationConfigured
      ? 'true'
      : 'false',
    geometric_validation_passed: ctx.geometricReport?.passesGeometricValidation
      ? 'true'
      : 'false',
    geometric_ok_segments: ctx.geometricReport ? String(ctx.geometricReport.okSegments) : '',
    geometric_review_segments: ctx.geometricReport
      ? String(ctx.geometricReport.reviewSegments)
      : '',
    geometric_critical_segments: ctx.geometricReport
      ? String(ctx.geometricReport.criticalSegments)
      : '',
    uncertainty_avg_u95_ml:
      ctx.uncertaintySummary?.averageU95Ml != null
        ? String(ctx.uncertaintySummary.averageU95Ml)
        : active?.uncertainty.averageU95Ml != null
          ? String(active.uncertainty.averageU95Ml)
          : '',
    uncertainty_max_u95_ml:
      ctx.uncertaintySummary?.maxU95Ml != null
        ? String(ctx.uncertaintySummary.maxU95Ml)
        : active?.uncertainty.maxU95Ml != null
          ? String(active.uncertainty.maxU95Ml)
          : '',
    sensor_status: ctx.sensorStatus ?? '',
    filter_label: ctx.filterLabel ?? '',
  };

  Object.assign(fields, modelMetricsFields('linear_model', ctx.linearModel));
  Object.assign(fields, modelMetricsFields('piecewise_model', ctx.piecewiseModel));

  if (ctx.piecewiseModel?.kind === 'piecewise_linear') {
    fields.piecewise_segments_json = jsonCell(
      ctx.piecewiseModel.coefficients,
    );
  }

  return fields;
}
