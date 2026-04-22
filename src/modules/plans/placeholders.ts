/**
 * Purpose: Simple placeholders for plans module.
 * Module: plans
 * Dependencies: plans/types
 * Notes: No business logic yet in first migration.
 */
import type { WeeklyPlanPlaceholder } from '@/src/modules/plans/types';

export const weeklyPlanPlaceholder: WeeklyPlanPlaceholder = {
  days: [
    { id: 'mon', label: 'Lunes' },
    { id: 'wed', label: 'Miercoles' },
    { id: 'fri', label: 'Viernes' },
  ],
};

