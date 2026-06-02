import type { Router } from 'expo-router';

/** Navegación estándar a evaluación inicial oficial (sensor, sin picker). */
export function navigateToInitialEvaluation(router: Pick<Router, 'push'>): void {
  router.push({ pathname: '/diagnostico', params: { inputMode: 'sensor' } });
}
