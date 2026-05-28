/**
 * Esquema JSON para calibración proporcionada por el equipo RESPIRA+ (importación por archivo).
 */

export const IMPORTED_CALIBRATION_JSON_SCHEMA_VERSION = '1.0.0';

export type ImportedCalibrationJson = {
  schemaVersion: string;
  spirometerModel?: string;
  capacityMl: number;
  modelType: 'linear_regression';
  slope: number;
  intercept: number;
  validDistanceRangeMm?: { min: number; max: number };
  createdAt?: string;
  createdBy?: string;
  calibrationId?: string;
};

export type ImportedEquationInput = {
  slopeMlPerMm: number;
  interceptMl: number;
  capacityMl: number;
  spirometerModel?: string;
};

export type ValidateImportedJsonResult =
  | { ok: true; data: ImportedCalibrationJson }
  | { ok: false; message: string };
