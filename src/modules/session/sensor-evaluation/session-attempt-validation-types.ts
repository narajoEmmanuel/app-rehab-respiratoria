export type OfficialAttemptValidationSource = 'sensor_model' | 'touch_simulation';

export type OfficialAttemptConfidenceLabel = 'alta' | 'media' | 'baja' | 'no_disponible';

export type OfficialAttemptValidationResult = {
  source: OfficialAttemptValidationSource;
  volumeReached: boolean;
  holdReached: boolean;
  attemptValid: boolean;
  officialVolumeMl: number | null;
  targetVolumeMl: number;
  u95Ml: number | null;
  confidenceLabel: OfficialAttemptConfidenceLabel;
  reason: string;
};
