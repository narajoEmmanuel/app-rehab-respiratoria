import { isValidOfficialDiagnosticAttempt } from '@/src/modules/diagnostics/diagnostic-evaluation-session-service';
import type { DiagnosticInputMode } from '@/src/modules/diagnostics/diagnostic-input-mode';
import { DEFAULT_DIAGNOSTIC_INPUT_MODE } from '@/src/modules/diagnostics/diagnostic-input-mode';
import type {
  DiagnosticAttemptNumber,
  DiagnosticAttemptRecord,
  DiagnosticRecord,
} from '@/src/modules/diagnostics/types';

export const VIM_COMPARISON_STABLE_THRESHOLD_ML = 50;

export type VimComparisonTone = 'improved' | 'stable' | 'decreased' | 'initial';

export type VimComparisonInsight = {
  tone: VimComparisonTone;
  title: string;
  detail: string;
  diffMl: number | null;
};

const LEVEL_FACTOR_LABELS: Record<number, string> = {
  1: '50%',
  2: '60%',
  3: '70%',
  4: '80%',
  5: '100%',
};

export function formatEvaluationVolumeMl(volumeMl: number): string {
  const rounded = Math.round(Math.max(0, volumeMl));
  return `${rounded.toLocaleString('es-ES')} mL`;
}

export function formatEvaluationDate(isoDate: string): string {
  const parsed = Date.parse(isoDate);
  if (Number.isNaN(parsed)) return '—';
  return new Date(parsed).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatSignedVolumeDeltaMl(diffMl: number): string {
  const rounded = Math.round(diffMl);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('es-ES')} mL`;
}

export function resolveBestAttemptNumber(
  attempts: DiagnosticAttemptRecord[] | undefined,
  inputMode: DiagnosticInputMode = DEFAULT_DIAGNOSTIC_INPUT_MODE,
): DiagnosticAttemptNumber | null {
  if (!attempts?.length) return null;
  const valid = attempts.filter((a) => isValidOfficialDiagnosticAttempt(a, inputMode));
  if (valid.length === 0) return null;
  const best = [...valid].sort((a, b) => b.peak_volume_ml - a.peak_volume_ml)[0];
  return best?.attempt_number ?? null;
}

export function buildVimComparisonInsight(
  current: DiagnosticRecord,
  previous: DiagnosticRecord | null,
): VimComparisonInsight {
  if (!previous) {
    return {
      tone: 'initial',
      title: 'Tu primera referencia registrada',
      detail: 'Esta será tu referencia inicial para comparar tu progreso más adelante.',
      diffMl: null,
    };
  }

  const diffMl = current.max_inspiratory_volume - previous.max_inspiratory_volume;

  if (Math.abs(diffMl) < VIM_COMPARISON_STABLE_THRESHOLD_ML) {
    return {
      tone: 'stable',
      title: 'Tu volumen de referencia se mantuvo estable',
      detail: 'Sin cambios relevantes desde la última evaluación',
      diffMl,
    };
  }

  if (diffMl > 0) {
    return {
      tone: 'improved',
      title: 'Tu volumen de referencia mejoró',
      detail: `${formatSignedVolumeDeltaMl(diffMl)} desde la última evaluación`,
      diffMl,
    };
  }

  return {
    tone: 'decreased',
    title: 'Tu volumen de referencia cambió',
    detail: `${formatSignedVolumeDeltaMl(diffMl)} desde la última evaluación`,
    diffMl,
  };
}

export function getLevelFactorLabel(levelNumber: number): string {
  return LEVEL_FACTOR_LABELS[levelNumber] ?? '';
}
