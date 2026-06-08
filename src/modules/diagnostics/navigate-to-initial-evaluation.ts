import type { Router } from 'expo-router';

import { isConsentActive } from '@/src/modules/legal/consent-service';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';

/** Navegación estándar a evaluación inicial oficial (sensor, sin picker). */
export async function navigateToInitialEvaluation(router: Pick<Router, 'push'>): Promise<void> {
  const active = await isConsentActive();
  if (!active) {
    router.push(LEGAL_ACCEPT_HREF);
    return;
  }
  router.push({ pathname: '/diagnostico', params: { inputMode: 'auto' } });
}
