import type { LevelId } from '@/src/modules/levels/types/level-progress';

export type SessionRecord = {
  session_id: number;
  patient_id: number;
  patient_level_id: number;
  level_id: LevelId;
  session_date: string;
  valid_attempts: number;
  total_attempts: number;
  invalid_attempts: number;
  compliance_percent: number;
  max_volume: number;
  avg_volume: number;
  avg_hold_seconds: number;
  completed: boolean;
  perfect: boolean;
};

export type AttemptRecord = {
  attempt_id: number;
  session_id: number;
  hold_ms: number;
  peak_volume: number;
  valid: boolean;
  created_at: string;
};
