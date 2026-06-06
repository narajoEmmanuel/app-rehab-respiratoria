import { InitialEvaluationSummaryScreen } from '@/src/modules/diagnostics/screens/InitialEvaluationSummaryScreen';
import { ConsentStackGuard } from '@/src/modules/legal/ConsentStackGuard';
import { LEGAL_ACCEPT_HREF } from '@/src/modules/legal/legal-hrefs';

export default function EvaluacionResumenRoute() {
  return (
    <ConsentStackGuard blockedHref={LEGAL_ACCEPT_HREF}>
      <InitialEvaluationSummaryScreen />
    </ConsentStackGuard>
  );
}
