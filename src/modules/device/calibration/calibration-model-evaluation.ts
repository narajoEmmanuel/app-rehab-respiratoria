/**
 * Métricas estadísticas para evaluar la calidad del modelo de calibración.
 * Funciones puras: aceptan dos arrays paralelos (actual, predicted) en mL.
 * Si el input es inválido (longitudes distintas, vacío) devuelven `null`.
 */
import type { CalibrationModelMetrics } from '@/src/modules/device/calibration/calibration-model-types';

function isFinitePair(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b);
}

function validateInputs(actualMl: number[], predictedMl: number[]): boolean {
  if (!Array.isArray(actualMl) || !Array.isArray(predictedMl)) return false;
  if (actualMl.length === 0 || actualMl.length !== predictedMl.length) return false;
  for (let i = 0; i < actualMl.length; i++) {
    if (!isFinitePair(actualMl[i], predictedMl[i])) return false;
  }
  return true;
}

export function computeRSquaredMl(
  actualMl: number[],
  predictedMl: number[],
): number | null {
  if (!validateInputs(actualMl, predictedMl)) return null;
  const n = actualMl.length;
  if (n < 2) return null;
  const mean = actualMl.reduce((acc, v) => acc + v, 0) / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const diffMean = actualMl[i] - mean;
    const diffPred = actualMl[i] - predictedMl[i];
    ssTot += diffMean * diffMean;
    ssRes += diffPred * diffPred;
  }
  if (ssTot === 0) return null;
  return 1 - ssRes / ssTot;
}

export function computeRmseMl(actualMl: number[], predictedMl: number[]): number | null {
  if (!validateInputs(actualMl, predictedMl)) return null;
  const n = actualMl.length;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const diff = actualMl[i] - predictedMl[i];
    acc += diff * diff;
  }
  return Math.sqrt(acc / n);
}

export function computeMaeMl(actualMl: number[], predictedMl: number[]): number | null {
  if (!validateInputs(actualMl, predictedMl)) return null;
  const n = actualMl.length;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += Math.abs(actualMl[i] - predictedMl[i]);
  }
  return acc / n;
}

export function computeMaxAbsErrorMl(
  actualMl: number[],
  predictedMl: number[],
): number | null {
  if (!validateInputs(actualMl, predictedMl)) return null;
  let max = 0;
  for (let i = 0; i < actualMl.length; i++) {
    const diff = Math.abs(actualMl[i] - predictedMl[i]);
    if (diff > max) max = diff;
  }
  return max;
}

export function evaluatePredictions(
  actualMl: number[],
  predictedMl: number[],
): CalibrationModelMetrics {
  return {
    rSquared: computeRSquaredMl(actualMl, predictedMl),
    rmseMl: computeRmseMl(actualMl, predictedMl),
    maeMl: computeMaeMl(actualMl, predictedMl),
    maxAbsErrorMl: computeMaxAbsErrorMl(actualMl, predictedMl),
  };
}
