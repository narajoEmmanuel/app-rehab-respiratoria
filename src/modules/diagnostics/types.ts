export type DiagnosticRecord = {
  diagnostic_id: number;
  patient_id: number;
  diagnostic_number: number;
  diagnostic_date: string;
  max_inspiratory_volume: number;
};

export type PatientLevelStatus = 'active' | 'locked' | 'completed';

export type PatientLevelRecord = {
  patient_level_id: number;
  patient_id: number;
  level_id: 'level-1' | 'level-2' | 'level-3' | 'level-4' | 'level-5';
  diagnostic_id: number;
  target_volume: number;
  level_status: PatientLevelStatus;
  perfect_sessions_completed: number;
  sessions_completed_today: number;
  last_session_date: string | null;
};
