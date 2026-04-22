/**
 * Purpose: Base types for plans module.
 * Module: plans
 * Dependencies: none
 * Notes: Kept intentionally simple in first migration.
 */
export type PlanDay = {
  id: string;
  label: string;
};

export type WeeklyPlanPlaceholder = {
  days: PlanDay[];
};

