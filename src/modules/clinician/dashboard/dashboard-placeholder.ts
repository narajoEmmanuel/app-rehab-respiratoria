/**
 * Purpose: Placeholder dashboard data provider.
 * Module: clinician
 * Dependencies: clinician/types
 * Notes: Decoupled from gameplay implementation.
 */
import type { ClinicianMetric } from '@/src/modules/clinician/types';

export function getDashboardMetricsPlaceholder(): ClinicianMetric[] {
  return [{ key: 'sessions', value: 0, label: 'Sesiones completadas' }];
}

