import type { LevelId } from '@/src/modules/levels/types/level-progress';

export type SessionResultStatus = 'completed' | 'interrupted';

export type SessionAttemptResult = {
  valid: boolean;
  holdMs: number;
  peakVolume: number;
};

export type SessionResult = {
  patientId: number;
  patientLevelId: number;
  levelId: LevelId;
  status: SessionResultStatus;
  validAttempts: number;
  invalidAttempts: number;
  totalAttempts: number;
  compliancePercent: number;
  maxVolumeMl: number;
  avgVolumeMl: number;
  avgHoldSeconds: number;
  completed: boolean;
  interrupted: boolean;
  perfect: boolean;
  attempts: SessionAttemptResult[];
};
