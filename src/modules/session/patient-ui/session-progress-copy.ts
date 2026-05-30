import { TARGET_ATTEMPTS } from '@/src/modules/session/session-progress-service';

export type SessionProgressCopy = {
  headline: string;
  support: string | null;
  /** Progreso visual 0–1 según repeticiones válidas / meta. */
  progressRatio: number;
};

export type DescribeSessionProgressParams = {
  validAttempts: number;
  targetAttempts?: number;
  perfect?: boolean;
  completed?: boolean;
  interrupted?: boolean;
};

/** Lenguaje motivador para progreso de sesión (sin porcentaje frío). */
export function describeSessionProgress(
  params: DescribeSessionProgressParams,
): SessionProgressCopy {
  const target = params.targetAttempts ?? TARGET_ATTEMPTS;
  const progressRatio =
    target > 0 ? Math.min(1, Math.max(0, params.validAttempts / target)) : 0;

  if (params.perfect) {
    return {
      headline: 'Meta de sesión alcanzada',
      support: 'Completaste todas las repeticiones objetivo.',
      progressRatio: 1,
    };
  }

  if (params.interrupted) {
    return {
      headline: 'Sesión detenida',
      support: 'Puedes retomar cuando te sientas listo.',
      progressRatio,
    };
  }

  if (params.completed) {
    if (progressRatio >= 0.85) {
      return {
        headline: 'Buen avance',
        support: 'Sigue así en tu próxima sesión.',
        progressRatio,
      };
    }
    if (progressRatio >= 0.5) {
      return {
        headline: 'Sesión completada',
        support: 'Cada repetición suma a tu progreso.',
        progressRatio,
      };
    }
    return {
      headline: 'Sesión completada',
      support: 'Pequeños pasos construyen tu avance.',
      progressRatio,
    };
  }

  return {
    headline: 'Progreso de sesión',
    support: null,
    progressRatio,
  };
}

/** Etiqueta compacta para tarjetas (home, historial). */
export function sessionProgressCompactLabel(params: DescribeSessionProgressParams): string {
  return describeSessionProgress(params).headline;
}
