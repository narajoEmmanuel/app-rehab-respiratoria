/**
 * Purpose: Placeholder report builder.
 * Module: clinician
 * Dependencies: clinician/types
 * Notes: Future report formatting and aggregation entry point.
 */
import type { ClinicianMetric } from '@/src/modules/clinician/types';

export function buildClinicianReportPlaceholder(metrics: ClinicianMetric[]): string {
  return `Reporte preliminar con ${metrics.length} metricas`;
}

